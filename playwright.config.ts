import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against the static export (`npm run build` first).
 * Chromium is always available; set E2E_ALL_BROWSERS=1 on a machine with WebKit/Firefox
 * installed to also run Desktop Safari, iOS Safari (WebKit) and Firefox.
 */
const all = process.env.E2E_ALL_BROWSERS === "1";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:4173", locale: "he-IL", trace: "off" },
  webServer: { command: "node scripts/serve-static.mjs out 4173", port: 4173, reuseExistingServer: true },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "android-chrome", use: { ...devices["Pixel 7"] } },
    ...(all
      ? [
          { name: "ios-safari", use: { ...devices["iPhone 14"] } },
          { name: "desktop-safari", use: { ...devices["Desktop Safari"] } },
          { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
        ]
      : []),
  ],
});
