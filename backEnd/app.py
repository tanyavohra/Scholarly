from flask import Flask, request, jsonify
from flask_cors import CORS
from pdf_utils import get_pdf_text, get_text_chunks, get_vector_store, answer_question

import os
from dotenv import load_dotenv

load_dotenv()



app = Flask(__name__)

def _parse_origins(value: str):
    return [o.strip() for o in (value or "").split(",") if o.strip()]

CORS(
    app,
    origins=_parse_origins(os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081")),
)


FAISS_DIR = os.getenv("FAISS_DIR", "faiss_index")  # folder where index is saved
os.makedirs(FAISS_DIR, exist_ok=True)


@app.get("/healthz")
def healthz():
    return jsonify({"status": "ok"}), 200

@app.route("/process_pdf", methods=["POST"])
def process_pdf():
    pdf_files = request.files.getlist("pdfFiles")

    if not pdf_files:
        return jsonify({"error": "No PDF files uploaded"}), 400

    try:
        from pdf_utils import get_pdf_text, get_text_chunks, get_vector_store

        # 1️⃣ Extract text from PDFs
        raw_text = get_pdf_text(pdf_files)

        # 2️⃣ Split text into chunks
        text_chunks = get_text_chunks(raw_text)

        # 3️⃣ Create FAISS index (local embeddings)
        get_vector_store(text_chunks)

        print("PDF processed successfully.")
        return jsonify({"message": "PDF processed successfully"}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Error in /process_pdf:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/ask_question", methods=["POST"])
def ask_question_route():
    try:
        data = request.get_json(force=True)
        question = data.get("question", "").strip()
        print("Received question:", question)
        response = answer_question(question, index_path=FAISS_DIR)
        out_text = response.get("output_text") if isinstance(response, dict) else str(response)
        print("Answer generated:", out_text[:200])
        return jsonify({"response": out_text}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("❌ Error in /ask_question:", e)
        return jsonify({"error": str(e)}), 500

    return jsonify({"response": out_text}), 200

if __name__ == "__main__":
    # Run with python app.py (good for dev). For production, use gunicorn / uvicorn + reverse proxy.
    port = int(os.getenv("PORT") or os.getenv("PY_PORT") or "8082")
    debug = (os.getenv("FLASK_DEBUG") or "").lower() in ("1", "true", "yes", "on")
    app.run(host="0.0.0.0", port=port, debug=debug)
