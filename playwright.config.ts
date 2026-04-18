import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  // Ensures a clean environment before every run — wipes volumes, rebuilds from scratch
  webServer: {
    command: "docker compose down --volumes --remove-orphans && docker compose up -d && tail -f /dev/null",
    url: "http://localhost",
    reuseExistingServer: !process.env.CI, // CI always starts fresh; local dev may reuse
    timeout: 240000,
  },

  // webServer starts Docker Compose; globalSetup waits for the full dependency chain
  // postgres (10s) → nestjs (60s) → nextjs (40s)
  globalSetup: require.resolve("./e2e/utils/global-setup.ts"),
  globalTeardown: require.resolve("./e2e/utils/global-teardown.ts"),
});
