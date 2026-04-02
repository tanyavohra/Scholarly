import React, { useState } from "react";
import { motion } from "framer-motion";
import { Send, ImagePlus, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api.js";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload.js";
import { toast } from "@/components/ui/use-toast";

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
        // Best-effort: only first image is supported by the backend schema today.
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
      className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Ask a Question</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Get help from the community by posting a clear, detailed question.</p>

      <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What's your question about?" className="input-styled" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Description</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Provide context, code snippets, and what you've tried..." rows={6} className="input-styled resize-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Attach Images (optional)</label>
          <div className="border-2 border-dashed border-border rounded-2xl p-8 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group relative">
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
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2.5 group-hover:bg-primary/10 transition-colors">
                <ImagePlus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Drop images here or click to upload</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG up to 10MB</p>
            </div>
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {images.map((img, i) => (
                <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="relative group/img rounded-xl overflow-hidden border border-border w-20 h-20">
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity border-0 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Tags</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            placeholder="e.g. react, javascript (comma separated)" className="input-styled" />
        </div>
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={submitting}
          className="btn-primary flex items-center gap-2 border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" /> {submitting ? "Posting..." : "Post Question"}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default AskPage;
