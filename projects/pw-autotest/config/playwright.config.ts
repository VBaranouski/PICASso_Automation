import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { getEnvironment } from './environments';

// Load shared secrets from monorepo root .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const environment = getEnvironment(process.env.TEST_ENV);

export default defineConfig({
  testDir: '../tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  outputDir: '../test-results',

  reporter: [
    ['list'],
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
    ['allure-playwright', {
      resultsDir: '../allure-results',
      detail: true,
      suiteTitle: true,
    }],
    ['json', { outputFile: '../test-results/results.json' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || environment.baseUrl,
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

    // --- DOC flow: product creation must run before DOC initiation ---
    {
      name: 'doc-product-setup',
      testMatch: /new-product-creation-digital-offer\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'doc-initiation',
      testMatch: /initiate-doc\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // --- Desktop Browsers ---
    {
      name: 'chromium',
      testIgnore: [/new-product-creation-digital-offer\.spec\.ts/, /initiate-doc\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // --- Smoke (fast feedback) ---
    {
      name: 'smoke',
      grep: /@smoke/,
      testIgnore: [/new-product-creation-digital-offer\.spec\.ts/, /initiate-doc\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
