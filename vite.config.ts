import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          query: ["@tanstack/react-query"]
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["brand/salo-symbol-favicon.svg"],
      manifest: {
        name: "Salo - friends expense ledger",
        short_name: "Salo",
        description: "One shared expense ledger for friends.",
        theme_color: "#F2F1ED",
        background_color: "#F2F1ED",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/salo-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/salo-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/salo-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      }
    })
  ]
});
