import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

const env = process.env.TEST_ENV || 'dev';
dotenv.config({ path: path.resolve(__dirname, `config/.env.${env}`) });

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  outputDir: './test-results',

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', {
      resultsDir: './allure-results',
      detail: true,
      suiteTitle: true,
    }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    testIdAttribute: 'data-testid',
  },

  projects: [
    // --- Setup ---
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // --- Desktop Browsers ---
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // --- Mobile ---
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },

    // --- Smoke (fast feedback) ---
    {
      name: 'smoke',
      grep: /@smoke/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
