import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, HelpCircle, FileText, PlusCircle, Bookmark, User, MessageSquare, LogOut, Compass, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth.jsx";
import { toast } from "@/lib/toast.jsx";

const navItems = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/ask", icon: PlusCircle, label: "Ask Question" },
  { to: "/questions", icon: HelpCircle, label: "Questions" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/notes", icon: FileText, label: "Notes" },
  { to: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
  { to: "/pdf-chat", icon: MessageSquare, label: "PDF Chat" },
  { to: "/contact", icon: Mail, label: "Contact" },
  { to: "/profile", icon: User, label: "Profile" },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await logout();
    } catch (err) {
      toast({
        title: "Sign out failed",
        description: err?.message || "Unable to sign out.",
        variant: "destructive",
      });
    } finally {
      navigate("/", { replace: true });
    }
  };

  return (
    <aside className={`${collapsed ? "sidebar-collapsed" : "sidebar-expanded"} min-vh-100 d-flex flex-column bg-card border-end border-border position-relative`}>
      <button
        onClick={onToggle}
        className="toggle-btn position-absolute"
        style={{ right: "-0.875rem", top: "2rem" }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <div className={`p-4 pb-6 ${collapsed ? "px-3" : ""}`}>
        <Link to="/home" className="d-flex align-items-center gap-3 text-decoration-none">
          <div className="icon-avatar bg-primary shadow-sm">
            <img src="/book.png" alt="Scholarly" className="w-6 h-6" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                className="fw-bold text-foreground fs-4">
                Scholarly
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav className="flex-grow-1 px-2 d-flex flex-column gap-1">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.to;
          return (
            <motion.div key={item.to} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.25 }}>
              <Link
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`nav-link-custom ${collapsed ? "justify-content-center px-2" : ""} ${isActive ? "active" : ""}`}
              >
                <item.icon className="flex-shrink-0" style={{ width: "18px", height: "18px" }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className={`p-2 mx-2 mb-3 rounded-3 border border-border ${collapsed ? "mx-1 p-1" : ""}`}>
        <Link onClick={handleSignOut} to="/" className={`d-flex align-items-center gap-2 text-decoration-none small text-muted-foreground hover-text-destructive ${collapsed ? "justify-content-center" : ""}`}>
          <LogOut className="flex-shrink-0" style={{ width: "1rem", height: "1rem" }} />
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sign out</motion.span>}
          </AnimatePresence>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
