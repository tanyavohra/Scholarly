import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  ImageIcon,
  Send,
  ChevronDown,
  ChevronUp,
  Bookmark,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api.js";
import { toast } from "@/components/ui/use-toast";
import { useSearchParams } from "react-router-dom";

const animItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};
const animContainer = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

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

const QuestionsPage = () => {
  const [expandedId, setExpandedId] = useState(null);
  const [newComment, setNewComment] = useState({});
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const qParam = String(searchParams.get("q") || "").trim().toLowerCase();
  const tagParam = String(searchParams.get("tag") || "").trim().toLowerCase();

  const questionsQuery = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const data = await api.get("/allquestions");
      if (typeof data === "string") throw new Error(data);
      return safeArray(data);
    },
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const data = await api.get("/alltags");
      if (typeof data === "string") throw new Error(data);
      return safeArray(data);
    },
    staleTime: 5 * 60 * 1000,
  });

  const questionTagsQuery = useQuery({
    queryKey: ["question_tags"],
    queryFn: async () => {
      const data = await api.get("/question_tags");
      if (typeof data === "string") throw new Error(data);
      return safeArray(data);
    },
    staleTime: 5 * 60 * 1000,
  });

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
    staleTime: 30 * 1000,
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

  const markedSet = useMemo(() => {
    return new Set(safeArray(markedQuestionsQuery.data).map((q) => q?.id).filter(Boolean));
  }, [markedQuestionsQuery.data]);

  const voteMutation = useMutation({
    mutationFn: async ({ targetId, voteType }) => {
      const res = await api.post("/vote", { target_id: targetId, vote_type: voteType, is_comment: false });
      if (res?.Message) throw new Error(String(res.Message));
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
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
    mutationFn: async ({ questionId, nextMarked }) => {
      const path = nextMarked ? "/question_marked" : "/question_unmarked";
      const res = await api.post(path, { question_id: questionId });
      if (res?.Message) throw new Error(String(res.Message));
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markedQuestions"] });
    },
    onError: (err) => {
      toast({
        title: "Bookmark failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to update bookmark.",
        variant: "destructive",
      });
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", expandedId],
    enabled: Boolean(expandedId),
    queryFn: async () => {
      const data = await api.get(`/allcomments/${expandedId}`);
      if (typeof data === "string") throw new Error(data);
      return safeArray(data);
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ questionId, content }) => {
      const res = await api.post("/comment", { comment_content: content, question_id: questionId });
      if (res?.Status !== "Success") {
        const message =
          res?.Message || res?.error || (typeof res === "string" ? res : "") || "Unable to add answer.";
        throw new Error(String(message));
      }
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["comments", expandedId] });
      await queryClient.invalidateQueries({ queryKey: ["answerCounts"] });
    },
    onError: (err) => {
      toast({
        title: "Reply failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to add answer.",
        variant: "destructive",
      });
    },
  });

  const commentVoteMutation = useMutation({
    mutationFn: async ({ commentId, voteType }) => {
      const res = await api.post("/commentvote", { target_id: commentId, vote_type: voteType, is_comment: true });
      if (typeof res === "string" && res.toLowerCase().includes("error")) throw new Error(res);
      return res;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["comments", expandedId] });
    },
    onError: (err) => {
      toast({
        title: "Vote failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to vote on this answer.",
        variant: "destructive",
      });
    },
  });

  const questions = safeArray(questionsQuery.data);
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const title = String(q?.title || "").toLowerCase();
      const content = String(q?.content || "").toLowerCase();
      const qTags = (tagsByQuestionId.get(q?.id) || []).map((t) => String(t).toLowerCase());

      const matchesQ = !qParam || title.includes(qParam) || content.includes(qParam);
      const matchesTag = !tagParam || qTags.some((t) => t === tagParam || t.includes(tagParam));
      return matchesQ && matchesTag;
    });
  }, [questions, qParam, tagParam, tagsByQuestionId]);

  const visibleQuestionIds = useMemo(() => {
    return filteredQuestions.map((q) => q?.id).filter((id) => id != null);
  }, [filteredQuestions]);

  const answerCountsQuery = useQuery({
    queryKey: ["answerCounts", visibleQuestionIds.join(",")],
    enabled: visibleQuestionIds.length > 0,
    queryFn: async () => {
      const res = await api.post("/api/answers/counts", { question_ids: visibleQuestionIds });
      if (typeof res === "string") throw new Error(res);
      return (res && typeof res === "object" && res.counts) || {};
    },
    staleTime: 30 * 1000,
  });
  const answerCounts = answerCountsQuery.data || {};

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Questions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {questions.length} questions from the community
          </p>
        </div>
      </motion.div>

      {questionsQuery.isLoading && (
        <div className="card-elevated p-6 text-sm text-muted-foreground">Loading questions...</div>
      )}
      {questionsQuery.error && (
        <div className="card-elevated p-6 text-sm text-destructive">Failed to load questions.</div>
      )}

      <motion.div variants={animContainer} initial="hidden" animate="show" className="space-y-3">
        {filteredQuestions.map((q) => {
          const qTags = tagsByQuestionId.get(q.id) || [];
          const isMarked = markedSet.has(q.id);
          const rating = Number(q.rating || 0);
          const isExpanded = expandedId === q.id;
          const comments = isExpanded ? safeArray(commentsQuery.data) : null;
          const cachedCount =
            answerCounts[String(q.id)] != null
              ? Number(answerCounts[String(q.id)])
              : answerCounts[q.id] != null
                ? Number(answerCounts[q.id])
                : null;
          const answerCount = isExpanded ? safeArray(comments).length : cachedCount;

          return (
            <motion.div key={q.id} variants={animItem} className="card-elevated overflow-hidden">
              <div
                className="p-5 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : q.id);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 min-w-[48px] pt-1">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        voteMutation.mutate({ targetId: q.id, voteType: 1 });
                      }}
                      className="p-2 rounded-lg hover:bg-primary/10 transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      <ThumbsUp className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </motion.button>
                    <span className="text-sm font-bold text-foreground">{rating}</span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        voteMutation.mutate({ targetId: q.id, voteType: -1 });
                      }}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      <ThumbsDown className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </motion.button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground text-[15px] hover:text-primary transition-colors cursor-pointer">
                        {q.title}
                      </h3>
                      {q.image_url && (
                        <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-semibold flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> img
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bookmarkMutation.mutate({ questionId: q.id, nextMarked: !isMarked });
                        }}
                        className={`ml-auto p-2 rounded-lg transition-colors bg-transparent border-0 cursor-pointer ${
                          isMarked ? "text-primary" : "text-muted-foreground hover:text-primary"
                        }`}
                        title={isMarked ? "Remove bookmark" : "Bookmark"}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {answerCount != null ? answerCount : answerCountsQuery.isLoading ? "…" : 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {rating}
                      </span>
                      <span className="font-medium">
                        by <UserName userId={q.author_id} />
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {qTags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          {tag}
                        </span>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : q.id);
                        }}
                        className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors bg-transparent border-0 p-0 cursor-pointer font-medium"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                        {isExpanded ? "Hide answers" : "Show answers"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border bg-muted/20 p-5 space-y-3">
                      {commentsQuery.isLoading && (
                        <p className="text-sm text-muted-foreground text-center py-3">
                          Loading answers...
                        </p>
                      )}
                      {commentsQuery.error && (
                        <p className="text-sm text-destructive text-center py-3">
                          Failed to load answers.
                        </p>
                      )}
                      {!commentsQuery.isLoading && safeArray(comments).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-3">
                          No answers yet. Be the first!
                        </p>
                      )}

                      {safeArray(comments).map((c) => (
                        <div key={c.id} className="flex gap-3">
                          <div className="avatar-ring bg-primary/10 text-primary text-[10px] w-7 h-7 shrink-0 mt-0.5 ring-0">
                            {String(c.user_id || "?").slice(0, 1)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                <UserName userId={c.user_id} />
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{c.content}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/70">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  commentVoteMutation.mutate({ commentId: c.id, voteType: 1 });
                                }}
                                className="p-1 rounded-md hover:bg-primary/10 transition-colors bg-transparent border-0 cursor-pointer"
                                title="Like"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </motion.button>
                              <span className="min-w-[18px] text-center">{Number(c.rating || 0)}</span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  commentVoteMutation.mutate({ commentId: c.id, voteType: -1 });
                                }}
                                className="p-1 rounded-md hover:bg-destructive/10 transition-colors bg-transparent border-0 cursor-pointer"
                                title="Dislike"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={newComment[q.id] || ""}
                          onChange={(e) =>
                            setNewComment((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            const text = String(newComment[q.id] || "").trim();
                            if (!text) return;
                            addCommentMutation.mutate({ questionId: q.id, content: text });
                            setNewComment((prev) => ({ ...prev, [q.id]: "" }));
                          }}
                          placeholder="Write an answer..."
                          className="input-styled flex-1 !py-2.5 !text-sm"
                        />
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            const text = String(newComment[q.id] || "").trim();
                            if (!text) return;
                            addCommentMutation.mutate({ questionId: q.id, content: text });
                            setNewComment((prev) => ({ ...prev, [q.id]: "" }));
                          }}
                          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all border-0 cursor-pointer shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default QuestionsPage;
