import os
import warnings
from PyPDF2 import PdfReader

# LangChain moved text splitters into a separate package in newer versions.
try:
    from langchain_text_splitters import CharacterTextSplitter
except ImportError:  # pragma: no cover
    from langchain.text_splitter import CharacterTextSplitter

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# HuggingFacePipeline moved into langchain-community in newer versions.
try:
    from langchain_community.llms import HuggingFacePipeline
except ImportError:  # pragma: no cover
    from langchain.llms import HuggingFacePipeline



warnings.filterwarnings("ignore", category=DeprecationWarning)

_EMBEDDINGS = None
_LLM = None
_VECTOR_STORE = None
_VECTOR_STORE_META = None


def _get_embeddings():
    global _EMBEDDINGS
    if _EMBEDDINGS is None:
        model_name = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
        encode_kwargs = {}
        batch_size = os.getenv("EMBEDDING_MODEL_BATCH_SIZE")
        if batch_size:
            try:
                encode_kwargs["batch_size"] = int(batch_size)
            except ValueError:
                pass
        _EMBEDDINGS = HuggingFaceEmbeddings(model_name=model_name, encode_kwargs=encode_kwargs)
    return _EMBEDDINGS


def _get_llm():
    global _LLM
    if _LLM is None:
        backend = (os.getenv("QA_BACKEND") or "auto").strip().lower()
        hf_token = (os.getenv("HUGGINGFACEHUB_API_TOKEN") or "").strip()

        # Prefer the hosted Hugging Face Inference API when a token is present.
        # This avoids downloading/initializing large models inside the Render container.
        use_hf_hub = backend in ("hf_hub", "huggingface_hub", "hf_api") or (backend == "auto" and bool(hf_token))
        if use_hf_hub:
            try:
                from langchain_community.llms import HuggingFaceHub
            except Exception:  # pragma: no cover
                from langchain.llms import HuggingFaceHub

            repo_id = os.getenv("QA_MODEL_NAME", "google/flan-t5-small")
            task = os.getenv("QA_HF_TASK", "text2text-generation")

            # Keep defaults conservative for reliability/cost.
            try:
                temperature = float(os.getenv("QA_TEMPERATURE", "0.0"))
            except ValueError:
                temperature = 0.0
            try:
                max_length = int(os.getenv("QA_MAX_LENGTH", "256"))
            except ValueError:
                max_length = 256

            model_kwargs = {
                "temperature": temperature,
                "max_length": max_length,
            }

            # HuggingFaceHub reads HUGGINGFACEHUB_API_TOKEN from env.
            try:
                _LLM = HuggingFaceHub(repo_id=repo_id, task=task, model_kwargs=model_kwargs)
                return _LLM
            except Exception as e:
                # Fall back to local pipeline if hosted inference is unavailable/misconfigured.
                print(f"WARNING: QA_BACKEND=hf_hub failed ({e}); falling back to local transformers.", flush=True)

        # Fallback: local transformers pipeline (heavier; may OOM on small instances).
        # Import transformers lazily so embedding-only workloads don't pay the import cost/memory.
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

        model_name = os.getenv("QA_MODEL_NAME", "google/flan-t5-small")
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        pipe = pipeline("text2text-generation", model=model, tokenizer=tokenizer)
        _LLM = HuggingFacePipeline(pipeline=pipe)
    return _LLM

# ----------- PDF Processing -----------

def get_pdf_text(pdf_files):
    parts = []
    for pdf in pdf_files:
        reader = PdfReader(pdf)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                parts.append(page_text)
    return "\n".join(parts)


def get_text_chunks(text, chunk_size=1000, chunk_overlap=200):
    splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
    )
    return splitter.split_text(text)


def iter_text_chunks_from_pdfs(pdf_files, chunk_size=1000, chunk_overlap=200):
    """
    Memory-efficient chunker that avoids building one huge `raw_text` string.

    Produces character-based chunks with overlap using a simple sliding window
    over extracted page text.
    """

    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be < chunk_size")

    buf = ""
    for pdf in pdf_files:
        reader = PdfReader(pdf)
        for page in reader.pages:
            page_text = page.extract_text()
            if not page_text:
                continue
            # Keep separators to avoid accidental word-joins across pages.
            buf += page_text + "\n"
            while len(buf) >= chunk_size:
                yield buf[:chunk_size]
                buf = buf[chunk_size - chunk_overlap :]

    tail = buf.strip()
    if tail:
        yield tail


