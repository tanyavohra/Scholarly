import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, FileUp, Sparkles, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { api, ApiError } from "@/lib/api.js";
import { toast } from "@/components/ui/use-toast";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PdfChatPage = () => {
  const location = useLocation();
  const legacySourceUrl = String(location.state?.sourceUrl || "").trim();

  const [messages, setMessages] = useState([
    {
      role: "system",
      text: "Upload a PDF and I’ll answer questions about it.",
    },
  ]);

  const [input, setInput] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [docId, setDocId] = useState("");
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!legacySourceUrl) return;
    toast({
      title: "URL PDFs disabled",
      description: "This build no longer supports URL-based PDF ingestion. Please upload the PDF file.",
    });
  }, [legacySourceUrl]);

  useEffect(() => {
    // Switching documents resets state.
    setProcessed(false);
    setPdfFile(null);
    setDocId("");
    autoStartedRef.current = false;
    setMessages([
      {
        role: "system",
        text: "Upload a PDF and I’ll answer questions about it.",
      },
    ]);
  }, [legacySourceUrl]);

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
        // Transient: Render cold starts / brief timeouts can cause status polling to fail.
        // Keep polling until the overall timeout is reached.
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
          // Network error (fetch threw)
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

      // Node may run in async mode.
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

      // Special-case: 409 means there’s already an active job; wait for it.
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
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Chat with PDF</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Upload a PDF and ask questions about its content.
      </p>

      <div className="card-elevated overflow-hidden rounded-2xl">
        <div className="p-6 border-b border-border space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <label className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                <FileUp className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {pdfFile ? pdfFile.name : "Click to select a PDF"}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">PDF up to ~25MB</p>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <button
            disabled={!canProcess || processing}
            onClick={handleProcess}
            className="btn-primary w-full flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {processing ? "Processing..." : processed ? "Re-process PDF" : "Process PDF"}
          </button>
        </div>

        <div className="h-80 overflow-y-auto p-6 space-y-3">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-foreground"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-4 border-t border-border flex gap-2.5 bg-muted/10">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={processed ? "Ask about the PDF..." : "Process a PDF to start chatting..."}
            className="input-styled flex-1"
            disabled={!processed}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!processed}
            className="p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: "0 2px 8px hsl(245 58% 56% / 0.25)" }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default PdfChatPage;
