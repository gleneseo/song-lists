import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit-song-metadata",
    include: ["tests/unit/**/*.test.ts"],
  },
});