def get_vector_store(chunks, store_dir="faiss_index"):
    os.makedirs(store_dir, exist_ok=True)
    embeddings = _get_embeddings()

    max_chunks = os.getenv("MAX_CHUNKS")
    max_chunks_limit = None
    if max_chunks:
        try:
            limit = int(max_chunks)
            if limit > 0:
                max_chunks_limit = limit
        except ValueError:
            pass
    else:
        # Render free/low-tier instances can OOM on very large PDFs.
        # Put a conservative cap unless the operator explicitly configures MAX_CHUNKS.
        if os.getenv("RENDER"):
            max_chunks_limit = 1500

    default_batch = "32" if os.getenv("RENDER") else "64"
    try:
        batch_size = int(os.getenv("EMBEDDING_BATCH_SIZE", default_batch))
    except ValueError:
        batch_size = int(default_batch)
    if batch_size <= 0:
        batch_size = int(default_batch)
    vector_store = None

    batch = []
    seen = 0
    for chunk in chunks:
        if not chunk:
            continue
        batch.append(chunk)
        seen += 1
        if max_chunks_limit and seen >= max_chunks_limit:
            break

        if len(batch) >= batch_size:
            if vector_store is None:
                vector_store = FAISS.from_texts(batch, embedding=embeddings)
            else:
                vector_store.add_texts(batch)
            batch = []

    if batch:
        if vector_store is None:
            vector_store = FAISS.from_texts(batch, embedding=embeddings)
        else:
            vector_store.add_texts(batch)

    if vector_store is None:
        raise ValueError("No text chunks to embed (PDF may be scanned or empty).")
    vector_store.save_local(store_dir)
    print(f"✅ FAISS index built and saved at {store_dir}")
    return vector_store


# ----------- Question Answering -----------

def answer_question(question, index_path="faiss_index"):
    if not os.path.exists(index_path):
        raise FileNotFoundError(f"FAISS index not found at {index_path}")

    global _VECTOR_STORE, _VECTOR_STORE_META
    embeddings = _get_embeddings()

    # Cache the loaded index to avoid re-loading (and re-allocating) on every query.
    index_file = os.path.join(index_path, "index.faiss")
    pkl_file = os.path.join(index_path, "index.pkl")
    mtime = 0.0
    try:
        mtime = max(
            os.path.getmtime(index_file),
            os.path.getmtime(pkl_file) if os.path.exists(pkl_file) else 0.0,
        )
    except Exception:
        mtime = 0.0

    meta = (os.path.abspath(index_path), mtime)
    if _VECTOR_STORE is None or _VECTOR_STORE_META != meta:
        _VECTOR_STORE = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
        _VECTOR_STORE_META = meta

    vector_store = _VECTOR_STORE

    llm = _get_llm()

    # Avoid depending on `langchain.chains` (which has been split into separate packages in newer releases).
    docs = vector_store.similarity_search(question, k=4)
    context = "\n\n".join(getattr(d, "page_content", str(d)) for d in docs)

    qa_mode = (os.getenv("QA_MODE") or "").strip().lower()
    if qa_mode in ("retrieval_only", "context_only", "no_llm"):
        max_chars = 0
        try:
            max_chars = int(os.getenv("QA_CONTEXT_MAX_CHARS") or "8000")
        except ValueError:
            max_chars = 8000
        if max_chars and len(context) > max_chars:
            context = context[:max_chars]
        return {"output_text": context, "mode": qa_mode, "k": 4}

    prompt = (
        "Use the provided context to answer the question.\n"
        "If the answer is not in the context, say you don't know.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n"
        "Answer:"
    )

    try:
        result = llm.invoke(prompt)
    except AttributeError:  # pragma: no cover
        result = llm(prompt)
    return {"output_text": result}
