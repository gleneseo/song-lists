import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*/vitest.config.ts",
      "apps/*/vitest.config.ts",
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./tests/integration/setup/postgres.ts"],
        },
      },
    ],
    coverage: {
      enabled: false,
      provider: "v8",
      thresholds: {
        "100": true,
      },
      reporter: [["text", { skipFull: true }], "html", "clover", "json"],
      include: ["packages/*/src/**", "apps/*/src/**", "apps/web-next/lib/**"],
      exclude: [
        "**/dist/**",
        "**/src/index.ts",
        "packages/db/src/generate-docs.ts",
        "packages/db/src/run-migrations.ts",
        "apps/cli/src/index.ts",
        // apps/web-next/lib is split by purpose: queries/ talks to a live
        // database (exercised only by manual verification, not tests) and
        // utils.ts is an unused-so-far shadcn re-export; everything else
        // under lib/ (e.g. search/) is app logic and stays covered.
        // See AGENTS.md for the full picture of what this app does and
        // doesn't cover.
        "apps/web-next/lib/queries/**",
        "apps/web-next/lib/utils.ts",
      ],
      reportsDirectory: ".coverage",
    },
  },
});
