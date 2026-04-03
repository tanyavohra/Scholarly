import React from "react";
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
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl p-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(248 73% 59%), hsl(257 50% 65%))" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary-foreground/80" />
            <span className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wider">
              Dashboard
            </span>
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">Welcome back!</h1>
          <p className="text-primary-foreground/70 text-sm max-w-md mb-6">
            Explore questions, share knowledge, and connect with fellow learners.
          </p>
          <div className="flex gap-3">
            <Link
              to="/ask"
              className="px-5 py-2.5 rounded-xl bg-card text-primary font-semibold text-sm flex items-center gap-2 no-underline shadow-lg hover:shadow-xl transition-all"
            >
              Ask a Question <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/explore"
              className="px-5 py-2.5 rounded-xl bg-primary-foreground/15 text-primary-foreground font-medium text-sm flex items-center gap-2 no-underline hover:bg-primary-foreground/25 transition-all border border-primary-foreground/20"
            >
              <Compass className="w-3.5 h-3.5" /> Explore
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Top Questions</h2>
              <Link
                to="/questions"
                className="text-sm text-primary font-medium flex items-center gap-1 no-underline hover:gap-2 transition-all"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
              {topQuestions.map((q) => (
                <Link to={`/questions?open=${encodeURIComponent(q.id)}`} className="no-underline block">
                  <motion.div variants={item} className="card-elevated p-5 cursor-pointer hover:bg-muted/20 transition-colors">
                    <h3 className="font-semibold text-foreground text-sm">{q.title}</h3>
                    <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {Number(q.rating || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />{" "}
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
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> author #{q.author_id}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              ))}
              {topQuestions.length === 0 && (
                <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
                  No questions yet.
                </div>
              )}
            </motion.div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Top Notes</h2>
              <Link
                to="/notes"
                className="text-sm text-primary font-medium flex items-center gap-1 no-underline hover:gap-2 transition-all"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topNotes.map((n) => (
                <Link key={n.id} to={`/notes?open=${encodeURIComponent(n.id)}`} className="no-underline block">
                  <motion.div variants={item} className="card-elevated p-5 cursor-pointer hover:bg-muted/20 transition-colors">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">{n.course_name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.course_description}</p>
                        <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {Number(n.rating || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> author #{n.author_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
              {topNotes.length === 0 && (
                <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
                  No notes yet.
                </div>
              )}
            </motion.div>
          </section>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          <motion.div variants={item} className="card-elevated p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-foreground text-sm">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t.id} className="tag-chip flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {t.name}
                </span>
              ))}
              {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags yet.</p>}
            </div>
          </motion.div>

          <motion.div variants={item} className="card-elevated p-5">
            <h3 className="font-bold text-foreground text-sm mb-3">Quick Actions</h3>
            <div className="space-y-1">
              {[
                { to: "/ask", icon: MessageCircle, label: "Post a question", color: "text-primary" },
                { to: "/notes", icon: FileText, label: "Share study notes", color: "text-accent" },
                { to: "/bookmarks", icon: Bookmark, label: "View bookmarks", color: "text-scholarly-periwinkle" },
              ].map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors no-underline group"
                >
                  <a.icon className={`w-4 h-4 ${a.color}`} />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
