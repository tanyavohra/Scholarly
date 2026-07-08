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
    <header className="h-16 glass-panel border-b border-border/40 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <div className="flex items-center gap-2.5 flex-1 px-4 py-2.5 rounded-xl bg-muted/40 border border-transparent focus-within:border-primary/20 focus-within:bg-card transition-all">
          <Search className="w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search questions..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/profile" className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm no-underline"
          style={{ boxShadow: '0 2px 8px hsl(245 58% 56% / 0.2)' }}>
          <User className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
};

export default Topbar;
