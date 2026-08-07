import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      thresholds: {
        "100": true,
      },
      include: ["src"],
      exclude: ["dist", "src/index.ts", "src/scripts"],
      reportsDirectory: ".coverage",
    },
  },
});
