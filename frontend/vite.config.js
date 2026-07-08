import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
          });
        },
      },
      "/healthz": { target: "http://localhost:8081", changeOrigin: true },
      "/readyz": { target: "http://localhost:8081", changeOrigin: true },
      "/signup": { target: "http://localhost:8081", changeOrigin: true },
      "/login": { target: "http://localhost:8081", changeOrigin: true },
      "/logout": { target: "http://localhost:8081", changeOrigin: true },
      "/auth": { target: "http://localhost:8081", changeOrigin: true },
      "/userInfo": { target: "http://localhost:8081", changeOrigin: true },
      "/username": { target: "http://localhost:8081", changeOrigin: true },
      "/allquestions": { target: "http://localhost:8081", changeOrigin: true },
      "/question": { target: "http://localhost:8081", changeOrigin: true },
      "/allcomments": { target: "http://localhost:8081", changeOrigin: true },
      "/comment": { target: "http://localhost:8081", changeOrigin: true },
      "/vote": { target: "http://localhost:8081", changeOrigin: true },
      "/uservote": { target: "http://localhost:8081", changeOrigin: true },
      "/questionrating": { target: "http://localhost:8081", changeOrigin: true },
      "/question_tags": { target: "http://localhost:8081", changeOrigin: true },
      "/alltags": { target: "http://localhost:8081", changeOrigin: true },
      "/allnotes": { target: "http://localhost:8081", changeOrigin: true },
      "/noteupload": { target: "http://localhost:8081", changeOrigin: true },
      "/notevote": { target: "http://localhost:8081", changeOrigin: true },
      "/noterating": { target: "http://localhost:8081", changeOrigin: true },
      "/noteuservote": { target: "http://localhost:8081", changeOrigin: true },
      "/note_marked": { target: "http://localhost:8081", changeOrigin: true },
      "/note_unmarked": { target: "http://localhost:8081", changeOrigin: true },
      "/question_marked": { target: "http://localhost:8081", changeOrigin: true },
      "/question_unmarked": { target: "http://localhost:8081", changeOrigin: true },
      "/processpdf": { target: "http://localhost:8081", changeOrigin: true },
      "/processpdf/status": { target: "http://localhost:8081", changeOrigin: true },
      "/ask_question": { target: "http://localhost:8081", changeOrigin: true },
      "/top-questions": { target: "http://localhost:8081", changeOrigin: true },
      "/top-notes": { target: "http://localhost:8081", changeOrigin: true },
      "/pdf-thumbnail": { target: "http://localhost:8081", changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
});
