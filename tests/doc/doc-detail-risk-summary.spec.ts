/**
 * Spec 11.10 — DOC Detail: Risk Summary Tab
 *
 * Verifies Risk Summary tab navigation, summary sections, linked documents,
 * ITS control summary content, and the controls empty/non-empty state.
 *
 * Uses an existing later-stage DOC discovered from the My DOCs grid,
 * because Risk Summary is not available on the Controls Scoping seed DOC.
 */
import { test, expect } from '../../src/fixtures';
import * as allure from 'allure-js-commons';
import { type Page } from '@playwright/test';
import { LandingPage } from '../../src/pages/landing.page';
import { DocDetailsPage } from '../../src/pages/doc-details.page';

const RISK_SUMMARY_STATUSES = [
	'Completed',
	'Risk Summary Review',
	'Decision Proposal',
	'Certification Approval',
	'Actions Closure',
	'Risk Summary Re-Evaluation',
] as const;

async function openDocWithRiskSummaryTab(
	page: Page,
	landingPage: LandingPage,
	docDetailsPage: DocDetailsPage,
): Promise<string> {
	await landingPage.goto();
	await landingPage.expectPageLoaded({ timeout: 60_000 });
	await landingPage.clickTab('My DOCs');
	await landingPage.changePerPage('100');

	const rowCount = await landingPage.getGridRowCount();
	for (let rowIndex = 1; rowIndex <= rowCount; rowIndex++) {
		const rowText = await landingPage.getGridRowText(rowIndex);
		const matchedStatus = RISK_SUMMARY_STATUSES.find((status) => rowText.includes(status));

		if (!matchedStatus) {
			continue;
		}

		const docLink = landingPage.grid.getByRole('row').nth(rowIndex).getByRole('link').first();
		const href = await docLink.getAttribute('href');

		if (!href) {
			continue;
		}

		await page.goto(new URL(href, page.url()).toString(), {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await docDetailsPage.waitForOSLoad();

		// Wait for the OSUI tabs widget to fully render before checking
		// whether the Risk Summary tab is present on this DOC.
		const riskSummaryVisible = await page
			.getByRole('tab', { name: 'Risk Summary', exact: true })
			.waitFor({ state: 'visible', timeout: 30_000 })
			.then(() => true)
			.catch(() => false);
		if (riskSummaryVisible) {
			return matchedStatus;
		}

		await landingPage.goto();
		await landingPage.expectPageLoaded({ timeout: 60_000 });
		await landingPage.clickTab('My DOCs');
		await landingPage.changePerPage('100');
	}

	test.skip(true, 'No DOC with a Risk Summary tab is currently available in this environment.');
	return '';
}

test.describe('DOC - Risk Summary Tab (11.10) @regression', () => {
	test.describe.configure({ mode: 'serial' });
	test.setTimeout(240_000);

	test.beforeEach(async ({ page, loginPage, userCredentials }) => {
		await loginPage.goto();
		await loginPage.waitForPageLoad();
		await loginPage.login(userCredentials.login, userCredentials.password);
		await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
	});

	test('should display the four Risk Summary sections', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Risk Summary');
		await allure.description(
			'DOC-RISK-001: Risk Summary tab must show SDL FCSR Summary, Data Protection and Privacy Summary, ITS CONTROL SUMMARY, and CONTROLS sections.',
		);

		await test.step('Open a DOC that exposes the Risk Summary tab', async () => {
			await openDocWithRiskSummaryTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickRiskSummaryTab();
		});

		await test.step('Verify the summary sections are visible', async () => {
			await docDetailsPage.expectRiskSummarySectionsVisible();
		});
	});

	test('should show SDL FCSR summary labels and linked document', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Risk Summary');
		await allure.description(
			'DOC-RISK-002: SDL FCSR Summary must show FCSR Decision, Comments, and a visible linked summary document.',
		);

		await test.step('Open a DOC and switch to Risk Summary', async () => {
			await openDocWithRiskSummaryTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickRiskSummaryTab();
		});

		await test.step('Verify the SDL FCSR summary content', async () => {
			await docDetailsPage.expectRiskSummarySdlFcsrContentVisible();
		});
	});

	test('should show Data Protection and Privacy summary labels and linked document', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Risk Summary');
		await allure.description(
			'DOC-RISK-003: Data Protection and Privacy Summary must show PCC Decision, Comments, and a visible privacy summary document link.',
		);

		await test.step('Open a DOC and switch to Risk Summary', async () => {
			await openDocWithRiskSummaryTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickRiskSummaryTab();
		});

		await test.step('Verify the privacy summary content', async () => {
			await docDetailsPage.expectRiskSummaryPrivacyContentVisible();
		});
	});

	test('should show ITS Control Summary labels', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Risk Summary');
		await allure.description(
			'DOC-RISK-004: ITS CONTROL SUMMARY must show Overall Risk Assessment and Comment labels.',
		);

		await test.step('Open a DOC and switch to Risk Summary', async () => {
			await openDocWithRiskSummaryTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickRiskSummaryTab();
		});

		await test.step('Verify the ITS Control Summary content', async () => {
			await docDetailsPage.expectRiskSummaryItsControlSummaryVisible();
		});
	});

	test('should show controls content or the no-results state', async ({ page, landingPage, docDetailsPage }) => {
		await allure.suite('DOC / DOC Detail / Risk Summary');
		await allure.description(
			'DOC-RISK-005: CONTROLS must either list associated controls or show a No results found empty state.',
		);

		await test.step('Open a DOC and switch to Risk Summary', async () => {
			await openDocWithRiskSummaryTab(page, landingPage, docDetailsPage);
			await docDetailsPage.clickRiskSummaryTab();
		});

		await test.step('Verify the controls section state', async () => {
			const panelText = await docDetailsPage.getRiskSummaryPanelText();
			const hasNoResults = await docDetailsPage.hasRiskSummaryNoResultsMessage();

			expect(panelText).toContain('CONTROLS');
			expect(hasNoResults || !panelText.endsWith('CONTROLS')).toBe(true);
		});
	});
});
