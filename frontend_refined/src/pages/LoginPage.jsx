import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Users, FileText, MessageSquare, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth.jsx";
import { toast } from "@/components/ui/use-toast";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [loginValues, setLoginValues] = useState({ email: "", password: "" });
  const [signupValues, setSignupValues] = useState({ name: "", email: "", password: "", confpass: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginValues.email) errs.email = "Email is required";
    if (!loginValues.password) errs.password = "Password is required";
    setErrors(errs);
    if (Object.keys(errs).length !== 0) return;

    setSubmitting(true);
    try {
      await login({ email: loginValues.email, password: loginValues.password });
      const dest = location.state?.from?.pathname || "/home";
      navigate(dest, { replace: true });
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to sign in.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!signupValues.name) errs.name = "Name is required";
    if (!signupValues.email) errs.email = "Email is required";
    if (!signupValues.password) errs.password = "Password is required";
    if (signupValues.password !== signupValues.confpass) errs.confpass = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length !== 0) return;

    setSubmitting(true);
    try {
      await signup({
        name: signupValues.name,
        email: signupValues.email,
        password: signupValues.password,
      });
      navigate("/home", { replace: true });
    } catch (err) {
      toast({
        title: "Sign up failed",
        description: err?.data?.Message || err?.data?.error || err?.message || "Unable to create account.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: Users, text: "Login or Sign Up", desc: "Join a community of curious minds" },
    { icon: FileText, text: "Share & discover notes", desc: "High-quality study materials" },
    { icon: MessageSquare, text: "Ask anything", desc: "Get answers from peers & mentors" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(160deg, hsl(248 30% 96%) 0%, hsl(220 20% 97%) 40%, hsl(132 74% 91%) 100%)" }}>
      {/* Left — Branding */}
      <div className="hidden lg:flex flex-col justify-center w-1/2 p-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center"
              style={{ boxShadow: '0 4px 16px hsl(245 58% 56% / 0.3)' }}>
              <img src="/book.png" alt="Scholarly" className="w-7 h-7 object-contain" />
            </div>
            <span className="text-2xl font-bold text-foreground">Scholarly</span>
          </div>

          <h1 className="text-5xl font-bold text-foreground leading-[1.15] mb-4">
            Connecting
            <br />
            <span className="gradient-text">minds.</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-md mb-10">
            The collaborative platform where students ask questions, share notes, and help each other excel.
          </p>

          <div className="space-y-4">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">
          <div className="card-elevated p-8 rounded-3xl">
            <div className="flex lg:hidden items-center gap-2.5 mb-8 justify-center">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <img src="/book.png" alt="Scholarly" className="w-5 h-5 object-contain" />
              </div>
              <span className="text-lg font-bold text-foreground">Scholarly</span>
            </div>

            {!isSignup ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="text-center lg:text-left">
                  <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Welcome back</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Sign in to continue</h2>
                  <p className="text-muted-foreground text-sm mt-1.5">Pick up where you left off</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
                    <input type="email" placeholder="you@university.edu" value={loginValues.email}
                      onChange={e => setLoginValues(v => ({ ...v, email: e.target.value }))} className="input-styled" />
                    {errors.email && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
                    <input type="password" placeholder="••••••••" value={loginValues.password}
                      onChange={e => setLoginValues(v => ({ ...v, password: e.target.value }))} className="input-styled" />
                    {errors.password && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.password}</p>}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? "Signing in..." : "Sign in"} <ArrowRight className="w-4 h-4" />
                </motion.button>
                <p className="text-center text-sm text-muted-foreground">
                  New here?{" "}
                  <button type="button" onClick={() => { setIsSignup(true); setErrors({}); }}
                    className="text-primary font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer">Create an account</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div className="text-center lg:text-left">
                  <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
                  <p className="text-muted-foreground text-sm mt-1.5">Join thousands of learners today</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Full name</label>
                    <input type="text" placeholder="Jane Smith" value={signupValues.name}
                      onChange={e => setSignupValues(v => ({ ...v, name: e.target.value }))} className="input-styled" />
                    {errors.name && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Email</label>
                    <input type="email" placeholder="you@university.edu" value={signupValues.email}
                      onChange={e => setSignupValues(v => ({ ...v, email: e.target.value }))} className="input-styled" />
                    {errors.email && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Password</label>
                    <input type="password" placeholder="••••••••" value={signupValues.password}
                      onChange={e => setSignupValues(v => ({ ...v, password: e.target.value }))} className="input-styled" />
                    {errors.password && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">Confirm password</label>
                    <input type="password" placeholder="••••••••" value={signupValues.confpass}
                      onChange={e => setSignupValues(v => ({ ...v, confpass: e.target.value }))} className="input-styled" />
                    {errors.confpass && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.confpass}</p>}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? "Creating..." : "Create account"} <ArrowRight className="w-4 h-4" />
                </motion.button>
                <p className="text-center text-sm">
                  <button type="button" onClick={() => { setIsSignup(false); setErrors({}); }}
                    className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 p-0 cursor-pointer">← Back to sign in</button>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
