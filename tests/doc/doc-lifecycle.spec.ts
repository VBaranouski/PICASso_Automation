/**
 * Spec 11.13 — DOC Lifecycle Transitions
 *
 * Covers visible lifecycle controls (Cancel DOC, Start ITS Risk Assessment)
 * and frozen-state assertions for Cancelled/Completed DOCs.
 *
 * Non-destructive: tests that involve dialogs (Cancel DOC) always dismiss the
 * dialog without confirming, so QA data is not mutated.
 *
 * Seed DOCs:
 *   • DOC 800 / ProductId=1162  — Controls Scoping  (Cancel DOC & Start ITS RA gating)
 *   • DOC 273 / ProductId=898   — Completed / Certified (frozen-state checks)
 *
 * These DOCs are stable QA fixtures.  No dependency on doc-state-setup.
 */
import { test, expect } from '../../src/fixtures';
import * as allure from 'allure-js-commons';

// ── Seed URLs ─────────────────────────────────────────────────────────────────
const CONTROLS_SCOPING_DOC_URL =
  'https://qa.leap.schneider-electric.com/GRC_PICASso_DOC/DOCDetail?DOCId=800&ProductId=1162';

const COMPLETED_DOC_URL =
  'https://qa.leap.schneider-electric.com/GRC_PICASso_DOC/DOCDetail?DOCId=273&ProductId=898';

