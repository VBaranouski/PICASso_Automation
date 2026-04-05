import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { getEnvironment } from './config/environments';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const environment = getEnvironment(process.env.TEST_ENV);
const projectRoot = __dirname;

export default defineConfig({
	testDir: path.resolve(projectRoot, 'tests'),
	timeout: 30_000,
	expect: { timeout: 10_000 },
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 4 : undefined,
	outputDir: path.resolve(projectRoot, 'test-results'),

	reporter: [
		['list'],
		['html', { outputFolder: path.resolve(projectRoot, 'playwright-report'), open: 'never' }],
		['allure-playwright', {
			resultsDir: path.resolve(projectRoot, 'allure-results'),
			detail: true,
			suiteTitle: true,
		}],
		['json', { outputFile: path.resolve(projectRoot, 'test-results/results.json') }],
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
		{
			name: 'setup',
			testMatch: /.*\.setup\.ts/,
			// Exclude the DOC-specific state setup — it has its own project with dependencies
			testIgnore: [/doc-state\.setup\.ts/],
		},
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
			dependencies: ['doc-product-setup'],
		},
		// Scans My DOCs tab for a Controls Scoping DOC and persists its URL to .doc-state.json.
		// All DOC detail specs depend on this project.
		{
			name: 'doc-state-setup',
			testMatch: /doc-state\.setup\.ts/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['doc-initiation'],
		},
		// ── DOC tab specs (each depends on the previous to preserve logical order) ──────
		{
			name: 'doc-my-docs-tab',
			testMatch: /my-docs-tab\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['doc-state-setup'],
		},
		{
			name: 'doc-detail-header',
			testMatch: /doc-detail\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['doc-state-setup'],
		},
		{
			name: 'doc-detail-offer',
			testMatch: /doc-detail-offer\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['doc-state-setup'],
		},
		{
			name: 'doc-detail-roles',
			testMatch: /doc-detail-roles\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['doc-state-setup'],
		},
		{
			name: 'doc-detail-its',
			testMatch: /doc-detail-its\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['doc-state-setup'],
		},
		{
			name: 'doc-control-detail',
			testMatch: /control-detail\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['doc-detail-its'],
		},
		{
			name: 'doc-history',
			testMatch: /doc-history\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['doc-state-setup'],
		},
		{
			name: 'doc-detail-actions',
			testMatch: /doc-detail-actions\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'doc-detail-risk-summary',
			testMatch: /doc-detail-risk-summary\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'doc-detail-certification',
			testMatch: /doc-detail-certification\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'doc-lifecycle',
			testMatch: /doc-lifecycle\.spec\.ts/,
			use: { ...devices['Desktop Chrome'] },
		},
		// ────────────────────────────────────────────────────────────────────────────────
		{
			name: 'chromium',
			testIgnore: [
				/new-product-creation-digital-offer\.spec\.ts/,
				/initiate-doc\.spec\.ts/,
				/doc-state\.setup\.ts/,
				/my-docs-tab\.spec\.ts/,
				/doc-detail\.spec\.ts/,
				/doc-detail-offer\.spec\.ts/,
				/doc-detail-roles\.spec\.ts/,
				/doc-detail-its\.spec\.ts/,
				/control-detail\.spec\.ts/,
				/doc-history\.spec\.ts/,
				/doc-detail-actions\.spec\.ts/,
				/doc-detail-risk-summary\.spec\.ts/,
				/doc-detail-certification\.spec\.ts/,
				/doc-lifecycle\.spec\.ts/,
			],
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup'],
		},
		{
			name: 'smoke',
			grep: /@smoke/,
			testIgnore: [
				/new-product-creation-digital-offer\.spec\.ts/,
				/initiate-doc\.spec\.ts/,
				/doc-state\.setup\.ts/,
			],
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup'],
		},
	],
});
