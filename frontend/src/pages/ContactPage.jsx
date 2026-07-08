import React from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";

const animItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const animContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const ContactPage = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto" style={{ maxWidth: "64rem" }}>
      <h1 className="fs-3 fw-bold text-foreground mb-1">Contact Us</h1>
      <p className="small text-muted-foreground mb-4" style={{ maxWidth: "32rem" }}>Have a question or feedback? We'd love to hear from you.</p>
      <div className="row g-3 justify-content-center">
        <motion.div variants={animContainer} initial="hidden" animate="show" className="col-lg-8 d-flex flex-column gap-2">
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
