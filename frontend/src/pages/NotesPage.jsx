import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  ThumbsUp,
  ThumbsDown,
  Download,
  Plus,
  Bookmark,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api.js";
import { uploadToCloudinary } from "@/lib/cloudinaryUpload.js";
import { toast } from "@/lib/toast.jsx";

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
  const [searchParams] = useSearchParams();
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
  const openParam = String(searchParams.get("open") || "").trim();
  const openHandledRef = useRef(false);
  const [highlightId, setHighlightId] = useState(null);
  const [voteMap, setVoteMap] = useState({});

  useEffect(() => {
    if (!openParam) return;
    if (openHandledRef.current) return;
    if (notesQuery.isLoading) return;
    const id = Number(openParam);
    if (!Number.isFinite(id) || id <= 0) return;
    openHandledRef.current = true;
    setHighlightId(id);
    const t = setTimeout(() => {
      const el = document.getElementById(`note-card-${id}`);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }, 50);
    const clear = setTimeout(() => setHighlightId(null), 2500);
    return () => {
      clearTimeout(t);
      clearTimeout(clear);
    };
  }, [openParam, notesQuery.isLoading]);

  return (
    <div className="mx-auto" style={{ maxWidth: "64rem" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="d-flex align-items-center justify-content-between mb-4"
      >
        <div>
          <h1 className="fs-3 fw-bold text-foreground">Notes</h1>
          <p className="small text-muted-foreground mt-1">Community-shared study materials.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAdd(true)}
          className="btn-primary-custom d-flex align-items-center gap-2 border-0 cursor-pointer"
        >
          <Plus style={{ width: "1rem", height: "1rem" }} /> Add Note
        </motion.button>
      </motion.div>

      {notesQuery.isLoading && (
        <div className="card-elevated p-4 small text-muted-foreground">Loading notes...</div>
      )}
      {notesQuery.error && (
        <div className="card-elevated p-4 small text-destructive">Failed to load notes.</div>
      )}

      <motion.div
        variants={animContainer}
        initial="hidden"
        animate="show"
        className="row row-cols-1 row-cols-md-2 g-3"
      >
        {notes.map((n) => {
          const isMarked = markedSet.has(n.id);
          const rating = Number(n.rating || 0);
          const isHighlighted = highlightId === n.id;
          const userVote = voteMap[n.id] || 0;

          return (
            <motion.div
              id={`note-card-${n.id}`}
              key={n.id}
              variants={animItem}
              className={`col`}
            >
              <div className={`card-elevated overflow-hidden h-100 ${isHighlighted ? "ring-2" : ""}`}
                style={isHighlighted ? { boxShadow: "0 0 0 2px hsl(var(--primary) / 0.4)" } : {}}>
                <div className="p-4">
                  <div className="d-flex align-items-start gap-3">
                    <div className="d-flex align-items-center justify-content-center rounded-3 bg-accent-10 flex-shrink-0"
                      style={{ width: "2.75rem", height: "2.75rem" }}>
                      <FileText className="text-accent" style={{ width: "1.25rem", height: "1.25rem" }} />
                    </div>

                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-start gap-2">
                        <div className="flex-grow-1 min-w-0">
                          <h3 className="fw-semibold text-foreground mb-0" style={{ fontSize: "0.9375rem" }}>
                            {n.course_name}
                          </h3>

                          <p className="text-muted-foreground mt-1 line-clamp-2 mb-0" style={{ fontSize: "0.75rem" }}>
                            {n.course_description}
                          </p>

                          <p className="text-muted-foreground mt-1 fw-medium mb-0" style={{ fontSize: "0.75rem" }}>
                            by <UserName userId={n.author_id} />
                            {n.semester ? ` · ${n.semester}` : ""}
                            {n.prof_name ? ` · ${n.prof_name}` : ""}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            bookmarkMutation.mutate({
                              noteId: n.id,
                              nextMarked: !isMarked,
                            });
                          }}
                          className={`bookmark-btn ${isMarked ? "marked" : ""}`}
                          title={isMarked ? "Remove bookmark" : "Bookmark"}
                        >
                          <Bookmark style={{ width: "1rem", height: "1rem" }} fill={isMarked ? "currentColor" : "none"} />
                        </button>
                      </div>

                      <div className="d-flex align-items-center gap-3 mt-3 pt-3 border-top border-border flex-wrap">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = userVote === 1 ? 0 : 1;
                            voteMutation.mutate({ noteId: n.id, voteType: next });
                            setVoteMap((prev) => ({ ...prev, [n.id]: next }));
                          }}
                          className="d-flex align-items-center gap-1 small text-muted-foreground hover-text-primary bg-transparent border-0 p-0 fw-medium"
                          style={{ cursor: "pointer" }}
                        >
                          <ThumbsUp style={{ width: "1rem", height: "1rem" }} fill={userVote === 1 ? "currentColor" : "none"} />
                          {rating}
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = userVote === -1 ? 0 : -1;
                            voteMutation.mutate({ noteId: n.id, voteType: next });
                            setVoteMap((prev) => ({ ...prev, [n.id]: next }));
                          }}
                          className="d-flex align-items-center gap-1 small text-muted-foreground hover-text-destructive bg-transparent border-0 p-0 fw-medium"
                          style={{ cursor: "pointer" }}
                        >
                          <ThumbsDown style={{ width: "1rem", height: "1rem" }} fill={userVote === -1 ? "currentColor" : "none"} />
                        </motion.button>

                        <a
                          href={n.pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="d-flex align-items-center gap-1 small text-muted-foreground hover-text-accent ms-auto text-decoration-none fw-medium"
                          title="Open PDF"
                        >
                          <Download style={{ width: "0.875rem", height: "0.875rem" }} /> Open
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {showAdd && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 50, padding: "1rem" }}>
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-black-40" onClick={() => setShowAdd(false)} />
          <div className="position-relative w-100 card-elevated p-4" style={{ maxWidth: "32rem" }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h2 className="fw-bold text-foreground mb-0" style={{ fontSize: "1.125rem" }}>Upload Notes</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 rounded-3 hover-bg-muted-50 border-0 bg-transparent"
                style={{ cursor: "pointer" }}
              >
                <X className="text-muted-foreground" style={{ width: "1rem", height: "1rem" }} />
              </button>
            </div>

            <div className="d-flex flex-column gap-2">
              <div>
                <label className="d-block small fw-semibold text-foreground mb-1">Course name*</label>
                <input
                  value={form.course_name}
                  onChange={(e) => setForm((p) => ({ ...p, course_name: e.target.value }))}
                  className="input-styled"
                  placeholder="e.g. Data Structures"
                />
              </div>
              <div>
                <label className="d-block small fw-semibold text-foreground mb-1">Description*</label>
                <textarea
                  value={form.course_description}
                  onChange={(e) => setForm((p) => ({ ...p, course_description: e.target.value }))}
                  className="input-styled resize-none"
                  rows={3}
                  placeholder="What do these notes cover?"
                />
              </div>
              <div className="row g-2">
                <div className="col-sm-6">
                  <label className="d-block small fw-semibold text-foreground mb-1">Semester</label>
                  <input
                    value={form.semester}
                    onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
                    className="input-styled"
                    placeholder="e.g. Spring 2026"
                  />
                </div>
                <div className="col-sm-6">
                  <label className="d-block small fw-semibold text-foreground mb-1">Professor</label>
                  <input
                    value={form.prof_name}
                    onChange={(e) => setForm((p) => ({ ...p, prof_name: e.target.value }))}
                    className="input-styled"
                    placeholder="e.g. Dr. Smith"
                  />
                </div>
              </div>

              <div>
                <label className="d-block small fw-semibold text-foreground mb-1">PDF*</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="d-block w-100 small text-muted-foreground"
                />
                {pdfFile && (
                  <p className="text-muted-foreground mt-1 mb-0" style={{ fontSize: "0.75rem" }}>
                    Selected: {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={addNoteMutation.isPending}
                onClick={() => addNoteMutation.mutate()}
                className="btn-primary-custom w-100 border-0"
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
