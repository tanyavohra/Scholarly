import { defineConfig } from "vite";
import type { ProxyOptions } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Server as HttpProxyServer } from "http-proxy";
import type { ClientRequest } from "http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const backendProxy: ProxyOptions = {
    target: "http://localhost:8081",
    changeOrigin: true,
    configure: (proxy: HttpProxyServer) => {
      proxy.on("proxyReq", (proxyReq: ClientRequest) => {
        // Make backend treat this as a non-browser client (server-side proxy),
        // so we don't depend on CORS allowlists in local dev.
        proxyReq.removeHeader("origin");
      });
    },
  };

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/api": backendProxy,
        "/healthz": backendProxy,
        "/readyz": backendProxy,
        "/signup": backendProxy,
        "/login": backendProxy,
        "/logout": backendProxy,
        "/auth": backendProxy,
        "/userInfo": backendProxy,
        "/username": backendProxy,
        "/allquestions": backendProxy,
        "/question": backendProxy,
        "/allcomments": backendProxy,
        "/comment": backendProxy,
        "/vote": backendProxy,
        "/uservote": backendProxy,
        "/questionrating": backendProxy,
        "/question_tags": backendProxy,
        "/alltags": backendProxy,
        "/allnotes": backendProxy,
        "/noteupload": backendProxy,
        "/notevote": backendProxy,
        "/noterating": backendProxy,
        "/noteuservote": backendProxy,
        "/note_marked": backendProxy,
        "/note_unmarked": backendProxy,
        "/question_marked": backendProxy,
        "/question_unmarked": backendProxy,
        "/processpdf": backendProxy,
        "/processpdf/status": backendProxy,
        "/ask_question": backendProxy,
        "/top-questions": backendProxy,
        "/top-notes": backendProxy,
        "/pdf-thumbnail": backendProxy,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
  };
});
