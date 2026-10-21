import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*/vitest.config.ts",
      "apps/*/vitest.config.ts",
      {
        test: {
          name: "integration",
          // Both the cross-package tests at the root and the web app's own:
          // its queries and actions run against a real database here.
          include: [
            "tests/integration/**/*.test.ts",
            "apps/web-next/tests/integration/**/*.test.ts",
          ],
          globalSetup: ["./tests/integration/setup/postgres.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
        resolve: {
          // Mirrors apps/web-next's "@/*" path mapping, for the app's own
          // modules that the web app's integration tests import.
          alias: {
            "@": fileURLToPath(new URL("./apps/web-next", import.meta.url)),
          },
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
        "packages/db/src/reset-db.ts",
        "packages/db/src/run-migrations.ts",
        "packages/db/src/studio.ts",
        "apps/cli/src/index.ts",
        "apps/web-next/lib/queries/**",
        "apps/web-next/lib/actions/**",
        "apps/web-next/lib/utils.ts",
      ],
      reportsDirectory: ".coverage",
    },
  },
});
