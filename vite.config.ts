import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      "~shared": path.resolve(__dirname, "src/shared"),
      "~pages": path.resolve(__dirname, "src/pages"),
    },
  },
});
