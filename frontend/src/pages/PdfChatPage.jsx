import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, FileUp, Sparkles, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api.js";
import { toast } from "@/lib/toast.jsx";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PdfChatPage = () => {
  const [messages, setMessages] = useState([
    {
      role: "system",
      text: "Upload a PDF and I'll answer questions about it.",
    },
  ]);

  const [input, setInput] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [docId, setDocId] = useState("");
  const autoStartedRef = useRef(false);

  const canProcess = useMemo(() => Boolean(pdfFile), [pdfFile]);

  const waitForJob = async (jobId) => {
    const startedAt = Date.now();
    const timeoutMs = 10 * 60 * 1000;
    let notFoundCount = 0;
    let pollMs = 1500;
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const status = await api.get(`/processpdf/status/${encodeURIComponent(jobId)}`);
        const s = status?.status;
        if (s === "done") return status;
        if (s === "failed") throw new Error(status?.error || "PDF processing failed.");
        await sleep(pollMs);
        pollMs = Math.min(6000, Math.round(pollMs * 1.2));
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404 && notFoundCount < 5) {
            notFoundCount += 1;
            await sleep(pollMs);
            pollMs = Math.min(6000, Math.round(pollMs * 1.2));
            continue;
          }
          if (err.status >= 500) {
            await sleep(pollMs);
            pollMs = Math.min(6000, Math.round(pollMs * 1.2));
            continue;
          }
        } else {
          await sleep(pollMs);
          pollMs = Math.min(6000, Math.round(pollMs * 1.2));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Timed out waiting for PDF processing.");
  };

  const handleProcess = async () => {
    if (!canProcess) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("pdfFiles", pdfFile, pdfFile.name || "file.pdf");
      const res = await api.postForm("/processpdf", formData);

      if (res?.job_id) {
        const job = await waitForJob(res.job_id);
        if (job?.index_built === false) throw new Error("Embeddings/index were not created.");
        setDocId(String(job?.doc_id || res?.doc_id || ""));
        toast({ title: "Ready", description: "PDF processed successfully." });
        setProcessed(true);
        return;
      }

      if (res?.index_built === false) throw new Error("Embeddings/index were not created.");
      setDocId(String(res?.doc_id || ""));
      toast({ title: "Ready", description: "PDF processed successfully." });
      setProcessed(true);
    } catch (err) {
      const message =
        err?.data?.details?.error ||
        err?.data?.error ||
        err?.data?.Message ||
        err?.message ||
        "Failed to process PDF.";
      toast({ title: "Processing failed", description: String(message), variant: "destructive" });

      if (err instanceof ApiError && err.status === 409 && err.data?.job_id) {
        try {
          const job = await waitForJob(err.data.job_id);
          if (job?.index_built === false) throw new Error("Embeddings/index were not created.");
          setDocId(String(job?.doc_id || ""));
          toast({ title: "Ready", description: "PDF processed successfully." });
          setProcessed(true);
        } catch (waitErr) {
          toast({
            title: "Processing failed",
            description: waitErr?.message || "Unable to wait for the active job.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSend = async () => {
    const q = String(input || "").trim();
    if (!q) return;
    if (!processed) {
      toast({ title: "Not ready", description: "Process a PDF first.", variant: "destructive" });
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");

    try {
      const payload = docId ? { question: q, doc_id: docId } : { question: q };
      const res = await api.post("/ask_question", payload);
      setMessages((prev) => [...prev, { role: "system", text: res?.response || "No response." }]);
      if (res?.warning) {
        toast({ title: "QA notice", description: String(res.warning) });
      }
    } catch (err) {
      toast({
        title: "QA failed",
        description: err?.data?.error || err?.message || "Unable to answer question.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto"
      style={{ maxWidth: "48rem" }}
    >
      <div className="d-flex align-items-center gap-2 mb-1">
        <Sparkles className="text-primary" style={{ width: "1.25rem", height: "1.25rem" }} />
        <h1 className="fs-3 fw-bold text-foreground">Chat with PDF</h1>
      </div>
      <p className="small text-muted-foreground mb-4">
        Upload a PDF and ask questions about its content.
      </p>

      <div className="card-elevated overflow-hidden rounded-4">
        <div className="p-4 border-bottom border-border d-flex flex-column gap-3">
          <div className="row g-2">
            <div className="col">
              <label className="upload-label d-block p-6 text-center position-relative">
                <div className="d-flex flex-column align-items-center">
                  <div className="d-flex align-items-center justify-content-center rounded-4 bg-muted-50 mx-auto mb-2"
                    style={{ width: "3rem", height: "3rem" }}>
                    <FileUp className="text-muted-foreground" style={{ width: "1.5rem", height: "1.5rem" }} />
                  </div>
                  <p className="small fw-semibold text-foreground mb-0">
                    {pdfFile ? pdfFile.name : "Click to select a PDF"}
                  </p>
                  <p className="text-muted-foreground mt-1 mb-0" style={{ fontSize: "0.75rem" }}>PDF up to ~25MB</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
                    style={{ cursor: "pointer" }}
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                </div>
              </label>
            </div>
          </div>

          <button
            disabled={!canProcess || processing}
            onClick={handleProcess}
            className="btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2 border-0"
          >
            {processing ? <Loader2 className="spinner-border spinner-border-sm" /> : null}
            {processing ? "Processing..." : processed ? "Re-process PDF" : "Process PDF"}
          </button>
        </div>

        <div className="overflow-auto p-4 d-flex flex-column gap-2" style={{ height: "20rem" }}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`d-flex ${msg.role === "user" ? "justify-content-end" : "justify-content-start"}`}
            >
              <div
                className={`px-3 py-2 rounded-4 small lh-base ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-40 text-foreground"
                }`}
                style={{ maxWidth: "80%" }}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-3 border-top border-border d-flex gap-2 bg-muted-10">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={processed ? "Ask about the PDF..." : "Process a PDF to start chatting..."}
            className="input-styled flex-grow-1"
            disabled={!processed}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!processed}
            className="send-btn d-flex align-items-center justify-content-center border-0"
          >
            <Send style={{ width: "1rem", height: "1rem" }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default PdfChatPage;
