import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <h1 className="text-7xl font-bold gradient-text mb-4">404</h1>
        <p className="text-xl text-foreground font-semibold mb-2">Page not found</p>
        <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/home" className="btn-primary no-underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
