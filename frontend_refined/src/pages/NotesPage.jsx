import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  ThumbsUp,
  ThumbsDown,
  Download,
  Plus,
  MessageSquare,
  Bookmark,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api.js";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload.js";
import { toast } from "@/components/ui/use-toast";

const animItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};
const animContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const safeArray = (v) => (Array.isArray(v) ? v : []);

const UserName = ({ userId }) => {
  const id = Number(userId);
  const { data } = useQuery({
    queryKey: ["username", id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const res = await api.post("/username", { id });
      return res || null;
    },
    staleTime: 5 * 60 * 1000,
  });
  return <>{data || `User #${id}`}</>;
};

const NotesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    course_name: "",
    semester: "",
    prof_name: "",
    course_description: "",
  });
  const [pdfFile, setPdfFile] = useState(null);

  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const data = await api.get("/allnotes");
      if (typeof data === "string") throw new Error(data);
      return safeArray(data);
    },
  });

  const markedNotesQuery = useQuery({
    queryKey: ["markedNotes"],
    queryFn: async () => {
      try {
        const data = await api.get("/api/notes/marked");
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  const markedSet = useMemo(() => {
    return new Set(safeArray(markedNotesQuery.data).map((n) => n?.id).filter(Boolean));
  }, [markedNotesQuery.data]);

  const voteMutation = useMutation({
    mutationFn: async ({ noteId, voteType }) => {
      const res = await api.post("/notevote", { target_id: noteId, vote_type: voteType });
      if (res?.Message) throw new Error(String(res.Message));
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (err) => {
      toast({
        title: "Vote failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to vote.",
        variant: "destructive",
      });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async ({ noteId, nextMarked }) => {
      const path = nextMarked ? "/note_marked" : "/note_unmarked";
      const res = await api.post(path, { note_id: noteId });
      if (res?.Message) throw new Error(String(res.Message));
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markedNotes"] });
    },
    onError: (err) => {
      toast({
        title: "Bookmark failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to update bookmark.",
        variant: "destructive",
      });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!form.course_name.trim()) throw new Error("Course name is required");
      if (!form.course_description.trim()) throw new Error("Description is required");
      if (!pdfFile) throw new Error("Please choose a PDF file");

      const uniqueName = `${Date.now()}_${pdfFile.name.replace(/\s+/g, "_")}`;
      const pdfUrl = await uploadToCloudinary(pdfFile, {
        resourceType: "raw",
        folder: "scholarly/notes",
        publicId: uniqueName,
      });

      return api.post("/noteupload", {
        ...form,
        pdf_url: pdfUrl,
        file_name: pdfFile.name,
        file_size: pdfFile.size,
      });
    },
    onSuccess: async () => {
      toast({ title: "Uploaded", description: "Your note is now available." });
      setShowAdd(false);
      setForm({ course_name: "", semester: "", prof_name: "", course_description: "" });
      setPdfFile(null);
      await queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (err) => {
      toast({
        title: "Upload failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to upload note.",
        variant: "destructive",
      });
    },
  });

  const notes = safeArray(notesQuery.data);

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">Community-shared study materials.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2 border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Note
        </motion.button>
      </motion.div>

      {notesQuery.isLoading && (
        <div className="card-elevated p-6 text-sm text-muted-foreground">Loading notes...</div>
      )}
      {notesQuery.error && (
        <div className="card-elevated p-6 text-sm text-destructive">Failed to load notes.</div>
      )}

      <motion.div
        variants={animContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {notes.map((n) => {
          const isMarked = markedSet.has(n.id);
          const rating = Number(n.rating || 0);
          return (
            <motion.div key={n.id} variants={animItem} className="card-elevated overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-[15px]">{n.course_name}</h3>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                          {n.course_description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                          by <UserName userId={n.author_id} />
                          {n.semester ? ` · ${n.semester}` : ""}
                          {n.prof_name ? ` · ${n.prof_name}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => bookmarkMutation.mutate({ noteId: n.id, nextMarked: !isMarked })}
                        className={`p-2 rounded-lg transition-colors bg-transparent border-0 cursor-pointer ${
                          isMarked ? "text-primary" : "text-muted-foreground hover:text-primary"
                        }`}
                        title={isMarked ? "Remove bookmark" : "Bookmark"}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-3.5 pt-3 border-t border-border/50 flex-wrap">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => voteMutation.mutate({ noteId: n.id, voteType: 1 })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors bg-transparent border-0 p-0 cursor-pointer font-medium"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> {rating}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => voteMutation.mutate({ noteId: n.id, voteType: -1 })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors bg-transparent border-0 p-0 cursor-pointer font-medium"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </motion.button>

                      <button
                        onClick={() => navigate("/pdf-chat", { state: { sourceUrl: n.pdf, note: n } })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-scholarly-amethyst transition-colors bg-transparent border-0 p-0 cursor-pointer font-medium"
                        title="Chat with this PDF"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                      </button>

                      <a
                        href={n.pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors ml-auto no-underline font-medium"
                        title="Open PDF"
                      >
                        <Download className="w-3.5 h-3.5" /> Open
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Upload Notes</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Course name*</label>
                <input
                  value={form.course_name}
                  onChange={(e) => setForm((p) => ({ ...p, course_name: e.target.value }))}
                  className="input-styled"
                  placeholder="e.g. Data Structures"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Description*</label>
                <textarea
                  value={form.course_description}
                  onChange={(e) => setForm((p) => ({ ...p, course_description: e.target.value }))}
                  className="input-styled resize-none"
                  rows={3}
                  placeholder="What do these notes cover?"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Semester</label>
                  <input
                    value={form.semester}
                    onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
                    className="input-styled"
                    placeholder="e.g. Spring 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Professor</label>
                  <input
                    value={form.prof_name}
                    onChange={(e) => setForm((p) => ({ ...p, prof_name: e.target.value }))}
                    className="input-styled"
                    placeholder="e.g. Dr. Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">PDF*</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground"
                />
                {pdfFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate()}
                className="btn-primary w-full border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {addNoteMutation.isPending ? "Uploading..." : "Upload"}
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;
