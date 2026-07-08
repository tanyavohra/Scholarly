import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, ImagePlus, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api.js";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload.js";
import { toast } from "@/lib/toast.jsx";

const AskPage = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const removeImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Please add a title.", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      toast({ title: "Missing description", description: "Please describe your question.", variant: "destructive" });
      return;
    }

    const tagList = Array.from(
      new Set(
        String(tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );

    setSubmitting(true);
    try {
      let imageUrl = "";
      if (images.length > 0) {
        const uniqueName = `${Date.now()}_${images[0].name.replace(/\s+/g, "_")}`;
        imageUrl = await uploadToCloudinary(images[0]._file, {
          resourceType: "image",
          folder: "scholarly/images",
          publicId: uniqueName,
        });
      }

      const res = await api.post("/question", {
        title: title.trim(),
        question: body.trim(),
        url: imageUrl || "",
        tags: tagList,
      });
      if (res?.success !== true) {
        const message =
          res?.Message || res?.error || (typeof res === "string" ? res : "") || "Unable to post question.";
        throw new Error(String(message));
      }

      toast({ title: "Posted", description: "Your question is live." });
      navigate("/questions");
    } catch (err) {
      toast({
        title: "Post failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to post question.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="mx-auto" style={{ maxWidth: "36rem" }}>
      <div className="d-flex align-items-center gap-2 mb-1">
        <Sparkles className="text-primary" style={{ width: "1.25rem", height: "1.25rem" }} />
        <h1 className="fs-3 fw-bold text-foreground">Ask a Question</h1>
      </div>
      <p className="small text-muted-foreground mb-4">Get help from the community by posting a clear, detailed question.</p>

      <form onSubmit={handleSubmit} className="card-elevated p-4 d-flex flex-column gap-4">
        <div>
          <label className="d-block small fw-semibold text-foreground mb-2">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What's your question about?" className="input-styled" />
        </div>
        <div>
          <label className="d-block small fw-semibold text-foreground mb-2">Description</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Provide context, code snippets, and what you've tried..." rows={6} className="input-styled resize-none" />
        </div>
        <div>
          <label className="d-block small fw-semibold text-foreground mb-2">Attach Images (optional)</label>
          <label className="upload-label d-block p-8 text-center position-relative">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (!files) return;
                Array.from(files).forEach((file) => {
                  const url = URL.createObjectURL(file);
                  setImages((prev) => [...prev, { name: file.name, url, _file: file }]);
                });
                e.target.value = "";
              }}
              className="position-absolute top-0 start-0 w-100 h-100 opacity-0"
              style={{ cursor: "pointer" }}
            />
            <div className="text-center">
              <div className="d-flex align-items-center justify-content-center rounded-3 bg-muted-50 mx-auto mb-2"
                style={{ width: "3rem", height: "3rem" }}>
                <ImagePlus className="text-muted-foreground" style={{ width: "1.25rem", height: "1.25rem" }} />
              </div>
              <p className="small fw-medium text-muted-foreground mb-0">Drop images here or click to upload</p>
              <p className="text-muted-foreground mt-1 mb-0" style={{ fontSize: "0.75rem", opacity: 0.6 }}>PNG, JPG up to 10MB</p>
            </div>
          </label>
          {images.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {images.map((img, i) => (
                <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="position-relative rounded-3 overflow-hidden border border-border"
                  style={{ width: "5rem", height: "5rem" }}>
                  <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => removeImage(i)}
                    className="position-absolute top-0 end-0 d-flex align-items-center justify-content-center bg-destructive text-destructive-foreground border-0 cursor-pointer rounded-circle group-hover-show"
                    style={{ width: "1.25rem", height: "1.25rem", margin: "0.25rem", opacity: 0, transition: "opacity 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "0"}>
                    <X style={{ width: "0.75rem", height: "0.75rem" }} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="d-block small fw-semibold text-foreground mb-2">Tags</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            placeholder="e.g. react, javascript (comma separated)" className="input-styled" />
        </div>
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting}
          className="btn-primary-custom d-inline-flex align-items-center gap-2 border-0"
          style={{ alignSelf: "flex-start" }}>
          <Send style={{ width: "1rem", height: "1rem" }} /> {submitting ? "Posting..." : "Post Question"}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default AskPage;
