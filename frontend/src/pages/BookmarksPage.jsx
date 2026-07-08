import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, FileText, HelpCircle, ThumbsUp, MessageCircle, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api.js";
import { toast } from "@/lib/toast.jsx";

const animItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const animContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const safeArray = (v) => (Array.isArray(v) ? v : []);

const UserName = ({ userId }) => {
  const id = Number(userId);
  const { data } = useQuery({
    queryKey: ["username", id],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => (await api.post("/username", { id })) || null,
    staleTime: 5 * 60 * 1000,
  });
  return <>{data || `User #${id}`}</>;
};

const BookmarksPage = () => {
  const [tab, setTab] = useState("questions");
  const queryClient = useQueryClient();

  const markedQuestionsQuery = useQuery({
    queryKey: ["markedQuestions"],
    queryFn: async () => {
      try {
        const data = await api.get("/api/questions/marked");
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
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
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: async () => safeArray(await api.get("/alltags")),
    staleTime: 5 * 60 * 1000,
  });

  const questionTagsQuery = useQuery({
    queryKey: ["question_tags"],
    queryFn: async () => safeArray(await api.get("/question_tags")),
    staleTime: 5 * 60 * 1000,
  });

  const tagsById = useMemo(() => {
    const m = new Map();
    for (const t of safeArray(tagsQuery.data)) {
      if (t && t.id != null) m.set(t.id, t.name);
    }
    return m;
  }, [tagsQuery.data]);

  const tagsByQuestionId = useMemo(() => {
    const m = new Map();
    for (const qt of safeArray(questionTagsQuery.data)) {
      const qid = qt?.question_id;
      const tid = qt?.tag_id;
      const name = tagsById.get(tid);
      if (!qid || !name) continue;
      const arr = m.get(qid) || [];
      if (!arr.includes(name)) arr.push(name);
      m.set(qid, arr);
    }
    return m;
  }, [questionTagsQuery.data, tagsById]);

  const unmarkQuestionMutation = useMutation({
    mutationFn: async (questionId) => {
      const res = await api.post("/question_unmarked", { question_id: questionId });
      if (res?.Message) throw new Error(String(res.Message));
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markedQuestions"] });
    },
    onError: (err) => {
      toast({
        title: "Update failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to update bookmark.",
        variant: "destructive",
      });
    },
  });

  const unmarkNoteMutation = useMutation({
    mutationFn: async (noteId) => {
      const res = await api.post("/note_unmarked", { note_id: noteId });
      if (res?.Message) throw new Error(String(res.Message));
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markedNotes"] });
    },
    onError: (err) => {
      toast({
        title: "Update failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to update bookmark.",
        variant: "destructive",
      });
    },
  });

  const markedQuestions = safeArray(markedQuestionsQuery.data);
  const markedNotes = safeArray(markedNotesQuery.data);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto" style={{ maxWidth: "56rem" }}>
      <h1 className="fs-3 fw-bold text-foreground mb-1">Bookmarks</h1>
      <p className="small text-muted-foreground mb-4">Your saved questions and notes.</p>

      <div className="d-flex gap-2 mb-4">
        <button
          onClick={() => setTab("questions")}
          className={`filter-btn d-flex align-items-center gap-2 ${tab === "questions" ? "active" : ""}`}
        >
          <HelpCircle style={{ width: "1rem", height: "1rem" }} /> Questions ({markedQuestions.length})
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`filter-btn d-flex align-items-center gap-2 ${tab === "notes" ? "active" : ""}`}
        >
          <FileText style={{ width: "1rem", height: "1rem" }} /> Notes ({markedNotes.length})
        </button>
      </div>

      {tab === "questions" && (
        <motion.div variants={animContainer} initial="hidden" animate="show" className="d-flex flex-column gap-2">
          {markedQuestions.map((q) => (
            <motion.div key={q.id} variants={animItem} className="card-elevated p-4">
              <div className="d-flex align-items-start gap-3">
                <div className="d-flex align-items-center justify-content-center rounded-3 bg-primary-10 flex-shrink-0"
                  style={{ width: "2.5rem", height: "2.5rem" }}>
                  <Bookmark className="text-primary" style={{ width: "1rem", height: "1rem" }} />
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex align-items-start gap-2">
                    <div className="flex-grow-1">
                      <h3 className="fw-semibold text-foreground mb-0" style={{ fontSize: "0.9375rem" }}>{q.title}</h3>
                      <div className="d-flex align-items-center gap-3 mt-2 text-muted-foreground flex-wrap" style={{ fontSize: "0.75rem" }}>
                        <span className="d-flex align-items-center gap-1">
                          <ThumbsUp style={{ width: "0.875rem", height: "0.875rem" }} />
                          {Number(q.rating || 0)}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <MessageCircle style={{ width: "0.875rem", height: "0.875rem" }} /> —
                        </span>
                        <span className="fw-medium">
                          by <UserName userId={q.author_id} />
                        </span>
                      </div>
                      <div className="d-flex gap-2 mt-2 flex-wrap">
                        {(tagsByQuestionId.get(q.id) || []).map((tag) => (
                          <span key={tag} className="tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => unmarkQuestionMutation.mutate(q.id)}
                      className="p-2 rounded-3 hover-bg-muted-50 border-0 bg-transparent"
                      style={{ cursor: "pointer" }}
                      title="Remove bookmark"
                    >
                      <X className="text-muted-foreground" style={{ width: "1rem", height: "1rem" }} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {markedQuestions.length === 0 && (
            <div className="card-elevated p-10 text-center small text-muted-foreground">No bookmarked questions yet.</div>
          )}
        </motion.div>
      )}

      {tab === "notes" && (
        <motion.div variants={animContainer} initial="hidden" animate="show" className="row row-cols-1 row-cols-md-2 g-3">
          {markedNotes.map((n) => (
            <motion.div key={n.id} variants={animItem} className="col">
              <div className="card-elevated p-4 h-100">
                <div className="d-flex align-items-start gap-3">
                  <div className="d-flex align-items-center justify-content-center rounded-3 bg-accent-10 flex-shrink-0"
                    style={{ width: "2.5rem", height: "2.5rem" }}>
                    <FileText className="text-accent" style={{ width: "1.25rem", height: "1.25rem" }} />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-start gap-2">
                      <div className="flex-grow-1 min-w-0">
                        <h3 className="fw-semibold text-foreground mb-0" style={{ fontSize: "0.9375rem" }}>{n.course_name}</h3>
                        <p className="text-muted-foreground mt-1 mb-0" style={{ fontSize: "0.75rem" }}>
                          by <UserName userId={n.author_id} />
                        </p>
                        <div className="d-flex align-items-center gap-3 mt-2 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                          <span className="d-flex align-items-center gap-1">
                            <ThumbsUp style={{ width: "0.875rem", height: "0.875rem" }} />
                            {Number(n.rating || 0)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => unmarkNoteMutation.mutate(n.id)}
                        className="p-2 rounded-3 hover-bg-muted-50 border-0 bg-transparent"
                        style={{ cursor: "pointer" }}
                        title="Remove bookmark"
                      >
                        <X className="text-muted-foreground" style={{ width: "1rem", height: "1rem" }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {markedNotes.length === 0 && (
            <div className="card-elevated p-10 text-center small text-muted-foreground">No bookmarked notes yet.</div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default BookmarksPage;
