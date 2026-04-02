import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, FileText, HelpCircle, ThumbsUp, MessageCircle, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api.js";
import { toast } from "@/components/ui/use-toast";

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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-1">Bookmarks</h1>
      <p className="text-sm text-muted-foreground mb-5">Your saved questions and notes.</p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("questions")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all border-0 cursor-pointer ${
            tab === "questions" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:text-foreground"
          }`}
          style={tab === "questions" ? { boxShadow: "0 2px 8px hsl(245 58% 56% / 0.25)" } : {}}
        >
          <HelpCircle className="w-4 h-4" /> Questions ({markedQuestions.length})
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all border-0 cursor-pointer ${
            tab === "notes" ? "bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:text-foreground"
          }`}
          style={tab === "notes" ? { boxShadow: "0 2px 8px hsl(245 58% 56% / 0.25)" } : {}}
        >
          <FileText className="w-4 h-4" /> Notes ({markedNotes.length})
        </button>
      </div>

      {tab === "questions" && (
        <motion.div variants={animContainer} initial="hidden" animate="show" className="space-y-3">
          {markedQuestions.map((q) => (
            <motion.div key={q.id} variants={animItem} className="card-elevated p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bookmark className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-[15px]">{q.title}</h3>
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {Number(q.rating || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" /> —
                        </span>
                        <span className="font-medium">
                          by <UserName userId={q.author_id} />
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2.5 flex-wrap">
                        {(tagsByQuestionId.get(q.id) || []).map((tag) => (
                          <span key={tag} className="tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => unmarkQuestionMutation.mutate(q.id)}
                      className="p-2 rounded-lg hover:bg-muted/50 transition-colors border-0 bg-transparent cursor-pointer"
                      title="Remove bookmark"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {markedQuestions.length === 0 && (
            <div className="card-elevated p-10 text-center text-sm text-muted-foreground">No bookmarked questions yet.</div>
          )}
        </motion.div>
      )}

      {tab === "notes" && (
        <motion.div variants={animContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {markedNotes.map((n) => (
            <motion.div key={n.id} variants={animItem} className="card-elevated p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-[15px]">{n.course_name}</h3>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        by <UserName userId={n.author_id} />
                      </p>
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {Number(n.rating || 0)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => unmarkNoteMutation.mutate(n.id)}
                      className="p-2 rounded-lg hover:bg-muted/50 transition-colors border-0 bg-transparent cursor-pointer"
                      title="Remove bookmark"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {markedNotes.length === 0 && (
            <div className="card-elevated p-10 text-center text-sm text-muted-foreground">No bookmarked notes yet.</div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default BookmarksPage;
