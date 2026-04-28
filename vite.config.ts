import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// Base path: GitHub Pages serves at /<repo>/, configurable via env so other
// hosts (Vercel, Cloudflare Pages) keep using "/".
// @ts-expect-error process is a nodejs global
const basePath = process.env.VITE_BASE_PATH || "/";

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  base: basePath,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
