import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Backend address for the dev proxy. Override with:  $env:VITE_API="http://127.0.0.1:8001"
const API = process.env.VITE_API ?? "http://127.0.0.1:8000"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  optimizeDeps: { exclude: ["maplibre-gl"] },
  server: { port: 5173, proxy: { "/api": API, "/docs": API, "/openapi.json": API } },
  build: {
    // Workspace tabs are lazy-loaded, so one chunk per tab is expected.
    // three.js alone is ~590 kB (149 kB gzip) and only downloads when the
    // 3D Digital Twin tab is opened, so warn above that rather than below.
    chunkSizeWarningLimit: 650,
  },
})