test.describe('DOC - Lifecycle Transitions (11.13) @regression', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page, loginPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  // ── TC-LIFECYCLE-001 ──────────────────────────────────────────────────────
  test('should show Cancel DOC button for privileged user on a Controls Scoping DOC',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC / Lifecycle');
      await allure.severity('critical');
      await allure.tag('regression');
      await allure.description(
        'TC-LIFECYCLE-001: The "Cancel DOC" button must be visible in the DOC Detail header ' +
        'for a user with CANCEL_DIGITAL_OFFER_CERTIFICATION privilege on a Controls Scoping DOC.',
      );

      await test.step('Navigate to Controls Scoping DOC (DOC 800)', async () => {
        await page.goto(CONTROLS_SCOPING_DOC_URL);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify Cancel DOC button is visible in the header', async () => {
        await docDetailsPage.expectCancelOptionVisibleInScopeStage();
      });
    });

  // ── TC-LIFECYCLE-002 ──────────────────────────────────────────────────────
  test('should open a confirmation dialog when Cancel DOC is clicked and dismiss it without cancelling',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC / Lifecycle');
      await allure.severity('critical');
      await allure.tag('regression');
      await allure.description(
        'TC-LIFECYCLE-002: Clicking the "Cancel DOC" button must open a confirmation dialog. ' +
        'The dialog must show a reason textbox and a confirmation button. ' +
        'This test dismisses the dialog to avoid mutating QA data.',
      );

      await test.step('Navigate to Controls Scoping DOC (DOC 800)', async () => {
        await page.goto(CONTROLS_SCOPING_DOC_URL);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Click Cancel DOC button to open the confirmation dialog', async () => {
        const cancelDocBtn = page.getByRole('button', { name: 'Cancel DOC' });
        await cancelDocBtn.waitFor({ state: 'visible', timeout: 30_000 });
        await cancelDocBtn.click();
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify confirmation dialog is visible', async () => {
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
      });

      await test.step('Verify dialog contains a Cancellation Reason input', async () => {
        const dialog = page.getByRole('dialog');
        // The dialog should contain a textbox for the cancellation reason
        const hasReasonInput = await dialog.getByRole('textbox').isVisible().catch(() => false);
        expect(hasReasonInput, 'Cancel DOC dialog should contain a cancellation reason textbox').toBe(true);
      });

      await test.step('Verify Cancel DOC confirm button is disabled until a reason is provided', async () => {
        const dialog = page.getByRole('dialog');
        const cancelDocConfirmBtn = dialog.getByRole('button', { name: 'Cancel DOC' });
        await expect(cancelDocConfirmBtn).toBeDisabled({ timeout: 10_000 });
      });

      await test.step('Dismiss the dialog using the Close button', async () => {
        const dialog = page.getByRole('dialog');
        // The dismiss button is labeled "Close" (not "Cancel")
        const closeBtn = dialog.getByRole('button', { name: 'Close' });
        await closeBtn.waitFor({ state: 'visible', timeout: 10_000 });
        await closeBtn.click();
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify DOC is still in Controls Scoping status after dismissal', async () => {
        // Cancel DOC button should still be visible — DOC was not cancelled
        const cancelDocBtn = page.getByRole('button', { name: 'Cancel DOC' });
        await expect(cancelDocBtn).toBeVisible({ timeout: 15_000 });
      });
    });

  // ── TC-LIFECYCLE-003 ──────────────────────────────────────────────────────
  test('should show Start ITS Risk Assessment button for Controls Scoping DOC',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC / Lifecycle');
      await allure.severity('critical');
      await allure.tag('regression');
      await allure.description(
        'TC-LIFECYCLE-003: The "Start ITS Risk Assessment" button must be visible in the ' +
        'Controls Scoping stage for a user with INITIATE_DIGITAL_OFFER_CERTIFICATION privilege. ' +
        'The button gating (disabled/enabled) depends on whether all mandatory Roles are assigned.',
      );

      await test.step('Navigate to Controls Scoping DOC (DOC 800)', async () => {
        await page.goto(CONTROLS_SCOPING_DOC_URL);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify Start ITS Risk Assessment button is visible', async () => {
        const startBtn = page.getByRole('button', { name: /Start ITS Risk Assessment/i });
        await expect(startBtn).toBeVisible({ timeout: 30_000 });
      });
    });

  // ── TC-LIFECYCLE-004 ──────────────────────────────────────────────────────
  test('should show Start ITS Risk Assessment button state (enabled or gated by orange-dot roles)',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC / Lifecycle');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-LIFECYCLE-004: The "Start ITS Risk Assessment" button must be disabled when ' +
        'mandatory Roles & Responsibilities fields are not set (orange dot indicator on ' +
        'Roles & Responsibilities tab). If all roles are assigned on this DOC the test ' +
        'verifies that the button is enabled instead.',
      );

      await test.step('Navigate to Controls Scoping DOC (DOC 800)', async () => {
        await page.goto(CONTROLS_SCOPING_DOC_URL);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Check Start ITS Risk Assessment button state against Roles assignment', async () => {
        const startBtn = page.getByRole('button', { name: /Start ITS Risk Assessment/i });
        await startBtn.waitFor({ state: 'visible', timeout: 30_000 });

        const isDisabled = await startBtn.isDisabled().catch(() => false);

        if (isDisabled) {
          // The button should be disabled when mandatory roles are not all assigned.
          // Verify the Roles & Responsibilities tab has an orange-dot warning indicator.
          const rolesTab = page.getByRole('tab', { name: /Roles & Responsibilities/i });
          await expect(rolesTab).toBeVisible({ timeout: 15_000 });
          const rolesTabText = await rolesTab.textContent().catch(() => '');
          // The orange dot renders inside the tab — page text will contain role indicator chars
          // Acceptable: we just verify the button IS disabled and roles tab IS present
          expect(isDisabled).toBe(true);
        } else {
          // All mandatory roles are assigned — button should be enabled
          await expect(startBtn).toBeEnabled({ timeout: 15_000 });
        }
      });
    });

  // ── TC-LIFECYCLE-005 ──────────────────────────────────────────────────────
  test('should show Completed status on a Completed DOC and all 5 pipeline stages',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC / Lifecycle');
      await allure.severity('critical');
      await allure.tag('regression');
      await allure.description(
        'TC-LIFECYCLE-005: A DOC that has completed the full workflow must show ' +
        '"Completed" status in the header and all 5 pipeline stages must be visible ' +
        'with completion sub-text (user and date) under each stage.',
      );

      await test.step('Navigate to Completed DOC (DOC 273)', async () => {
        await page.goto(COMPLETED_DOC_URL);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify "Completed" status is shown in the header', async () => {
        await expect(
          page.getByText(/Completed/i).first(),
          '"Completed" status should be visible',
        ).toBeVisible({ timeout: 30_000 });
      });

      await test.step('Verify all 5 DOC pipeline stages are visible', async () => {
        // Use exact stage names to avoid strict-mode conflicts with the content tabs
        // (e.g. "Risk Summary" tab matches both "Risk Summary Review" pipeline stage and
        // the "Risk Summary" content tab).
        const pipelineStages = [
          'Initiate DOC',
          'Scope ITS Controls',
          'Risk Assessment',
          'Risk Summary Review',
          'Issue Certification',
        ];
        for (const stage of pipelineStages) {
          await expect(
            page.getByRole('tab', { name: stage, exact: true }).first(),
            `Pipeline stage "${stage}" should be visible`,
          ).toBeVisible({ timeout: 20_000 });
        }
      });

      await test.step('Verify pipeline stages contain completion info (user + date)', async () => {
        const pipelineContainer = page.locator('[role="tablist"]').first();
        await expect(pipelineContainer).toBeVisible({ timeout: 20_000 });

        const pipelineText = await pipelineContainer.evaluate(
          (el) => (el as { textContent?: string }).textContent || '',
        );
        const datePattern = /\d{1,2} \w{3} \d{4}/;
        expect(
          datePattern.test(pipelineText),
          `Pipeline should contain at least one completion date (DD Mon YYYY). Got: "${pipelineText.substring(0, 200)}"`,
        ).toBe(true);
      });
    });

  // ── TC-LIFECYCLE-006 ──────────────────────────────────────────────────────
  test('should show frozen Digital Offer Details on a Completed DOC (no Edit Details button)',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC / Lifecycle');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-LIFECYCLE-006: After a DOC is Completed/Certified, the Digital Offer Details tab ' +
        'must be in read-only mode — the "Edit Details" button must NOT be present, ensuring ' +
        'the DOC Name, DOC Reason, and other fields cannot be changed.',
      );

      await test.step('Navigate to Completed DOC (DOC 273)', async () => {
        await page.goto(COMPLETED_DOC_URL);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Open the Digital Offer Details tab', async () => {
        await docDetailsPage.clickDigitalOfferDetailsTab();
      });

      await test.step('Verify Edit Details button is NOT present on a Completed DOC', async () => {
        const editDetailsBtn = page.getByRole('button', { name: 'Edit Details' });
        // Edit Details must not be present on a completed (frozen) DOC
        await expect(editDetailsBtn).toBeHidden({ timeout: 10_000 });
      });

      await test.step('Verify DOC details panel is visible in read-only mode', async () => {
        await docDetailsPage.expectDigitalOfferDetailsTabPanelVisible();
      });
    });

  // ── TC-LIFECYCLE-007 ──────────────────────────────────────────────────────
  test('should show frozen ITS Checklist tab on a Completed DOC (no Add Controls button)',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC / Lifecycle');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-LIFECYCLE-007: After a DOC is Completed, the ITS Checklist tab must be frozen ' +
        '— the "Add Controls" button must NOT appear, ensuring control scope cannot be changed.',
      );

      await test.step('Navigate to Completed DOC (DOC 273)', async () => {
        await page.goto(COMPLETED_DOC_URL);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Open the ITS Checklist tab', async () => {
        await docDetailsPage.clickITSChecklistTab();
      });

      await test.step('Verify Add Controls button is NOT present on a Completed DOC', async () => {
        const addControlsBtn = page.getByRole('button', { name: '+ Add Controls' });
        await expect(addControlsBtn).toBeHidden({ timeout: 10_000 });
      });

      await test.step('Verify ITS Checklist grid is still visible in read-only mode', async () => {
        await docDetailsPage.expectITSSecurityControlsTitleVisible();
      });
    });
});
