/**
 * Spec 11.9 — DOC Detail: Action Plan Tab
 *
 * Verifies Action Plan tab navigation, filter controls, grid columns,
 * row links, status visibility, and search/reset behavior.
 *
 * Uses an existing later-stage DOC discovered from the My DOCs grid,
 * because Action Plan is not available on the Controls Scoping seed DOC.
 */
import { test, expect } from '../../src/fixtures';
import * as allure from 'allure-js-commons';
import { type Page } from '@playwright/test';
import { LandingPage } from '../../src/pages/landing.page';
import { DocDetailsPage } from '../../src/pages/doc-details.page';

const ACTION_PLAN_STATUSES = [
	'Completed',
	'Risk Summary Review',
	'Decision Proposal',
	'Certification Approval',
	'Actions Closure',
	'Risk Summary Re-Evaluation',
] as const;

/**
 * A known-good DOC that exposes the Action Plan tab in the QA environment.
 * Used as the first candidate before falling back to grid discovery.
 */
const KNOWN_ACTION_PLAN_DOC = 'https://qa.leap.schneider-electric.com/GRC_PICASso_DOC/DOCDetail?DOCId=538&ProductId=944';

/** Cached result — shared across all serial tests in this file. */
let cachedDocUrl: string | null | undefined = undefined; // undefined = not yet searched
let cachedDocStatus: string = '';

/**
 * Navigate to a DOC that exposes the Action Plan tab.
 * Tries a known seed DOC first; if that fails, scans the My DOCs grid.
 * The found URL is cached so subsequent serial tests navigate directly.
 */
