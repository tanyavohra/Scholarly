import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { api } from "@/lib/api.js";
import { toast } from "@/lib/toast.jsx";

const animItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const animContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/api/contact", form);
      if (res?.Status !== "Success") {
        const message =
          res?.Message || res?.error || (typeof res === "string" ? res : "") || "Failed to submit message.";
        throw new Error(String(message));
      }
      toast({ title: "Sent", description: "Thanks — we'll get back to you soon." });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      toast({
        title: "Send failed",
        description: err?.data?.error || err?.message || "Unable to send message.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto" style={{ maxWidth: "64rem" }}>
      <h1 className="fs-3 fw-bold text-foreground mb-1">Contact Us</h1>
      <p className="small text-muted-foreground mb-4" style={{ maxWidth: "32rem" }}>Have a question or feedback? We'd love to hear from you.</p>
      <div className="row g-3">
        <motion.div variants={animContainer} initial="hidden" animate="show" className="col-lg-4 d-flex flex-column gap-2">
          {[
            { icon: Mail, label: "Email", value: "vohratanya5@gmail.com", color: "text-primary", bg: "bg-primary-10" },
            { icon: MapPin, label: "Location", value: "Jaipur,Rajasthan", color: "text-accent", bg: "bg-accent-10" },
            { icon: Phone, label: "Linkedin", value: "www.linkedin.com/in/tanya-vohra", color: "text-scholarly-amethyst", bg: "bg-scholarly-amethyst-10" },
          ].map(c => (
            <motion.div key={c.label} variants={animItem} className="card-elevated p-4">
              <div className="d-flex align-items-center gap-3">
                <div className={`d-flex align-items-center justify-content-center rounded-3 ${c.bg}`}
                  style={{ width: "2.75rem", height: "2.75rem" }}>
                  <c.icon className={`flex-shrink-0 ${c.color}`} style={{ width: "1.25rem", height: "1.25rem" }} />
                </div>
                <div>
                  <p className="text-muted-foreground fw-medium mb-0" style={{ fontSize: "0.75rem" }}>{c.label}</p>
                  <p className="fw-semibold text-foreground mb-0" style={{ fontSize: "0.875rem" }}>{c.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="col-lg-8">
          <div className="card-elevated p-6">
            <h2 className="fw-bold text-foreground mb-1" style={{ fontSize: "1.125rem" }}>Send a Message</h2>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "0.75rem" }}>We'll get back to you within 24 hours.</p>
            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="d-block small fw-semibold text-foreground mb-2">Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="input-styled" />
                </div>
                <div className="col-sm-6">
                  <label className="d-block small fw-semibold text-foreground mb-2">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="input-styled" />
                </div>
              </div>
              <div>
                <label className="d-block small fw-semibold text-foreground mb-2">Subject</label>
                <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What's this about?" className="input-styled" />
              </div>
              <div>
                <label className="d-block small fw-semibold text-foreground mb-2">Message</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us more..." rows={5} className="input-styled resize-none" />
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                disabled={submitting}
                className="btn-primary-custom d-inline-flex align-items-center gap-2 border-0"
                style={{ alignSelf: "flex-start" }}>
                <Send style={{ width: "1rem", height: "1rem" }} /> {submitting ? "Sending..." : "Send Message"}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
      <div className="mt-4">
        <h2 className="fw-bold text-foreground mb-3" style={{ fontSize: "1.125rem" }}>Frequently Asked Questions</h2>
        <motion.div variants={animContainer} initial="hidden" animate="show" className="row row-cols-1 row-cols-md-2 g-2">
          {[
            { q: "How do I post a question?", a: "Navigate to 'Ask Question' from the sidebar, fill in the details, and hit post!" },
            { q: "Can I upload images with questions?", a: "Yes! You can attach images to your questions for better context." },
            { q: "Is Scholarly free to use?", a: "Absolutely. Scholarly is free for all students and educators." },
            { q: "How can I contribute notes?", a: "Go to the Notes section and click 'Add Note' to share your study materials." },
          ].map((faq, i) => (
            <motion.div key={i} variants={animItem} className="col">
              <div className="card-elevated p-4 h-100">
                <h3 className="fw-semibold text-foreground small mb-2">{faq.q}</h3>
                <p className="text-muted-foreground mb-0" style={{ fontSize: "0.75rem", lineHeight: 1.625 }}>{faq.a}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ContactPage;
