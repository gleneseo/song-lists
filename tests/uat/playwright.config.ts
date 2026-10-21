import { defineConfig } from "@playwright/test";

const port = Number(process.env["UAT_PORT"] ?? 3100);

/**
 * The user acceptance tests: the app's key interactions, driven in a real
 * browser against a production build and a throwaway database (see
 * `tests/uat/support/global-setup.ts`). Run them with `npm run test:uat`.
 */
const config = defineConfig({
  testDir: ".",
  globalSetup: "./support/global-setup.ts",
  // One server and one database are shared, so tests run one at a time and
  // each makes the data it changes for itself rather than relying on order.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "../../.uat-report" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    // The Chrome installed on the machine, so there's no browser to download.
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});

export default config;
