import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: [
    {
      command: 'npm run start:dev --workspace=nsc-events-nestjs',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        PATH: process.env.PATH || '',
        NODE_ENV: process.env.NODE_ENV || 'test',
        JWT_SECRET: process.env.JWT_SECRET || 'e2e-test-jwt-secret-key',
        POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
        POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
        POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
        POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'postgres',
        POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || 'nsc_events',
      },
    },
    {
      command: 'npm run dev --workspace=nsc-events-nextjs',
      port: 8080,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],

  // Global setup/teardown commented out because webServer already handles service readiness
  // globalSetup: require.resolve('./e2e/utils/global-setup.ts'),
  // globalTeardown: require.resolve('./e2e/utils/global-teardown.ts'),
});
