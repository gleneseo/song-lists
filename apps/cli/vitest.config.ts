import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit-cli",
    include: ["tests/unit/**/*.test.ts"],
  },
});
