/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In development the API runs on :8000; proxying keeps every request same-origin, exactly like the
// Vercel rewrite in production, so the HttpOnly auth cookies behave the same in both.
const API = process.env.VITE_DEV_API ?? "http://127.0.0.1:8000";
const proxy = { "/api": API, "/media": API, "/sitemap.xml": API };

// `vite preview` mirrors the production headers from vercel.json so local security scans are meaningful.
const vercel = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const previewHeaders = Object.fromEntries(
  vercel.headers[0].headers.filter((h) => !["Strict-Transport-Security"].includes(h.key)).map((h) => [h.key, h.value.replace("; upgrade-insecure-requests", "")]),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  // VITE_ALLOWED_HOSTS lets a local scanner container (e.g. host.docker.internal) reach `vite preview`.
  preview: { proxy, headers: previewHeaders, allowedHosts: process.env.VITE_ALLOWED_HOSTS?.split(",") },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-icons")) return "icons";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("react-markdown") || id.includes("micromark") || id.includes("mdast") || id.includes("unified")) return "markdown";
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
