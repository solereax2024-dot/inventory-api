import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "../src/main/resources/static",
    emptyOutDir: true,
    chunkSizeWarningLimit: 650, // Increased from 500kB default
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only separate React into its own chunk to avoid circular deps
          if (id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Let everything else stay in main bundle or be auto-split
        }
      }
    }
  }
});
