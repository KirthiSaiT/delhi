import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Backend address for the dev proxy. Override with:  $env:VITE_API="http://127.0.0.1:8001"
const API = process.env.VITE_API ?? "http://127.0.0.1:8000"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  optimizeDeps: { exclude: ["maplibre-gl"] },
  server: { port: 5173, proxy: { "/api": API, "/docs": API, "/openapi.json": API } },
})
