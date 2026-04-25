import math
import os
import re
from io import BytesIO

from PyPDF2 import PdfReader


def _truthy(value: str) -> bool:
    return (value or "").strip().lower() in ("1", "true", "yes", "y", "on")


_WORD_RE = re.compile(r"[a-z0-9]+", re.IGNORECASE)


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _WORD_RE.findall(text or "")]


def iter_text_chunks_from_pdf_streams(
    pdf_streams,
    *,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    max_chunks: int | None = None,
) -> str:
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be < chunk_size")

    produced = 0
    buf = ""
    for stream in pdf_streams:
        reader = PdfReader(stream)
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if not page_text.strip():
                continue
            buf += page_text + "\n"
            while len(buf) >= chunk_size:
                yield buf[:chunk_size]
                produced += 1
                if max_chunks and produced >= max_chunks:
                    return
                buf = buf[chunk_size - chunk_overlap :]

    tail = buf.strip()
    if tail:
        yield tail


def bm25_top_k(
    chunks: list[str],
    query: str,
    *,
    k: int = 6,
    k1: float = 1.5,
    b: float = 0.75,
) -> list[int]:
    if not chunks:
        return []
    q_tokens = _tokenize(query)
    if not q_tokens:
        return list(range(min(k, len(chunks))))

    tokenized = []
    doc_freq = {}
    lengths = []
    for chunk in chunks:
        tokens = _tokenize(chunk)
        tokenized.append(tokens)
        lengths.append(len(tokens) or 1)
        seen = set(tokens)
        for t in seen:
            doc_freq[t] = doc_freq.get(t, 0) + 1

    n_docs = len(chunks)
    avg_len = (sum(lengths) / n_docs) if n_docs else 1.0

    def idf(term: str) -> float:
        df = doc_freq.get(term, 0)
        return math.log((n_docs - df + 0.5) / (df + 0.5) + 1.0)

    scores = []
    for idx, tokens in enumerate(tokenized):
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        dl = lengths[idx]
        denom_norm = k1 * (1.0 - b + b * (dl / avg_len))
        score = 0.0
        for t in q_tokens:
            f = tf.get(t, 0)
            if not f:
                continue
            score += idf(t) * (f * (k1 + 1.0)) / (f + denom_norm)
        scores.append((score, idx))

    scores.sort(key=lambda x: x[0], reverse=True)
    top = [idx for score, idx in scores[: max(1, min(k, len(scores)))] if score > 0]
    if top:
        return top
    return list(range(min(k, len(chunks))))


def build_context(
    chunks: list[str],
    indices: list[int],
    *,
    max_chars: int = 8000,
) -> str:
    parts = []
    total = 0
    for idx in indices:
        if idx < 0 or idx >= len(chunks):
            continue
        text = chunks[idx].strip()
        if not text:
            continue
        if total + len(text) > max_chars:
            remaining = max(0, max_chars - total)
            if remaining <= 0:
                break
            text = text[:remaining]
        parts.append(text)
        total += len(text)
        if total >= max_chars:
            break
    return "\n\n---\n\n".join(parts)


def generate_answer(question: str, context: str) -> str:
    qa_mode = (os.getenv("QA_MODE") or "").strip().lower()
    if qa_mode in ("retrieval_only", "context_only", "no_llm"):
        return context

    backend = (os.getenv("QA_BACKEND") or "hf_hub").strip().lower()
    if backend not in ("hf_hub", "huggingface_hub", "hf_api", "auto"):
        raise ValueError(f"Unsupported QA_BACKEND={backend}")

    token = (
        (os.getenv("HF_TOKEN") or "").strip()
        or (os.getenv("HUGGINGFACEHUB_API_TOKEN") or "").strip()
    )
    if backend != "auto" and not token:
        raise ValueError("Missing HF_TOKEN (or HUGGINGFACEHUB_API_TOKEN) for hosted inference.")

    if not token and backend == "auto":
        return context

    from huggingface_hub import InferenceClient

    model = (os.getenv("QA_MODEL_NAME") or "google/flan-t5-base").strip()
    try:
        max_new_tokens = int(os.getenv("QA_MAX_NEW_TOKENS") or "256")
    except ValueError:
        max_new_tokens = 256
    try:
        temperature = float(os.getenv("QA_TEMPERATURE") or "0.0")
    except ValueError:
        temperature = 0.0
    try:
        timeout_s = float(os.getenv("QA_TIMEOUT_S") or "90")
    except ValueError:
        timeout_s = 90.0

    prompt = (
        "Be a strict PDF-grounded QA assistant. Use ONLY the provided context; do not use outside knowledge. If the answer is not explicitly supported by the context, reply exactly: I don't know. Then add: Clarifying question: <one question that would make it answerable>. If it is answerable, write: Answer: <1–4 short sentences>. Evidence: <2–4 bullets, each a short exact quote from the context (<=20 words) that supports the answer>. Do not add anything else. \n"
        "Answer ONLY the user's question in 1-2 short sentences. Do NOT copy/paste the context. Ignore headings, prefaces, exercises, page footers, and "Oral Comprehension Check" sections. If the answer is not explicitly in the context, say exactly: I don't know..\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n"
        "Answer:"
    )

    def _postprocess_answer(raw: str) -> str:
        text = (raw or "").strip()
        if not text:
            return ""

        # Some hosted endpoints may echo parts of the prompt.
        if "Answer:" in text:
            text = text.split("Answer:", 1)[-1].strip()

        # De-dupe repeated paragraphs (very common failure mode on small/free models).
        paras = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
        seen = set()
        deduped = []
        for p in paras:
            key = re.sub(r"\s+", " ", p).strip().lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(p)
        text = "\n\n".join(deduped).strip()

        # Word cap (keeps UX snappy + avoids runaway repetition).
        try:
            max_words = int(os.getenv("QA_MAX_WORDS") or "140")
        except ValueError:
            max_words = 140
        if max_words > 0:
            words = text.split()
            if len(words) > max_words:
                text = " ".join(words[:max_words]).rstrip() + "…"

        return text

    client = InferenceClient(model=model, token=token, timeout=timeout_s)
    # `text_generation` works for most hosted text2text/text-generation endpoints.
    try:
        repetition_penalty = float(os.getenv("QA_REPETITION_PENALTY") or "1.15")
    except ValueError:
        repetition_penalty = 1.15
    try:
        top_p = float(os.getenv("QA_TOP_P") or "0.9")
    except ValueError:
        top_p = 0.9
    do_sample = _truthy(os.getenv("QA_DO_SAMPLE") or "0")

    out = client.text_generation(
        prompt,
        max_new_tokens=max_new_tokens,
        temperature=temperature,
        top_p=top_p,
        do_sample=do_sample,
        repetition_penalty=repetition_penalty,
        return_full_text=False,
    )
    return _postprocess_answer(out)


def coerce_to_seekable(stream):
    """
    PyPDF2 expects seekable streams. GridFS streams usually are, but for safety
    (and to avoid surprises with wrappers), we can materialize into BytesIO when needed.
    """
    try:
        stream.seek(0)
        return stream
    except Exception:
        data = stream.read()
        return BytesIO(data)
