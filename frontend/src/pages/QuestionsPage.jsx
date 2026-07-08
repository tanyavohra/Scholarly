import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { toast } from "@/lib/toast.jsx";
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
  const openParam = String(searchParams.get("open") || "").trim();
  const openHandledRef = useRef(false);

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

  useEffect(() => {
    if (!openParam) return;
    if (openHandledRef.current) return;
    const id = Number(openParam);
    if (!Number.isFinite(id) || id <= 0) return;
    if (questionsQuery.isLoading) return;
    openHandledRef.current = true;
    setExpandedId(id);
    const t = setTimeout(() => {
      const el = document.getElementById(`question-card-${id}`);
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [openParam, questionsQuery.isLoading]);

  const visibleQuestionIds = useMemo(() => {
    return filteredQuestions.map((q) => q?.id).filter((id) => id != null);
  }, [filteredQuestions]);

  const myVotesQuery = useQuery({
    queryKey: ["myVotes", visibleQuestionIds.join(",")],
    enabled: visibleQuestionIds.length > 0,
    queryFn: async () => {
      try {
        const res = await api.post("/api/questions/uservotes", { question_ids: visibleQuestionIds });
        const votes = res && typeof res === "object" ? res.votes : null;
        return votes && typeof votes === "object" ? votes : {};
      } catch {
        return {};
      }
    },
    staleTime: 30 * 1000,
  });
  const myVotes = myVotesQuery.data || {};

  const voteMutation = useMutation({
    mutationFn: async ({ targetId, voteType }) => {
      const res = await api.post("/vote", { target_id: targetId, vote_type: voteType, is_comment: false });
      if (res?.Message) throw new Error(String(res.Message));
      return res;
    },
    onMutate: async ({ targetId, voteType }) => {
      const key = ["myVotes", visibleQuestionIds.join(",")];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData(key) || {};
      const current = Number(prev?.[targetId] || 0);
      const next = current === voteType ? 0 : voteType;
      queryClient.setQueryData(key, { ...(prev || {}), [targetId]: next });
      return { prev, key };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      await queryClient.invalidateQueries({ queryKey: ["myVotes"] });
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.key) queryClient.setQueryData(ctx.key, ctx.prev || {});
      toast({
        title: "Vote failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to vote.",
        variant: "destructive",
      });
    },
  });

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
    <div className="mx-auto" style={{ maxWidth: "56rem" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="d-flex align-items-center justify-content-between mb-4"
      >
        <div>
          <h1 className="fs-3 fw-bold text-foreground">All Questions</h1>
          <p className="small text-muted-foreground mt-1">
            {questions.length} questions from the community
          </p>
        </div>
      </motion.div>

      {questionsQuery.isLoading && (
        <div className="card-elevated p-4 small text-muted-foreground">Loading questions...</div>
      )}
      {questionsQuery.error && (
        <div className="card-elevated p-4 small text-destructive">Failed to load questions.</div>
      )}

      <motion.div variants={animContainer} initial="hidden" animate="show" className="d-flex flex-column gap-2">
        {filteredQuestions.map((q) => {
          const qTags = tagsByQuestionId.get(q.id) || [];
          const isMarked = markedSet.has(q.id);
          const rating = Number(q.rating || 0);
          const myVote = Number(myVotes?.[q.id] || 0);
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
            <motion.div
              id={`question-card-${q.id}`}
              key={q.id}
              variants={animItem}
              className="card-elevated overflow-hidden"
            >
              <div
                className="p-4"
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : q.id);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex align-items-start gap-3">
                  <div className="d-flex flex-column align-items-center gap-1 pt-1" style={{ minWidth: "48px" }}>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        voteMutation.mutate({ targetId: q.id, voteType: 1 });
                      }}
                      className={`vote-btn ${myVote === 1 ? "liked" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <ThumbsUp style={{ width: "1rem", height: "1rem" }} fill={myVote === 1 ? "currentColor" : "none"} />
                    </motion.button>
                    <span className="fw-bold text-foreground" style={{ fontSize: "0.875rem" }}>{rating}</span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        voteMutation.mutate({ targetId: q.id, voteType: -1 });
                      }}
                      className={`vote-btn ${myVote === -1 ? "disliked" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <ThumbsDown style={{ width: "1rem", height: "1rem" }} fill={myVote === -1 ? "currentColor" : "none"} />
                    </motion.button>
                  </div>

                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h3 className="fw-semibold text-foreground hover-text-primary mb-0" style={{ fontSize: "0.9375rem", cursor: "pointer" }}>
                        {q.title}
                      </h3>
                      {q.image_url && (
                        <a
                          href={q.image_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-0 rounded bg-accent-10 text-accent d-inline-flex align-items-center gap-1 text-decoration-none hover-bg-accent-15"
                          style={{ fontSize: "0.625rem", fontWeight: 600 }}
                          title="Open attached image"
                        >
                          <ImageIcon style={{ width: "0.75rem", height: "0.75rem" }} /> Image
                        </a>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bookmarkMutation.mutate({ questionId: q.id, nextMarked: !isMarked });
                        }}
                        className={`bookmark-btn ms-auto ${isMarked ? "marked" : ""}`}
                        title={isMarked ? "Remove bookmark" : "Bookmark"}
                      >
                        <Bookmark style={{ width: "1rem", height: "1rem" }} fill={isMarked ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <div className="d-flex align-items-center gap-3 mt-2 text-muted-foreground flex-wrap" style={{ fontSize: "0.75rem" }}>
                      <span className="d-flex align-items-center gap-1">
                        <MessageCircle style={{ width: "0.875rem", height: "0.875rem" }} />
                        {answerCount != null ? answerCount : answerCountsQuery.isLoading ? "…" : 0}
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <ThumbsUp style={{ width: "0.875rem", height: "0.875rem" }} />
                        {rating}
                      </span>
                      <span className="fw-medium">
                        by <UserName userId={q.author_id} />
                      </span>
                    </div>

                    <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                      {qTags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          {tag}
                        </span>
                      ))}
                      {q.image_url && (
                        <a
                          href={q.image_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="d-block flex-shrink-0 rounded-3 overflow-hidden border border-border hover-border-primary"
                          style={{ width: "5rem", height: "5rem", background: "hsl(var(--muted) / 0.3)" }}
                          title="Open attached image"
                        >
                          <img
                            src={q.image_url}
                            alt="Question attachment"
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : q.id);
                        }}
                        className="ms-auto d-flex align-items-center gap-1 small text-muted-foreground hover-text-primary bg-transparent border-0 p-0 fw-medium"
                        style={{ cursor: "pointer" }}
                      >
                        {isExpanded ? (
                          <ChevronUp style={{ width: "0.875rem", height: "0.875rem" }} />
                        ) : (
                          <ChevronDown style={{ width: "0.875rem", height: "0.875rem" }} />
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
                    <div className="border-top border-border p-4 bg-muted-20 d-flex flex-column gap-2">
                      {commentsQuery.isLoading && (
                        <p className="small text-muted-foreground text-center py-2 mb-0">
                          Loading answers...
                        </p>
                      )}
                      {commentsQuery.error && (
                        <p className="small text-destructive text-center py-2 mb-0">
                          Failed to load answers.
                        </p>
                      )}
                      {!commentsQuery.isLoading && safeArray(comments).length === 0 && (
                        <p className="small text-muted-foreground text-center py-2 mb-0">
                          No answers yet. Be the first!
                        </p>
                      )}

                      {safeArray(comments).map((c) => (
                        <div key={c.id} className="d-flex gap-2">
                          <div className="avatar-ring bg-primary-10 text-primary mt-0" style={{ width: "1.75rem", height: "1.75rem", fontSize: "0.625rem", boxShadow: "none" }}>
                            {String(c.user_id || "?").slice(0, 1)}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-semibold text-foreground" style={{ fontSize: "0.875rem" }}>
                                <UserName userId={c.user_id} />
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-0 mb-0" style={{ fontSize: "0.875rem" }}>{c.content}</p>
                            <div className="d-flex align-items-center gap-2 mt-1 text-muted-foreground" style={{ fontSize: "0.625rem", opacity: 0.7 }}>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  commentVoteMutation.mutate({ commentId: c.id, voteType: 1 });
                                }}
                                className="vote-btn like"
                                style={{ padding: "0.25rem" }}
                              >
                                <ThumbsUp style={{ width: "0.75rem", height: "0.75rem" }} />
                              </motion.button>
                              <span className="text-center" style={{ minWidth: "18px" }}>{Number(c.rating || 0)}</span>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  commentVoteMutation.mutate({ commentId: c.id, voteType: -1 });
                                }}
                                className="vote-btn dislike"
                                style={{ padding: "0.25rem" }}
                              >
                                <ThumbsDown style={{ width: "0.75rem", height: "0.75rem" }} />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="d-flex gap-2 pt-2">
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
                          className="input-styled flex-grow-1"
                          style={{ paddingTop: "0.625rem", paddingBottom: "0.625rem" }}
                        />
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            const text = String(newComment[q.id] || "").trim();
                            if (!text) return;
                            addCommentMutation.mutate({ questionId: q.id, content: text });
                            setNewComment((prev) => ({ ...prev, [q.id]: "" }));
                          }}
                          className="send-btn d-flex align-items-center justify-content-center border-0"
                          style={{ padding: "0.625rem" }}
                        >
                          <Send style={{ width: "0.875rem", height: "0.875rem" }} />
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
