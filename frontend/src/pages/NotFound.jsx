import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-card">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="display-1 fw-bold gradient-text mb-4" style={{ fontSize: "4.5rem" }}>404</h1>
        <p className="fs-5 text-foreground fw-semibold mb-2">Page not found</p>
        <p className="small text-muted-foreground mb-8 mx-auto" style={{ maxWidth: "20rem" }}>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/home" className="btn-primary-custom text-decoration-none d-inline-flex align-items-center gap-2">
          <ArrowLeft style={{ width: "1rem", height: "1rem" }} /> Go Home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
