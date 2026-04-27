import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Don't pre-bundle our workspace packages. Vite caches the pre-bundled
  // version under node_modules/.vite/deps/ keyed by content hash; when the
  // package gains a new export, Vite doesn't always invalidate that cache,
  // leading to "module does not provide an export named X" errors. Excluding
  // them means Vite serves the source straight from the workspace path,
  // picking up changes immediately.
  optimizeDeps: {
    exclude: ["@desktop-studio/core", "@desktop-studio/design"],
  },
});
