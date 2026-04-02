import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, HelpCircle, FileText, PlusCircle, Bookmark, User, MessageSquare, LogOut, Compass, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth.jsx";
import { toast } from "@/components/ui/use-toast";

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
    <aside className={`${collapsed ? "w-[72px]" : "w-64"} min-h-screen flex flex-col bg-card border-r border-border/50 transition-all duration-300 relative`}>
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-8 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all z-20 shadow-md cursor-pointer"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <div className={`p-5 pb-6 ${collapsed ? "px-4" : ""}`}>
        <Link to="/home" className="flex items-center gap-3 no-underline">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shrink-0"
            style={{ boxShadow: '0 4px 12px hsl(245 58% 56% / 0.3)' }}>
            <img src="/book.png" alt="Scholarly" className="w-6 h-6 object-contain" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                className="text-xl font-bold text-foreground tracking-tight">
                Scholarly
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.to;
          return (
            <motion.div key={item.to} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.25 }}>
              <Link
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-3.5"} py-2.5 rounded-xl text-sm font-medium transition-all no-underline relative ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
                style={isActive ? { boxShadow: '0 2px 8px hsl(245 58% 56% / 0.25)' } : {}}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0`} />
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

      <div className={`p-3 mx-3 mb-4 rounded-xl border border-border/50 ${collapsed ? "mx-2 p-2" : ""}`}>
        <Link onClick={handleSignOut} to="/" className={`flex items-center gap-2.5 text-sm text-muted-foreground hover:text-destructive transition-colors no-underline ${collapsed ? "justify-center" : ""}`}>
          <LogOut className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sign out</motion.span>}
          </AnimatePresence>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
