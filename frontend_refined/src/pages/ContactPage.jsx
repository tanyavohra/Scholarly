import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { api } from "@/lib/api.js";
import { toast } from "@/components/ui/use-toast";

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
      toast({ title: "Sent", description: "Thanks — we’ll get back to you soon." });
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-1">Contact Us</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-lg">Have a question or feedback? We'd love to hear from you.</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div variants={animContainer} initial="hidden" animate="show" className="space-y-3">
          {[
            { icon: Mail, label: "Email", value: "vohratanya5@gmail.com", color: "text-primary", bg: "bg-primary/10" },
            { icon: MapPin, label: "Location", value: "Jaipur,Rajasthan", color: "text-accent", bg: "bg-accent/10" },
            { icon: Phone, label: "Linkedin", value: "www.linkedin.com/in/tanya-vohra", color: "text-scholarly-amethyst", bg: "bg-scholarly-amethyst/10" },
          ].map(c => (
            <motion.div key={c.label} variants={animItem} className="card-elevated p-5">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
                  <p className="text-sm font-semibold text-foreground">{c.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-2 card-elevated p-7">
          <h2 className="text-lg font-bold text-foreground mb-1">Send a Message</h2>
          <p className="text-xs text-muted-foreground mb-6">We'll get back to you within 24 hours.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="input-styled" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-2">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="input-styled" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Subject</label>
              <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What's this about?" className="input-styled" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">Message</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us more..." rows={5} className="input-styled resize-none" />
            </div>
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2 border-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" /> {submitting ? "Sending..." : "Send Message"}
            </motion.button>
          </form>
        </motion.div>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-bold text-foreground mb-4">Frequently Asked Questions</h2>
        <motion.div variants={animContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { q: "How do I post a question?", a: "Navigate to 'Ask Question' from the sidebar, fill in the details, and hit post!" },
            { q: "Can I upload images with questions?", a: "Yes! You can attach images to your questions for better context." },
            { q: "Is Scholarly free to use?", a: "Absolutely. Scholarly is free for all students and educators." },
            { q: "How can I contribute notes?", a: "Go to the Notes section and click 'Add Note' to share your study materials." },
          ].map((faq, i) => (
            <motion.div key={i} variants={animItem} className="card-elevated p-5">
              <h3 className="font-semibold text-foreground text-sm mb-2">{faq.q}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ContactPage;
