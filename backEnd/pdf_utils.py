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


def _format_idk(clarifying_question: str) -> str:
    q = (clarifying_question or "").strip() or "Which part of the PDF should I look at (section/page/keyword)?"
    return f"I don't know.\nClarifying question: {q}"


def _format_answer(answer: str, evidence: list[str]) -> str:
    ans = (answer or "").strip()
    ev = [e.strip() for e in (evidence or []) if (e or "").strip()]
    if len(ev) > 2:
        ev = ev[:2]
    while len(ev) < 2:
        ev.append("")
    return ("Answer: " + ans + "\nEvidence:\n" + f"- {ev[0]}\n" + f"- {ev[1]}").strip()


def _split_sentences(text: str) -> list[str]:
    raw = re.sub(r"\s+", " ", (text or "").strip())
    if not raw:
        return []
    parts = re.split(r"(?<=[.!?])\s+", raw)
    return [p.strip() for p in parts if p.strip()]


def _extractive_fallback_answer(question: str, context: str) -> str:
    q_tokens = set(_tokenize(question))
    if not q_tokens:
        return _format_idk("What exactly should I answer from the PDF?")

    scored: list[tuple[int, str]] = []
    for sent in _split_sentences(context):
        s_tokens = set(_tokenize(sent))
        overlap = len(q_tokens & s_tokens)
        if overlap <= 0:
            continue
        scored.append((overlap, sent))

    if not scored:
        return _format_idk("Which keyword or section should I search for in the PDF?")

    scored.sort(key=lambda x: x[0], reverse=True)
    top_sentences: list[str] = []
    seen = set()
    for _, sent in scored:
        key = re.sub(r"\s+", " ", sent).strip().lower()
        if key in seen:
            continue
        seen.add(key)
        top_sentences.append(sent)
        if len(top_sentences) >= 2:
            break

    answer_sentence = top_sentences[0]
    try:
        max_answer_words = int(os.getenv("QA_EXTRACTIVE_MAX_ANSWER_WORDS") or "40")
    except ValueError:
        max_answer_words = 40
    if max_answer_words > 0:
        words = answer_sentence.split()
        if len(words) > max_answer_words:
            answer_sentence = " ".join(words[:max_answer_words]).rstrip() + "…"

    evidence = []
    for sent in top_sentences[:2]:
        words = sent.split()
        evidence.append(" ".join(words[:20]).strip())
    return _format_answer(answer_sentence, evidence)


def _extractive_evidence_quotes(question: str, context: str) -> list[str]:
    """
    Returns up to 2 short evidence quotes from the context based on token overlap.
    Intended for "format repair" when an LLM answer is present but lacks evidence.
    """
    q_tokens = set(_tokenize(question))
    if not q_tokens:
        return []

    scored: list[tuple[int, str]] = []
    for sent in _split_sentences(context):
        s_tokens = set(_tokenize(sent))
        overlap = len(q_tokens & s_tokens)
        if overlap <= 0:
            continue
        scored.append((overlap, sent))

    if not scored:
        return []

    scored.sort(key=lambda x: x[0], reverse=True)
    top_sentences: list[str] = []
    seen = set()
    for _, sent in scored:
        key = re.sub(r"\s+", " ", sent).strip().lower()
        if key in seen:
            continue
        seen.add(key)
        top_sentences.append(sent)
        if len(top_sentences) >= 2:
            break

    evidence: list[str] = []
    for sent in top_sentences[:2]:
        words = sent.split()
        evidence.append(" ".join(words[:20]).strip())
    return evidence


