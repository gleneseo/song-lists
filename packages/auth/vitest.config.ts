import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit-auth",
    include: ["tests/unit/**/*.test.ts"],
  },
});
