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
      className="max-w-4xl mx-auto"
    >
      <div className="card-elevated p-0 overflow-hidden">
        <div
          className="h-28 relative"
          style={{ background: "linear-gradient(135deg, hsl(248 73% 59%), hsl(257 50% 65%))" }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>
        <div className="px-7 pb-7">
          <div className="flex items-end gap-4 -mt-10 relative z-10">
            <div
              className="rounded-2xl bg-primary flex items-center justify-center shadow-lg border-4 border-card"
              style={{ width: 76, height: 76, boxShadow: "0 4px 16px hsl(245 58% 56% / 0.3)" }}
            >
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1 pb-1">
              <h1 className="text-xl font-bold text-foreground">{user?.name || "Profile"}</h1>
              <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: HelpCircle, label: "Questions", value: String(stats.q), color: "text-primary", bg: "bg-primary/8" },
              { icon: FileText, label: "Notes", value: String(stats.n), color: "text-accent", bg: "bg-accent/8" },
              { icon: ThumbsUp, label: "Likes", value: String(stats.likes), color: "text-scholarly-amethyst", bg: "bg-scholarly-amethyst/8" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1.5`} />
                <div className="text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] text-muted-foreground font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <div className="lg:col-span-2 card-elevated p-6">
          <h2 className="font-bold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {recentActivity.map((a, i) => (
              <motion.div
                key={`${a.type}-${a.id}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-muted/30 transition-colors"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.type === "question" ? "bg-primary/10" : "bg-accent/10"}`}>
                  {a.type === "question" ? (
                    <HelpCircle className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-accent" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {a.type}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">No activity yet.</div>
            )}
          </div>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-scholarly-amethyst" />
            <h2 className="font-bold text-foreground">Badges</h2>
          </div>
          <div className="space-y-3">
            {badges.map((b, i) => (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20"
              >
                <span className="text-xl">{b.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfilePage;
