import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit-domain",
    include: ["tests/unit/**/*.test.ts"],
  },
});