def _coerce_hf_output_to_text(out) -> str:
    """
    huggingface_hub.InferenceClient can return different shapes depending on version/method.
    Normalize to a plain string so downstream post-processing is stable.
    """
    if out is None:
        return ""
    if isinstance(out, str):
        return out
    generated_text = getattr(out, "generated_text", None)
    if isinstance(generated_text, str):
        return generated_text
    if isinstance(out, dict):
        for key in ("generated_text", "text", "answer", "output"):
            val = out.get(key)
            if isinstance(val, str):
                return val
    if isinstance(out, list) and out:
        first = out[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            for key in ("generated_text", "text", "answer", "output"):
                val = first.get(key)
                if isinstance(val, str):
                    return val
        generated_text = getattr(first, "generated_text", None)
        if isinstance(generated_text, str):
            return generated_text
    return str(out)


def _repair_to_strict_qa_format(llm_text: str, question: str, context: str) -> str:
    """
    Best-effort conversion of non-conforming LLM output into the strict QA format used by the API.
    """
    text = (llm_text or "").strip()
    if not text:
        return ""

    low = text.lower()
    if "i don't know" in low:
        m = re.search(r"clarifying question\s*:\s*(.+)$", text, re.IGNORECASE | re.MULTILINE)
        clar_q = (m.group(1).strip() if m else "") or "Which keyword/section/page should I search for in the PDF?"
        return _format_idk(clar_q)

    cleaned = re.sub(r"^\s*(answer|final)\s*:\s*", "", text, flags=re.IGNORECASE).strip()
    if not cleaned:
        cleaned = text

    sents = _split_sentences(cleaned)
    if sents:
        answer = " ".join(sents[:2]).strip()
    else:
        answer = cleaned.splitlines()[0].strip()

    try:
        max_answer_words = int(os.getenv("QA_REPAIR_MAX_ANSWER_WORDS") or "60")
    except ValueError:
        max_answer_words = 60
    if max_answer_words > 0:
        words = answer.split()
        if len(words) > max_answer_words:
            answer = " ".join(words[:max_answer_words]).rstrip() + "â€¦"

    evidence = _extractive_evidence_quotes(question, context)
    return _format_answer(answer, evidence)


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


def generate_answer(question: str, context: str) -> dict:
    """
    Returns:
      {
        "answer": str,
        "llm_used": bool,
        "backend": "huggingface_hub" | "extractive" | "none",
        "mode": str,
        "model": str? (when llm_used),
        "warning": str? (when degraded),
      }
    """

    qa_mode = (os.getenv("QA_MODE") or "").strip().lower()
    verbose_warnings = _truthy(os.getenv("QA_VERBOSE_WARNINGS") or "0")
    if qa_mode in ("retrieval_only", "context_only", "no_llm"):
        if _truthy(os.getenv("QA_CONTEXT_AS_RESPONSE") or "0"):
            return {"answer": context, "llm_used": False, "mode": qa_mode, "backend": "none"}
        return {
            "answer": _extractive_fallback_answer(question, context),
            "llm_used": False,
            "mode": qa_mode,
            "backend": "extractive",
            "warning": f"QA_MODE={qa_mode} disables LLM; returning extractive fallback answer. Set QA_CONTEXT_AS_RESPONSE=1 to return raw context instead.",
        }

    backend = (os.getenv("QA_BACKEND") or "hf_hub").strip().lower()
    if backend not in ("hf_hub", "huggingface_hub", "hf_api", "auto"):
        raise ValueError(f"Unsupported QA_BACKEND={backend}")

    token = (
        (os.getenv("HF_TOKEN") or "").strip()
        or (os.getenv("HUGGINGFACEHUB_API_TOKEN") or "").strip()
    )
    if backend != "auto" and not token:
        return {
            "answer": _extractive_fallback_answer(question, context),
            "llm_used": False,
            "mode": qa_mode or "default",
            "backend": "extractive",
            "warning": "Missing HF_TOKEN (or HUGGINGFACEHUB_API_TOKEN); returning extractive fallback answer.",
        }

    if not token and backend == "auto":
        if _truthy(os.getenv("QA_CONTEXT_AS_RESPONSE") or "0"):
            return {"answer": context, "llm_used": False, "mode": qa_mode or "default", "backend": "none"}
        return {
            "answer": _extractive_fallback_answer(question, context),
            "llm_used": False,
            "mode": qa_mode or "default",
            "backend": "extractive",
            "warning": "QA_BACKEND=auto with no token; returning extractive fallback answer.",
        }

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
        "You are a strict QA assistant. Answer ONLY using the provided context. "
        "Do not use outside knowledge.\n\n"
        "If the answer is NOT explicitly supported by the context, reply EXACTLY in this format:\n"
        "I don't know.\n"
        "Clarifying question: <one specific question that would make it answerable>\n\n"
        "If the answer IS supported by the context, reply EXACTLY in this format:\n"
        "Answer: <1–2 short sentences>\n"
        "Evidence:\n"
        "- <exact quote (<=20 words)>\n"
        "- <exact quote (<=20 words)>\n\n"
        "Rules:\n"
        "- Do not include any information not present in the context.\n"
        "- Do not paraphrase evidence; quotes must be exact.\n"
        "- Do not include more than 2 evidence bullets.\n"
        "- Ignore headings, prefaces, exercises, page footers, and \"Oral Comprehension Check\" sections.\n"
        "- Do not output anything outside the specified formats.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}"
    )

    def _postprocess_answer(raw: str) -> str:
        text = (raw or "").strip()
        if not text:
            return ""

        m = re.search(
            r"(I don't know\.\s*Clarifying question:.*)$",
            text,
            re.IGNORECASE | re.DOTALL,
        )
        if m:
            text = m.group(1).strip()
        else:
            m = re.search(
                r"(Answer:.*?Evidence:\s*\n-\s*.*?\n-\s*.*)$",
                text,
                re.IGNORECASE | re.DOTALL,
            )
            if m:
                text = m.group(1).strip()

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

    try:
        repetition_penalty = float(os.getenv("QA_REPETITION_PENALTY") or "1.15")
    except ValueError:
        repetition_penalty = 1.15
    try:
        top_p = float(os.getenv("QA_TOP_P") or "0.9")
    except ValueError:
        top_p = 0.9
    do_sample = _truthy(os.getenv("QA_DO_SAMPLE") or "0")

    hf_method = (os.getenv("QA_HF_METHOD") or "").strip()
    if hf_method:
        generate = getattr(client, hf_method, None)
        if generate is None:
            raise ValueError(f"QA_HF_METHOD={hf_method} not found on InferenceClient")
    else:
        model_l = model.lower()
        if any(t in model_l for t in ("t5", "bart")) and hasattr(client, "text2text_generation"):
            generate = getattr(client, "text2text_generation")
        else:
            generate = getattr(client, "text_generation")

    def _call_hf() -> str:
        try:
            return generate(
                prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=top_p,
                do_sample=do_sample,
                repetition_penalty=repetition_penalty,
                return_full_text=False,
            )
        except TypeError:
            return generate(
                prompt,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
            )

    try:
        out = _call_hf()
        raw_text = _coerce_hf_output_to_text(out)
        text = _postprocess_answer(raw_text)
        if not text:
            raise RuntimeError("Empty model output")

        looks_valid = (
            text.lower().startswith("i don't know.")
            or text.lower().startswith("answer:")
            or "evidence:" in text.lower()
        )
        if not looks_valid:
            if _truthy(os.getenv("QA_REPAIR_FORMAT") or "1"):
                repaired = _repair_to_strict_qa_format(text, question, context)
                if repaired:
                    note = "LLM output did not match expected QA format; repaired using extractive evidence."
                    if verbose_warnings:
                        note += f" (raw_type={type(out).__name__})"
                    return {
                        "answer": repaired,
                        "llm_used": True,
                        "mode": qa_mode or "default",
                        "backend": "huggingface_hub",
                        "model": model,
                        "warning": note,
                    }
            raise RuntimeError("Model output did not match expected QA format")

        return {
            "answer": text,
            "llm_used": True,
            "mode": qa_mode or "default",
            "backend": "huggingface_hub",
            "model": model,
        }
    except Exception as e:
        detail = f" ({type(e).__name__}: {e})" if verbose_warnings else ""
        return {
            "answer": _extractive_fallback_answer(question, context),
            "llm_used": False,
            "mode": qa_mode or "default",
            "backend": "extractive",
            "warning": f"LLM generation failed; returning extractive fallback answer.{detail}",
        }


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
