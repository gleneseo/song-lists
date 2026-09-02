import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit-db",
    include: ["tests/unit/**/*.test.ts"],
  },
});
