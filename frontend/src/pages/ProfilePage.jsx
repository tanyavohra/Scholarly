import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  User,
  FileText,
  HelpCircle,
  ThumbsUp,
  Award,
  MessageCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth.jsx";
import { api } from "@/lib/api.js";

const safeArray = (v) => (Array.isArray(v) ? v : []);

const ProfilePage = () => {
  const { user } = useAuth();

  const myQuestionsQuery = useQuery({
    queryKey: ["myQuestions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => safeArray(await api.get(`/api/questions/user/${encodeURIComponent(user.id)}`)),
  });

  const myNotesQuery = useQuery({
    queryKey: ["myNotes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => safeArray(await api.get(`/api/notes/user/${encodeURIComponent(user.id)}`)),
  });

  const likedQuestionsQuery = useQuery({
    queryKey: ["likedQuestions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => safeArray(await api.get(`/api/questions/liked/${encodeURIComponent(user.id)}`)),
  });

  const likedNotesQuery = useQuery({
    queryKey: ["likedNotes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => safeArray(await api.get(`/api/notes/liked/${encodeURIComponent(user.id)}`)),
  });

  const stats = useMemo(() => {
    const q = safeArray(myQuestionsQuery.data).length;
    const n = safeArray(myNotesQuery.data).length;
    const likes = safeArray(likedQuestionsQuery.data).length + safeArray(likedNotesQuery.data).length;
    return { q, n, likes };
  }, [myQuestionsQuery.data, myNotesQuery.data, likedQuestionsQuery.data, likedNotesQuery.data]);

  const recentActivity = useMemo(() => {
    const q = safeArray(myQuestionsQuery.data).map((x) => ({ type: "question", id: x.id, title: x.title }));
    const n = safeArray(myNotesQuery.data).map((x) => ({ type: "note", id: x.id, title: x.course_name }));
    return [...q, ...n].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 6);
  }, [myQuestionsQuery.data, myNotesQuery.data]);

  const badges = [
    { name: "First Question", icon: "🎯", desc: "Asked your first question" },
    { name: "Note Master", icon: "📝", desc: "Shared notes" },
    { name: "Helpful", icon: "🤝", desc: "Received likes" },
    { name: "Explorer", icon: "🔍", desc: "Explored topics" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto"
      style={{ maxWidth: "56rem" }}
    >
      <div className="card-elevated overflow-hidden">
        <div
          className="h-28 position-relative"
          style={{ background: "linear-gradient(135deg, hsl(248 73% 59%), hsl(257 50% 65%))" }}
        >
          <div
            className="position-absolute top-0 start-0 w-100 h-100 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>
        <div className="px-7 pb-7">
          <div className="d-flex align-items-end gap-3 negative-mt-10 position-relative" style={{ zIndex: 10 }}>
            <div
              className="rounded-4 bg-primary d-flex align-items-center justify-content-center shadow-lg border-4 border-white"
              style={{ width: 76, height: 76, boxShadow: "0 4px 16px hsl(245 58% 56% / 0.3)" }}
            >
              <User className="text-primary-foreground" style={{ width: "2rem", height: "2rem" }} />
            </div>
            <div className="flex-grow-1 pb-1">
              <h1 className="fs-4 fw-bold text-foreground">{user?.name || "Profile"}</h1>
              <p className="small text-muted-foreground mb-0">{user?.email || ""}</p>
            </div>
          </div>

          <div className="row g-2 mt-4">
            {[
              { icon: HelpCircle, label: "Questions", value: String(stats.q), color: "text-primary", bg: "bg-primary-10" },
              { icon: FileText, label: "Notes", value: String(stats.n), color: "text-accent", bg: "bg-accent-10" },
              { icon: ThumbsUp, label: "Likes", value: String(stats.likes), color: "text-scholarly-amethyst", bg: "bg-scholarly-amethyst-8" },
            ].map((s) => (
              <div key={s.label} className="col">
                <div className={`${s.bg} rounded-3 p-3 text-center`}>
                  <s.icon className={`flex-shrink-0 ${s.color} mx-auto mb-1`} style={{ width: "1.25rem", height: "1.25rem" }} />
                  <div className="fs-5 fw-bold text-foreground">{s.value}</div>
                  <div className="text-muted-foreground fw-medium" style={{ fontSize: "0.625rem" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row g-3 mt-4">
        <div className="col-lg-8">
          <div className="card-elevated p-4">
            <h2 className="fw-bold text-foreground mb-3">Recent Activity</h2>
            <div className="d-flex flex-column gap-1">
              {recentActivity.map((a, i) => (
                <motion.div
                  key={`${a.type}-${a.id}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="d-flex align-items-start gap-3 p-3 rounded-3 hover-muted-20"
                >
                  <div className={`d-flex align-items-center justify-content-center rounded-2 flex-shrink-0 ${a.type === "question" ? "bg-primary-10" : "bg-accent-10"}`}
                    style={{ width: "2.25rem", height: "2.25rem" }}>
                    {a.type === "question" ? (
                      <HelpCircle className="text-primary" style={{ width: "1rem", height: "1rem" }} />
                    ) : (
                      <FileText className="text-accent" style={{ width: "1rem", height: "1rem" }} />
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <p className="small fw-medium text-foreground mb-0">{a.title}</p>
                    <div className="d-flex align-items-center gap-3 mt-1 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      <span className="d-flex align-items-center gap-1">
                        <MessageCircle style={{ width: "0.75rem", height: "0.75rem" }} />
                        {a.type}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {recentActivity.length === 0 && (
                <div className="small text-muted-foreground text-center py-4">No activity yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card-elevated p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <Award className="text-scholarly-amethyst" style={{ width: "1rem", height: "1rem" }} />
              <h2 className="fw-bold text-foreground mb-0" style={{ fontSize: "1.125rem" }}>Badges</h2>
            </div>
            <div className="d-flex flex-column gap-2">
              {badges.map((b, i) => (
                <motion.div
                  key={b.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="d-flex align-items-center gap-3 p-3 rounded-3 bg-muted-20"
                >
                  <span style={{ fontSize: "1.25rem" }}>{b.icon}</span>
                  <div>
                    <p className="small fw-semibold text-foreground mb-0">{b.name}</p>
                    <p className="text-muted-foreground mb-0" style={{ fontSize: "0.625rem" }}>{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfilePage;
