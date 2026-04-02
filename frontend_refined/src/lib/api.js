const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function buildUrl(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function parseResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
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

  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["Content-Type"] = init.headers["Content-Type"] || "application/json";
  }

  const res = await fetch(url, init);
  const data = await parseResponse(res);

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.Message)) ||
      (typeof data === "string" ? data : "") ||
      res.statusText ||
      "Request failed";
    throw new ApiError(String(message), { status: res.status, data, url });
  }

  return data;
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  postForm: (path, formData) => apiRequest(path, { method: "POST", formData }),
};

