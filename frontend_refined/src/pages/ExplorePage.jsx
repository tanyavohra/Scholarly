import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Tag, ArrowRight, TrendingUp, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.js";

const safeArray = (v) => (Array.isArray(v) ? v : []);

const animItem = {
  hidden: { opacity: 0, scale: 0.98 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
};
const animContainer = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };

const colorPairs = [
  { bg: "bg-primary/10", icon: "text-primary" },
  { bg: "bg-accent/10", icon: "text-accent" },
  { bg: "bg-scholarly-amethyst/10", icon: "text-scholarly-amethyst" },
  { bg: "bg-scholarly-periwinkle/10", icon: "text-scholarly-periwinkle" },
];

const ExplorePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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

  const topics = useMemo(() => {
    const tags = safeArray(tagsQuery.data);
    const rels = safeArray(questionTagsQuery.data);

    const questionIdsByTagId = new Map(); // tag_id -> Set(question_id)
    for (const r of rels) {
      const tid = r?.tag_id;
      const qid = r?.question_id;
      if (!tid || !qid) continue;
      const set = questionIdsByTagId.get(tid) || new Set();
      set.add(qid);
      questionIdsByTagId.set(tid, set);
    }

    const out = tags
      .map((t, idx) => {
        const set = questionIdsByTagId.get(t.id) || new Set();
        const questions = set.size;
        const color = colorPairs[idx % colorPairs.length];
        return {
          id: t.id,
          name: t.name,
          questions,
          colorBg: color.bg,
          colorIcon: color.icon,
        };
      })
      .sort((a, b) => b.questions - a.questions || String(a.name).localeCompare(String(b.name)));

    const trendingThresholdIndex = Math.min(6, out.length);
    const trendingIds = new Set(out.slice(0, trendingThresholdIndex).map((t) => t.id));
    return out.map((t) => ({ ...t, trending: trendingIds.has(t.id) }));
  }, [tagsQuery.data, questionTagsQuery.data]);

  const filtered = topics.filter((t) => {
    const matchesSearch = String(t.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || t.trending;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Explore Topics</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse tags and jump into questions.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="flex items-center gap-2.5 flex-1 px-4 py-2.5 rounded-xl bg-card border border-border focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <Search className="w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border-0 cursor-pointer ${
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground hover:text-foreground border border-border"
            }`}
            style={filter === "all" ? { boxShadow: "0 2px 8px hsl(245 58% 56% / 0.25)" } : {}}
          >
            All
          </button>
          <button
            onClick={() => setFilter("trending")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all border-0 cursor-pointer ${
              filter === "trending"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground hover:text-foreground border border-border"
            }`}
            style={filter === "trending" ? { boxShadow: "0 2px 8px hsl(245 58% 56% / 0.25)" } : {}}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Trending
          </button>
        </div>
      </motion.div>

      {(tagsQuery.isLoading || questionTagsQuery.isLoading) && (
        <div className="card-elevated p-6 text-sm text-muted-foreground">Loading topics...</div>
      )}

      <motion.div
        variants={animContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filtered.map((topic) => (
          <motion.div
            key={topic.id}
            variants={animItem}
            whileHover={{ y: -3 }}
            className="card-elevated p-5 cursor-pointer group"
            onClick={() => navigate(`/questions?tag=${encodeURIComponent(topic.name)}`)}
          >
            <div className="flex items-start justify-between mb-3.5">
              <div className={`w-12 h-12 rounded-xl ${topic.colorBg} flex items-center justify-center`}>
                <Tag className={`w-5 h-5 ${topic.colorIcon}`} />
              </div>
              {topic.trending && (
                <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-semibold">
                  Trending
                </span>
              )}
            </div>
            <h3 className="font-bold text-foreground text-[15px] group-hover:text-primary transition-colors">
              {topic.name}
            </h3>
            <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {topic.questions} Q&apos;s
              </span>
            </div>
            <button className="mt-4 w-full py-2.5 rounded-xl bg-muted/40 text-xs font-semibold text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-1.5 border-0 cursor-pointer">
              Explore <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && !tagsQuery.isLoading && (
        <div className="card-elevated p-14 text-center">
          <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-foreground font-semibold">No topics found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;

