/**
 * Spec 11.11 — DOC Detail: Certification Decision Tab
 *
 * Verifies that the Certification Decision tab is present and functional
 * for eligible DOC stages: Propose / Edit decision, Submit for Approval,
 * Risk Summary cards, Unresolved Findings, and DOC Approvals.
 *
 * Uses an existing later-stage DOC discovered from the My DOCs grid.
 * Tests that require a specific status (Decision Proposal, Certification Approval)
 * pass a `requiredStatuses` filter to the helper; others accept any eligible status.
 */
import { test, expect } from '../../src/fixtures';
import * as allure from 'allure-js-commons';
import { type Page } from '@playwright/test';
import { LandingPage } from '../../src/pages/landing.page';
import { DocDetailsPage } from '../../src/pages/doc-details.page';

// Any status that makes the Certification Decision tab reachable
const CERT_DECISION_STATUSES = [
	'Decision Proposal',
	'Certification Approval',
	'Actions Closure',
	'Completed',
] as const;

// Statuses that place the DOC on the "Issue Certification" stage (richest cert-decision content)
const ISSUE_CERT_STATUSES = ['Decision Proposal', 'Certification Approval'] as const;

async function openDocWithCertDecisionTab(
	page: Page,
	landingPage: LandingPage,
	docDetailsPage: DocDetailsPage,
	requiredStatuses: readonly string[] = CERT_DECISION_STATUSES,
): Promise<string> {
	await landingPage.goto();
	await landingPage.expectPageLoaded({ timeout: 60_000 });
	await landingPage.clickTab('My DOCs');
	await landingPage.changePerPage('100');

	const rowCount = await landingPage.getGridRowCount();
	for (let rowIndex = 1; rowIndex <= rowCount; rowIndex++) {
		const rowText = await landingPage.getGridRowText(rowIndex);
		const matchedStatus = requiredStatuses.find((status) => rowText.includes(status));

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

		// Wait for the OSUI tabs widget to fully render (tabs are rendered
		// asynchronously by OutSystems after OS screen-load clears).
		// We wait up to 30 s for the first content tab to appear, then
		// check whether the Certification Decision tab is among them.
		// OutSystems OSUI tabs render asynchronously; measured render time
		// is ~14–15 s, so 30 s gives a healthy margin.
		const tabVisible = await page
			.getByRole('tab', { name: 'Certification Decision' })
			.waitFor({ state: 'visible', timeout: 30_000 })
			.then(() => true)
			.catch(() => false);
		if (tabVisible) {
			return matchedStatus;
		}

		// Tab not available on this DOC — navigate back and keep searching
		await landingPage.goto();
		await landingPage.expectPageLoaded({ timeout: 60_000 });
		await landingPage.clickTab('My DOCs');
		await landingPage.changePerPage('100');
	}

	test.skip(
		true,
		`No DOC in [${requiredStatuses.join(', ')}] with a Certification Decision tab is currently available in this environment.`,
	);
	return '';
}

