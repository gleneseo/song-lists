import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit-web-next",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    // Mirrors tsconfig.json's "@/*" path mapping, which only Next's own
    // bundler resolves otherwise -- without this, importing anything under
    // lib/ via the "@/" alias fails outside of `next build`/`next dev`.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
