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


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

