import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit-web-next",
    include: ["tests/unit/**/*.test.ts"],
  },
});
