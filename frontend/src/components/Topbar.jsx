import React, { useState } from "react";
import { Search, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Topbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    if (!q) return;
    const dest = `/questions?q=${encodeURIComponent(q)}`;
    if (location.pathname === "/questions") {
      navigate(dest, { replace: true });
    } else {
      navigate(dest);
    }
  };

  return (
    <header className="h-16 glass-panel border-bottom border-border d-flex align-items-center justify-content-between px-6 sticky-top" style={{ zIndex: 10 }}>
      <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ maxWidth: "32rem" }}>
        <div className="search-bar">
          <Search className="flex-shrink-0 text-muted-foreground" style={{ width: "1rem", height: "1rem", opacity: 0.6 }} />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search questions..."
            className="search-input"
          />
        </div>
      </div>
      <div className="d-flex align-items-center gap-3">
        <Link to="/profile" className="d-flex align-items-center justify-content-center text-decoration-none rounded-3 bg-primary text-primary-foreground shadow-sm"
          style={{ width: "2.25rem", height: "2.25rem", boxShadow: "0 2px 8px hsl(245 58% 56% / 0.2)" }}>
          <User style={{ width: "1rem", height: "1rem" }} />
        </Link>
      </div>
    </header>
  );
};

export default Topbar;
