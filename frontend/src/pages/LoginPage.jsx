import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Users, FileText, MessageSquare, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth.jsx";
import { toast } from "@/lib/toast.jsx";

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
    <div className="d-flex min-vh-100" style={{ background: "linear-gradient(160deg, hsl(248 30% 96%) 0%, hsl(220 20% 97%) 40%, hsl(132 74% 91%) 100%)" }}>
      {/* Left — Branding */}
      <div className="d-none d-lg-flex flex-column justify-content-center w-50 p-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="d-flex align-items-center gap-3 mb-10">
            <div className="d-flex align-items-center justify-content-center rounded-4 bg-primary"
              style={{ width: "3rem", height: "3rem", boxShadow: "0 4px 16px hsl(245 58% 56% / 0.3)" }}>
              <img src="/book.png" alt="Scholarly" className="w-7" style={{ height: "1.75rem", objectFit: "contain" }} />
            </div>
            <span className="fs-2 fw-bold text-foreground">Scholarly</span>
          </div>

          <h1 className="display-3 fw-bold text-foreground mb-3" style={{ lineHeight: 1.15 }}>
            Connecting<br /><span className="gradient-text">minds.</span>
          </h1>
          <p className="text-muted-foreground mb-10" style={{ maxWidth: "28rem", fontSize: "1rem", lineHeight: 1.625 }}>
            The collaborative platform where students ask questions, share notes, and help each other excel.
          </p>

          <div className="d-flex flex-column gap-3">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.12 }}
                className="d-flex align-items-center gap-4 p-4 rounded-4 bg-card-60 border border-border" style={{ backdropFilter: "blur(4px)" }}>
                <div className="d-flex align-items-center justify-content-center rounded-3 bg-primary-10 flex-shrink-0"
                  style={{ width: "2.75rem", height: "2.75rem" }}>
                  <f.icon className="text-primary" style={{ width: "1.25rem", height: "1.25rem" }} />
                </div>
                <div>
                  <p className="small fw-semibold text-foreground mb-0">{f.text}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem", marginTop: "0.125rem" }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right — Form */}
      <div className="flex-grow-1 d-flex align-items-center justify-content-center p-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ maxWidth: "28rem", width: "100%" }}>
          <div className="card-elevated p-8" style={{ borderRadius: "1.5rem" }}>
            <div className="d-lg-none d-flex align-items-center gap-2 mb-8 justify-content-center">
              <div className="d-flex align-items-center justify-content-center rounded-3 bg-primary"
                style={{ width: "2.25rem", height: "2.25rem" }}>
                <img src="/book.png" alt="Scholarly" style={{ width: "1.25rem", height: "1.25rem", objectFit: "contain" }} />
              </div>
              <span className="fw-bold text-foreground" style={{ fontSize: "1.125rem" }}>Scholarly</span>
            </div>

            {!isSignup ? (
              <form onSubmit={handleLoginSubmit} className="d-flex flex-column gap-4">
                <div className="text-center text-lg-start">
                  <div className="d-flex align-items-center gap-2 justify-content-center justify-content-lg-start mb-2">
                    <Sparkles className="text-primary" style={{ width: "1.25rem", height: "1.25rem" }} />
                    <span className="small fw-semibold text-primary text-uppercase tracking-wider">Welcome back</span>
                  </div>
                  <h2 className="fs-2 fw-bold text-foreground">Sign in to continue</h2>
                  <p className="text-muted-foreground mt-1" style={{ fontSize: "0.875rem" }}>Pick up where you left off</p>
                </div>
                <div className="d-flex flex-column gap-2">
                  <div>
                    <label className="d-block small fw-semibold text-foreground mb-1">Email</label>
                    <input type="email" placeholder="you@university.edu" value={loginValues.email}
                      onChange={e => setLoginValues(v => ({ ...v, email: e.target.value }))} className="input-styled" />
                    {errors.email && <p className="text-destructive mt-1 ms-1" style={{ fontSize: "0.75rem" }}>{errors.email}</p>}
                  </div>
                  <div>
                    <label className="d-block small fw-semibold text-foreground mb-1">Password</label>
                    <input type="password" placeholder="••••••••" value={loginValues.password}
                      onChange={e => setLoginValues(v => ({ ...v, password: e.target.value }))} className="input-styled" />
                    {errors.password && <p className="text-destructive mt-1 ms-1" style={{ fontSize: "0.75rem" }}>{errors.password}</p>}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                  disabled={submitting}
                  className="btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2">
                  {submitting ? "Signing in..." : "Sign in"} <ArrowRight style={{ width: "1rem", height: "1rem" }} />
                </motion.button>
                <p className="text-center small text-muted-foreground mb-0">
                  New here?{" "}
                  <button type="button" onClick={() => { setIsSignup(true); setErrors({}); }}
                    className="text-primary fw-semibold bg-transparent border-0 p-0" style={{ cursor: "pointer", textDecoration: "underline" }}>Create an account</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="d-flex flex-column gap-3">
                <div className="text-center text-lg-start">
                  <h2 className="fs-2 fw-bold text-foreground">Create your account</h2>
                  <p className="text-muted-foreground mt-1" style={{ fontSize: "0.875rem" }}>Join thousands of learners today</p>
                </div>
                <div className="d-flex flex-column gap-2">
                  <div>
                    <label className="d-block small fw-semibold text-foreground mb-1">Full name</label>
                    <input type="text" placeholder="Jane Smith" value={signupValues.name}
                      onChange={e => setSignupValues(v => ({ ...v, name: e.target.value }))} className="input-styled" />
                    {errors.name && <p className="text-destructive mt-1 ms-1" style={{ fontSize: "0.75rem" }}>{errors.name}</p>}
                  </div>
                  <div>
                    <label className="d-block small fw-semibold text-foreground mb-1">Email</label>
                    <input type="email" placeholder="you@university.edu" value={signupValues.email}
                      onChange={e => setSignupValues(v => ({ ...v, email: e.target.value }))} className="input-styled" />
                    {errors.email && <p className="text-destructive mt-1 ms-1" style={{ fontSize: "0.75rem" }}>{errors.email}</p>}
                  </div>
                  <div>
                    <label className="d-block small fw-semibold text-foreground mb-1">Password</label>
                    <input type="password" placeholder="••••••••" value={signupValues.password}
                      onChange={e => setSignupValues(v => ({ ...v, password: e.target.value }))} className="input-styled" />
                    {errors.password && <p className="text-destructive mt-1 ms-1" style={{ fontSize: "0.75rem" }}>{errors.password}</p>}
                  </div>
                  <div>
                    <label className="d-block small fw-semibold text-foreground mb-1">Confirm password</label>
                    <input type="password" placeholder="••••••••" value={signupValues.confpass}
                      onChange={e => setSignupValues(v => ({ ...v, confpass: e.target.value }))} className="input-styled" />
                    {errors.confpass && <p className="text-destructive mt-1 ms-1" style={{ fontSize: "0.75rem" }}>{errors.confpass}</p>}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                  disabled={submitting}
                  className="btn-primary-custom w-100 d-flex align-items-center justify-content-center gap-2">
                  {submitting ? "Creating..." : "Create account"} <ArrowRight style={{ width: "1rem", height: "1rem" }} />
                </motion.button>
                <p className="text-center small mb-0">
                  <button type="button" onClick={() => { setIsSignup(false); setErrors({}); }}
                    className="text-muted-foreground hover-text-foreground bg-transparent border-0 p-0" style={{ cursor: "pointer" }}>← Back to sign in</button>
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
