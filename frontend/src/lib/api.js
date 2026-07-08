const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

function looksLikeHtml(text) {
  const s = String(text || "").trimStart().slice(0, 200).toLowerCase();
  return s.startsWith("<!doctype html") || s.startsWith("<html") || s.includes("<head") || s.includes("<body");
}

async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      // Some upstreams return empty bodies with JSON content-type.
      return null;
    }
  }
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export class ApiError extends Error {
  constructor(message, { status, data, url } = {}) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.url = url;
  }
}

export async function apiRequest(path, { method = "GET", body, formData, headers } = {}) {
  const url = buildUrl(path);
  const init = {
    method,
    credentials: "include",
    headers: { ...(headers || {}) },
  };

  // Avoid browser/proxy caching for polling endpoints (prevents 304/empty bodies).
  if (String(method || "GET").toUpperCase() === "GET") {
    init.cache = "no-store";
    init.headers["Cache-Control"] = init.headers["Cache-Control"] || "no-cache";
  }

  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = init.headers["Content-Type"] || "application/json";
  }

  const res = await fetch(url, init);
  const data = await parseResponse(res);

  if (!res.ok) {
    let message =
      (data && typeof data === "object" && (data.error || data.Message)) ||
      (typeof data === "string" ? data : "") ||
      res.statusText ||
      "Request failed";

    if (typeof message === "string" && looksLikeHtml(message)) {
      message =
        res.status === 502 || res.status === 503 || res.status === 504
          ? "Bad gateway (backend temporarily unavailable). Please retry."
          : "Unexpected HTML response from server.";
    } else if (typeof message === "string") {
      message = message.trim();
      if (message.length > 2000) message = `${message.slice(0, 2000)}…`;
      if (!message) message = res.statusText || "Request failed";
    }

    throw new ApiError(String(message), { status: res.status, data, url });
  }

  return data;
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  postForm: (path, formData) => apiRequest(path, { method: "POST", formData }),
};

