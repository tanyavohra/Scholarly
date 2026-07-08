import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle,
  ThumbsUp,
  FileText,
  ArrowRight,
  TrendingUp,
  Users,
  Compass,
  Bookmark,
  Sparkles,
  Tag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.js";

const safeArray = (v) => (Array.isArray(v) ? v : []);

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const HomePage = () => {
  const questionsQuery = useQuery({
    queryKey: ["topQuestions"],
    queryFn: async () => safeArray(await api.get("/top-questions")),
  });
  const notesQuery = useQuery({
    queryKey: ["topNotes"],
    queryFn: async () => safeArray(await api.get("/top-notes")),
  });
  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: async () => safeArray(await api.get("/alltags")),
    staleTime: 5 * 60 * 1000,
  });

  const topQuestions = safeArray(questionsQuery.data);
  const topNotes = safeArray(notesQuery.data);
  const tags = safeArray(tagsQuery.data).slice(0, 8);

  const topQuestionIds = useMemo(() => topQuestions.map((q) => q?.id).filter((id) => id != null), [topQuestions]);

  const answerCountsQuery = useQuery({
    queryKey: ["homeAnswerCounts", topQuestionIds.join(",")],
    enabled: topQuestionIds.length > 0,
    queryFn: async () => {
      const res = await api.post("/api/answers/counts", { question_ids: topQuestionIds });
      if (typeof res === "string") throw new Error(res);
      return (res && typeof res === "object" && res.counts) || {};
    },
    staleTime: 30 * 1000,
  });
  const answerCounts = answerCountsQuery.data || {};

  return (
    <div className="mx-auto" style={{ maxWidth: "72rem" }}>
      <div className="d-flex flex-column gap-4">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="position-relative overflow-hidden rounded-5 p-8"
          style={{ background: "linear-gradient(135deg, hsl(248 73% 59%), hsl(257 50% 65%))" }}
        >
          <div
            className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="position-relative">
            <div className="d-flex align-items-center gap-2 mb-3">
              <Sparkles className="text-primary-foreground" style={{ width: "1rem", height: "1rem", opacity: 0.8 }} />
              <span className="small fw-semibold text-primary-foreground text-uppercase" style={{ opacity: 0.8, letterSpacing: "0.05em" }}>
                Dashboard
              </span>
            </div>
            <h1 className="fs-1 fw-bold text-primary-foreground mb-2">Welcome back!</h1>
            <p className="text-primary-foreground small mb-4" style={{ maxWidth: "28rem", opacity: 0.7 }}>
              Explore questions, share knowledge, and connect with fellow learners.
            </p>
            <div className="d-flex gap-3">
              <Link
                to="/ask"
                className="btn-primary-custom text-decoration-none d-inline-flex align-items-center gap-2"
                style={{ background: "hsl(var(--card))", color: "hsl(var(--primary))", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
              >
                Ask a Question <ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />
              </Link>
              <Link
                to="/explore"
                className="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-3 text-decoration-none"
                style={{ background: "hsl(var(--primary-foreground) / 0.15)", color: "hsl(var(--primary-foreground))", fontSize: "0.875rem", fontWeight: 500, border: "1px solid hsl(var(--primary-foreground) / 0.2)" }}
              >
                <Compass style={{ width: "0.875rem", height: "0.875rem" }} /> Explore
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="row g-4">
          <div className="col-lg-8 d-flex flex-column gap-4">
            <section>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="fs-5 fw-bold text-foreground mb-0">Top Questions</h2>
                <Link
                  to="/questions"
                  className="small text-primary fw-medium d-flex align-items-center gap-1 text-decoration-none hover-gap-2"
                >
                  View all <ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />
                </Link>
              </div>

              <motion.div variants={container} initial="hidden" animate="show" className="d-flex flex-column gap-2">
                {topQuestions.map((q) => (
                  <Link to={`/questions?open=${encodeURIComponent(q.id)}`} className="text-decoration-none d-block">
                    <motion.div variants={item} className="card-elevated p-4 hover-muted-20" style={{ cursor: "pointer" }}>
                      <h3 className="fw-semibold text-foreground small mb-0">{q.title}</h3>
                      <div className="d-flex align-items-center gap-3 mt-2 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        <span className="d-flex align-items-center gap-1">
                          <ThumbsUp style={{ width: "0.875rem", height: "0.875rem" }} />
                          {Number(q.rating || 0)}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <MessageCircle style={{ width: "0.875rem", height: "0.875rem" }} />{" "}
                          {(() => {
                            const count =
                              answerCounts[String(q.id)] != null
                                ? Number(answerCounts[String(q.id)])
                                : answerCounts[q.id] != null
                                  ? Number(answerCounts[q.id])
                                  : null;
                            return count != null ? count : answerCountsQuery.isLoading ? "…" : 0;
                          })()}
                        </span>
                        <span className="d-flex align-items-center gap-1">
                          <Users style={{ width: "0.875rem", height: "0.875rem" }} /> author #{q.author_id}
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
                {topQuestions.length === 0 && (
                  <div className="card-elevated p-10 text-center small text-muted-foreground">
                    No questions yet.
                  </div>
                )}
              </motion.div>
            </section>

            <section>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="fs-5 fw-bold text-foreground mb-0">Top Notes</h2>
                <Link
                  to="/notes"
                  className="small text-primary fw-medium d-flex align-items-center gap-1 text-decoration-none hover-gap-2"
                >
                  View all <ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />
                </Link>
              </div>
              <motion.div variants={container} initial="hidden" animate="show" className="row row-cols-1 row-cols-md-2 g-2">
                {topNotes.map((n) => (
                  <Link key={n.id} to={`/notes?open=${encodeURIComponent(n.id)}`} className="text-decoration-none d-block col">
                    <motion.div variants={item} className="card-elevated p-4 hover-muted-20" style={{ cursor: "pointer" }}>
                      <div className="d-flex align-items-start gap-3">
                        <div className="d-flex align-items-center justify-content-center rounded-3 bg-accent-10 flex-shrink-0"
                          style={{ width: "2.75rem", height: "2.75rem" }}>
                          <FileText className="text-accent" style={{ width: "1.25rem", height: "1.25rem" }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="fw-semibold text-foreground small mb-0">{n.course_name}</h3>
                          <p className="text-muted-foreground mt-1 line-clamp-2 mb-0" style={{ fontSize: "0.75rem" }}>{n.course_description}</p>
                          <div className="d-flex align-items-center gap-3 mt-2 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                            <span className="d-flex align-items-center gap-1">
                              <ThumbsUp style={{ width: "0.875rem", height: "0.875rem" }} />
                              {Number(n.rating || 0)}
                            </span>
                            <span className="d-flex align-items-center gap-1">
                              <Users style={{ width: "0.875rem", height: "0.875rem" }} /> author #{n.author_id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
                {topNotes.length === 0 && (
                  <div className="card-elevated p-10 text-center small text-muted-foreground">
                    No notes yet.
                  </div>
                )}
              </motion.div>
            </section>
          </div>

          <motion.div variants={container} initial="hidden" animate="show" className="col-lg-4 d-flex flex-column gap-3">
            <motion.div variants={item} className="card-elevated p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <TrendingUp className="text-accent" style={{ width: "1rem", height: "1rem" }} />
                <h3 className="fw-bold text-foreground small mb-0">Tags</h3>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t.id} className="tag-chip d-flex align-items-center gap-1">
                    <Tag style={{ width: "0.75rem", height: "0.75rem" }} /> {t.name}
                  </span>
                ))}
                {tags.length === 0 && <p className="small text-muted-foreground mb-0">No tags yet.</p>}
              </div>
            </motion.div>

            <motion.div variants={item} className="card-elevated p-4">
              <h3 className="fw-bold text-foreground small mb-3">Quick Actions</h3>
              <div className="d-flex flex-column gap-1">
                {[
                  { to: "/ask", icon: MessageCircle, label: "Post a question", color: "text-primary" },
                  { to: "/notes", icon: FileText, label: "Share study notes", color: "text-accent" },
                  { to: "/bookmarks", icon: Bookmark, label: "View bookmarks", color: "text-scholarly-periwinkle" },
                ].map((a) => (
                  <Link
                    key={a.to}
                    to={a.to}
                    className="quick-action-link"
                  >
                    <a.icon className={`flex-shrink-0 ${a.color}`} style={{ width: "1rem", height: "1rem" }} />
                    <span className="small text-muted-foreground hover-text-foreground fw-medium">
                      {a.label}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
