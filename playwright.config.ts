import { defineConfig, devices } from "@playwright/test";

// Playwright config for M0 — smoke tests against the public storefront.
//
// No auth is required on customer routes, so meaningful E2E coverage is
// achievable without storage-state setup. Admin flows are gated by a
// shared password and need either a one-time login → saved storageState
// or an explicit ADMIN_PASSWORD env; deferring to a follow-up.
//
// The dev server uses `npm run dev` so the project's .env.local applies.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
