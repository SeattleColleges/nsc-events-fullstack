import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost";
const apiURL = process.env.PLAYWRIGHT_API_URL || "http://localhost";

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

  // Start Docker Compose services if not already running,
  // services are accessible at http://localhost (port 80) via Traefik proxy
  webServer: {
    command: "docker compose up -d && tail -f /dev/null",
    url: "http://localhost",
    reuseExistingServer: true, // Don't restart if services are already running
    timeout: 240000,
  },

  // Global setup/teardown commented out because webServer already handles service readiness
  // globalSetup: require.resolve('./e2e/utils/global-setup.ts'),
  // globalTeardown: require.resolve('./e2e/utils/global-teardown.ts'),
});
