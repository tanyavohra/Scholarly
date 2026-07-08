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
  { bg: "bg-primary-10", icon: "text-primary" },
  { bg: "bg-accent-10", icon: "text-accent" },
  { bg: "bg-scholarly-amethyst-10", icon: "text-scholarly-amethyst" },
  { bg: "bg-scholarly-periwinkle-10", icon: "text-scholarly-periwinkle" },
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

    const questionIdsByTagId = new Map();
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
    <div className="mx-auto" style={{ maxWidth: "64rem" }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h1 className="fs-3 fw-bold text-foreground">Explore Topics</h1>
        <p className="small text-muted-foreground mt-1">Browse tags and jump into questions.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="d-flex flex-column flex-sm-row gap-3 mb-4"
      >
        <div className="search-bar flex-grow-1">
          <Search className="flex-shrink-0 text-muted-foreground" style={{ width: "1rem", height: "1rem", opacity: 0.6 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics..."
            className="search-input"
          />
        </div>
        <div className="d-flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("trending")}
            className={`filter-btn d-flex align-items-center gap-2 ${filter === "trending" ? "active" : ""}`}
          >
            <TrendingUp style={{ width: "0.875rem", height: "0.875rem" }} /> Trending
          </button>
        </div>
      </motion.div>

      {(tagsQuery.isLoading || questionTagsQuery.isLoading) && (
        <div className="card-elevated p-4 small text-muted-foreground">Loading topics...</div>
      )}

      <motion.div
        variants={animContainer}
        initial="hidden"
        animate="show"
        className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3"
      >
        {filtered.map((topic) => (
          <motion.div
            key={topic.id}
            variants={animItem}
            className="col"
          >
            <motion.div
              whileHover={{ y: -3 }}
              className="card-elevated p-4 h-100"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/questions?tag=${encodeURIComponent(topic.name)}`)}
            >
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div className={`d-flex align-items-center justify-content-center rounded-3 ${topic.colorBg}`}
                  style={{ width: "3rem", height: "3rem" }}>
                  <Tag className={`flex-shrink-0 ${topic.colorIcon}`} style={{ width: "1.25rem", height: "1.25rem" }} />
                </div>
                {topic.trending && (
                  <span className="px-2 py-1 rounded-pill bg-accent-10 text-accent" style={{ fontSize: "0.625rem", fontWeight: 600 }}>
                    Trending
                  </span>
                )}
              </div>
              <h3 className="fw-bold text-foreground hover-text-primary mb-0" style={{ fontSize: "0.9375rem", cursor: "pointer" }}>
                {topic.name}
              </h3>
              <div className="d-flex align-items-center gap-3 mt-2 text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                <span className="d-flex align-items-center gap-1">
                  <FileText style={{ width: "0.75rem", height: "0.75rem" }} />
                  {topic.questions} Q&apos;s
                </span>
              </div>
              <button className="w-100 mt-3 py-2 rounded-3 bg-muted-40 small fw-semibold text-muted-foreground hover-primary d-flex align-items-center justify-content-center gap-1 border-0"
                style={{ cursor: "pointer" }}>
                Explore <ArrowRight style={{ width: "0.75rem", height: "0.75rem" }} />
              </button>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && !tagsQuery.isLoading && (
        <div className="card-elevated p-10 text-center">
          <Search className="text-muted-foreground mx-auto mb-2" style={{ width: "2.5rem", height: "2.5rem", opacity: 0.3 }} />
          <p className="text-foreground fw-semibold mb-0">No topics found</p>
          <p className="small text-muted-foreground mt-1">Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
