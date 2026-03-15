import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from "axios";
import { API_BASE_URL } from "./config";

// Deployment-friendly: keep existing hard-coded dev URLs working, but allow override via env.
// This avoids editing dozens of call sites while still enabling real deployments.
axios.defaults.withCredentials = true;
axios.interceptors.request.use((config) => {
  const url = config?.url;
  if (typeof url === "string" && url.startsWith("http://localhost:8081")) {
    config.url = API_BASE_URL + url.slice("http://localhost:8081".length);
  }
  return config;
});

// HashRouter helper: treat root-relative <a href="/..."> links as in-app navigation.
// Without this, clicking such links on a HashRouter app loads "/..." (no hash),
// which makes the router fall back to "/" (Login) after reload.
if (typeof document !== "undefined") {
  document.addEventListener(
    "click",
    (event) => {
      const anchor = event.target?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("http://") || href.startsWith("https://")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (!href.startsWith("/")) return;
      if (anchor.target && anchor.target !== "_self") return;

      event.preventDefault();
      window.location.hash = href;
    },
    true
  );
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

