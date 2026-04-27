import { defineConfig } from "vite";

// Force the bundle name so Forge's plugin-vite doesn't derive it from
// the entry's basename (`src/main/index.ts` → `index.js`), which would
// collide with the preload bundle that also resolves to `index.js`.
// package.json `main` and the preload path in src/main/index.ts both
// rely on these stable names.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ["electron"],
      output: {
        entryFileNames: "main.js",
      },
    },
  },
});