test.describe('DOC - Certification Decision Tab (11.11) @regression', () => {
	// Each test independently logs in (via beforeEach) and scans My DOCs,
	// so serial mode is NOT used here — it would cause cascade-skips when
	// running a subset of tests with --grep.
	test.setTimeout(240_000);

	test.beforeEach(async ({ page, loginPage, userCredentials }) => {
		await loginPage.goto();
		await loginPage.waitForPageLoad();
		await loginPage.login(userCredentials.login, userCredentials.password);
		await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
	});

	test('should display the Certification Decision tab for eligible DOC stages', async ({
		page,
		landingPage,
		docDetailsPage,
	}) => {
		await allure.suite('DOC / DOC Detail / Certification Decision');
		await allure.description(
			'DOC-CERT-001: The Certification Decision tab must be present on DOCs that have reached the Issue Certification pipeline stage or later (Decision Proposal, Certification Approval, Actions Closure, Completed).',
		);

		await test.step('Open a DOC in an eligible stage', async () => {
			await openDocWithCertDecisionTab(page, landingPage, docDetailsPage);
		});

		await test.step('Click the Certification Decision tab', async () => {
			await docDetailsPage.clickCertificationDecisionTab();
		});

		await test.step('Verify the Certification Decision tab is active', async () => {
			const ariaSelected = await page
				.getByRole('tab', { name: 'Certification Decision' })
				.getAttribute('aria-selected');
			expect(ariaSelected).toBe('true');
		});
	});

	test('should show Propose Decision or Edit button in Decision Proposal status', async ({
		page,
		landingPage,
		docDetailsPage,
	}) => {
		await allure.suite('DOC / DOC Detail / Certification Decision');
		await allure.description(
			'DOC-CERT-002: In Decision Proposal status, the Certification Decision tab must show a "Propose Decision" button (when no decision is set) or an "Edit" button (when a decision has already been saved).',
		);

		await test.step('Open a DOC in Decision Proposal status', async () => {
			await openDocWithCertDecisionTab(page, landingPage, docDetailsPage, ['Decision Proposal']);
			await docDetailsPage.clickCertificationDecisionTab();
		});

		await test.step('Verify the decision action button is visible', async () => {
			await docDetailsPage.expectProposeOrEditDecisionButtonVisible();
		});
	});

	test('should show Submit for Approval button in Decision Proposal status', async ({
		page,
		landingPage,
		docDetailsPage,
	}) => {
		await allure.suite('DOC / DOC Detail / Certification Decision');
		await allure.description(
			'DOC-CERT-003: In Decision Proposal status, the "Submit for Approval" button must be visible on the Certification Decision tab (it may be disabled until a Proposed Decision is set).',
		);

		await test.step('Open a DOC in Decision Proposal status', async () => {
			await openDocWithCertDecisionTab(page, landingPage, docDetailsPage, ['Decision Proposal']);
			await docDetailsPage.clickCertificationDecisionTab();
		});

		await test.step('Verify the Submit for Approval button is visible', async () => {
			await docDetailsPage.expectSubmitForApprovalButtonVisible();
		});
	});

	test('should show Risk Summary cards on the Certification Decision tab', async ({
		page,
		landingPage,
		docDetailsPage,
	}) => {
		await allure.suite('DOC / DOC Detail / Certification Decision');
		await allure.description(
			'DOC-CERT-004: During the Issue Certification stage (Decision Proposal or Certification Approval), the Certification Decision tab must display the three Risk Summary cards: ITS Control Summary, SDL FCSR Summary, and Data Protection and Privacy Summary.',
		);

		await test.step('Open a DOC in an Issue Certification stage', async () => {
			await openDocWithCertDecisionTab(page, landingPage, docDetailsPage, ISSUE_CERT_STATUSES);
			await docDetailsPage.clickCertificationDecisionTab();
		});

		await test.step('Verify the three Risk Summary cards are visible', async () => {
			await docDetailsPage.expectCertRiskSummaryCardsVisible();
		});
	});

	test('should show Unresolved Findings section or empty state', async ({
		page,
		landingPage,
		docDetailsPage,
	}) => {
		await allure.suite('DOC / DOC Detail / Certification Decision');
		await allure.description(
			'DOC-CERT-005: During the Issue Certification stage, the Certification Decision tab must display an Unresolved Findings section (with a grid of findings, or a "No results found" empty state).',
		);

		await test.step('Open a DOC in an Issue Certification stage', async () => {
			await openDocWithCertDecisionTab(page, landingPage, docDetailsPage, ISSUE_CERT_STATUSES);
			await docDetailsPage.clickCertificationDecisionTab();
		});

		await test.step('Verify the Unresolved Findings section is present', async () => {
			await docDetailsPage.expectUnresolvedFindingsSectionVisible();
		});

		await test.step('Verify findings grid or empty state is shown', async () => {
			const hasGrid = await docDetailsPage.hasUnresolvedFindingsGrid();
			const hasNoResults = await page
				.getByText('No results found')
				.first()
				.isVisible()
				.catch(() => false);
			expect(
				hasGrid || hasNoResults,
				'Expected either a findings grid or a "No results found" message to be visible',
			).toBe(true);
		});
	});

	test('should show DOC Approvals section in Certification Approval status', async ({
		page,
		landingPage,
		docDetailsPage,
	}) => {
		await allure.suite('DOC / DOC Detail / Certification Decision');
		await allure.description(
			'DOC-CERT-006: In Certification Approval status, the Certification Decision tab must display a DOC Approvals section listing the assigned approvers.',
		);

		await test.step('Open a DOC in Certification Approval status', async () => {
			await openDocWithCertDecisionTab(page, landingPage, docDetailsPage, [
				'Certification Approval',
			]);
			await docDetailsPage.clickCertificationDecisionTab();
		});

		await test.step('Verify the DOC Approvals section is visible', async () => {
			await docDetailsPage.expectDocApprovalsSectionVisible();
		});
	});
});
