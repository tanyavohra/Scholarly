const runtimeOrigin =
  typeof window !== "undefined" && window.location && window.location.origin
    ? window.location.origin
    : "http://localhost:8081";

// If REACT_APP_API_BASE_URL is unset, default to same-origin at runtime.
// This is ideal for deployments where the frontend host reverse-proxies API routes.
export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || runtimeOrigin).replace(/\/+$/, "");