async function openDocWithActionPlanTab(
	page: Page,
	landingPage: LandingPage,
	docDetailsPage: DocDetailsPage,
): Promise<string> {
	// Use cached result from a previous test in this serial suite.
	if (cachedDocUrl !== undefined) {
		if (cachedDocUrl === null) {
			test.skip(true, 'No DOC with an Action Plan tab is currently available in this environment.');
			return '';
		}
		await page.goto(cachedDocUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
		await docDetailsPage.waitForOSLoad();
		// OutSystems renders tabs asynchronously; wait for at least one tab to appear.
		await page.getByRole('tab').first().waitFor({ timeout: 30_000 });
		return cachedDocStatus;
	}

	// ── First call: try the known seed DOC ───────────────────────────────────
	await page.goto(KNOWN_ACTION_PLAN_DOC, { waitUntil: 'domcontentloaded', timeout: 30_000 });
	await docDetailsPage.waitForOSLoad();
	// OutSystems renders tabs asynchronously — wait up to 30 s for them to appear.
	const seedTabsReady = await page
		.getByRole('tab')
		.first()
		.waitFor({ timeout: 30_000 })
		.then(() => true)
		.catch(() => false);

	if (seedTabsReady) {
		const seedActionPlanVisible = await page
			.getByRole('tab', { name: 'Action Plan' })
			.isVisible()
			.catch(() => false);

		if (seedActionPlanVisible) {
			cachedDocUrl = page.url();
			cachedDocStatus = 'Actions Closure';
			return cachedDocStatus;
		}
	}

	// ── Fallback: scan My DOCs grid (default page, no per-page change) ───────
	await landingPage.goto();
	await landingPage.expectPageLoaded({ timeout: 60_000 });
	await landingPage.clickTab('My DOCs');

	const rowCount = await landingPage.getGridRowCount();

	// Collect all hrefs in one pass (no navigation while collecting).
	const hrefs: string[] = [];
	for (let rowIndex = 1; rowIndex <= rowCount; rowIndex++) {
		const rowText = await landingPage.getGridRowText(rowIndex);
		const isEligible = ACTION_PLAN_STATUSES.some((s) => rowText.includes(s));
		if (!isEligible) continue;

		const docLink = landingPage.grid.getByRole('row').nth(rowIndex).getByRole('link').first();
		const href = await docLink.getAttribute('href');
		if (href) hrefs.push(href);
	}

	const baseUrl = page.url();
	for (const href of hrefs) {
		await page.goto(new URL(href, baseUrl).toString(), {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await docDetailsPage.waitForOSLoad();
		// Wait for tabs to render before checking.
		const tabsReady = await page
			.getByRole('tab')
			.first()
			.waitFor({ timeout: 30_000 })
			.then(() => true)
			.catch(() => false);

		if (!tabsReady) continue;

		const actionPlanVisible = await page
			.getByRole('tab', { name: 'Action Plan' })
			.isVisible()
			.catch(() => false);

		if (actionPlanVisible) {
			cachedDocUrl = page.url();
			const rowText = await page.title().catch(() => '');
			cachedDocStatus = ACTION_PLAN_STATUSES.find((s) => rowText.includes(s)) ?? 'Actions Closure';
			return cachedDocStatus;
		}
	}

	// Nothing found.
	cachedDocUrl = null;
	test.skip(true, 'No DOC with an Action Plan tab is currently available in this environment.');
	return '';
}

test.describe('DOC - Action Plan Tab (11.9) @regression', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(240_000);

	test.beforeEach(async ({ page, loginPage, userCredentials }) => {
		await loginPage.goto();
		await loginPage.waitForPageLoad();
		await loginPage.login(userCredentials.login, userCredentials.password);
		await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
	});

	test('should display the Action Plan grid with expected columns', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Action Plan');
		await allure.description(
			'DOC-ACTIONS-001: Action Plan tab must show a grid with columns: ' +
			'Action Name, Description, Status, Due Date, Assignee, Findings.',
		);

		await test.step('Open a DOC that exposes the Action Plan tab', async () => {
			await openDocWithActionPlanTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickActionPlanTab();
		});

		await test.step('Verify Action Plan title and grid columns', async () => {
			await docDetailsPage.expectActionPlanTitleVisible();
			await docDetailsPage.expectActionPlanGridColumnHeaders();
		});
	});

	test('should show Search, Show open only, and Reset controls on Action Plan', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Action Plan');
		await allure.description(
			'DOC-ACTIONS-002: Action Plan tab must provide Search, Show open only, and Reset controls.',
		);

		await test.step('Open a DOC and switch to Action Plan', async () => {
			await openDocWithActionPlanTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickActionPlanTab();
		});

		await test.step('Verify Action Plan controls are visible', async () => {
			await docDetailsPage.expectActionPlanControlsVisible();
		});
	});

	test('should show clickable Action Name and Findings links in Action Plan rows', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Action Plan');
		await allure.description(
			'DOC-ACTIONS-003: Action rows must expose clickable Action Name and Findings links.',
		);

		await test.step('Open a DOC and switch to Action Plan', async () => {
			await openDocWithActionPlanTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickActionPlanTab();
		});

		const hasRows = await docDetailsPage.hasActionPlanRows();
		if (!hasRows) {
			test.skip(true, 'No Action Plan rows are available on the selected DOC.');
			return;
		}

		await test.step('Verify Action Name and Findings links are visible', async () => {
			await docDetailsPage.expectFirstActionNameLinkVisible();
			await docDetailsPage.expectAnyFindingLinkVisible();
		});
	});

	test('should show visible status and due-date data in Action Plan rows', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Action Plan');
		await allure.description(
			'DOC-ACTIONS-004: Action Plan rows must display status values and due-date information.',
		);

		await test.step('Open a DOC and switch to Action Plan', async () => {
			await openDocWithActionPlanTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickActionPlanTab();
		});

		const hasRows = await docDetailsPage.hasActionPlanRows();
		if (!hasRows) {
			test.skip(true, 'No Action Plan rows are available on the selected DOC.');
			return;
		}

		await test.step('Verify the first row includes status and due-date content', async () => {
			const firstRowText = await docDetailsPage.getActionPlanRowText(0);
			expect(/Open|In Progress|Closed|On Hold|Cancelled|Overdue/i.test(firstRowText)).toBe(true);
			expect(/\d{1,2}\s\w{3}\s\d{4}/.test(firstRowText)).toBe(true);
		});
	});

	test('should filter Action Plan rows with Show open only', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Action Plan');
		await allure.description(
			'DOC-ACTIONS-005: Enabling Show open only must hide Closed actions from the visible grid.',
		);

		await test.step('Open a DOC and switch to Action Plan', async () => {
			await openDocWithActionPlanTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickActionPlanTab();
		});

		const hasRows = await docDetailsPage.hasActionPlanRows();
		if (!hasRows) {
			test.skip(true, 'No Action Plan rows are available on the selected DOC.');
			return;
		}

		await test.step('Enable Show open only', async () => {
			await docDetailsPage.toggleActionPlanShowOpenOnly(true);
		});

		await test.step('Verify visible rows do not show Closed status', async () => {
			const rowCount = await docDetailsPage.getActionPlanRowCount();
			for (let index = 0; index < rowCount; index++) {
				const rowText = await docDetailsPage.getActionPlanRowText(index);
				expect(rowText).not.toContain('Closed');
			}
		});
	});

	test('should filter Action Plan rows by search and restore them with Reset', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Action Plan');
		await allure.description(
			'DOC-ACTIONS-006: Search must filter Action Plan results and Reset must restore the original grid.',
		);

		await test.step('Open a DOC and switch to Action Plan', async () => {
			await openDocWithActionPlanTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickActionPlanTab();
		});

		const hasRows = await docDetailsPage.hasActionPlanRows();
		if (!hasRows) {
			test.skip(true, 'No Action Plan rows are available on the selected DOC.');
			return;
		}

		let initialRowCount = 0;

		await test.step('Capture initial row count', async () => {
			initialRowCount = await docDetailsPage.getActionPlanRowCount();
			expect(initialRowCount).toBeGreaterThan(0);
		});

		await test.step('Search for a non-matching value', async () => {
			await docDetailsPage.searchActionPlan('ZZZ-NO-MATCH-9999');
		});

		await test.step('Verify the grid is filtered down or shows no results', async () => {
			const filteredRowCount = await docDetailsPage.getActionPlanRowCount();
			const noResultsVisible = await docDetailsPage.hasActionPlanNoResultsMessage();
			expect(noResultsVisible || filteredRowCount === 0 || filteredRowCount < initialRowCount).toBe(true);
		});

		await test.step('Reset filters and verify rows are restored', async () => {
			await docDetailsPage.resetActionPlanFilters();
			const restoredRowCount = await docDetailsPage.getActionPlanRowCount();
			expect(restoredRowCount).toBeGreaterThanOrEqual(initialRowCount);
		});
	});
});
