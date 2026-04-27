import { defineConfig } from "vite";

// Force the bundle name so Forge's plugin-vite doesn't derive it from
// the entry's basename. Without this, both `src/main/index.ts` and
// `src/preload/index.ts` would emit `index.js` and overwrite each other.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ["electron"],
      output: {
        entryFileNames: "preload.js",
      },
    },
  },
});
