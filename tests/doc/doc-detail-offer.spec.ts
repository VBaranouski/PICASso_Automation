/**
 * Spec 11.5 — DOC Detail: Digital Offer Details Tab
 *
 * Covers read-only view, Edit Details mode, field editability, char counter,
 * "Other Release" reveal logic, Save Changes, and Cancel.
 *
 * Depends on: doc-state-setup
 */
import { test, expect } from '../../src/fixtures';
import { readDocState } from '../../src/helpers/doc.helper';
import * as allure from 'allure-js-commons';

test.describe('DOC - Digital Offer Details Tab (11.5) @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let docDetailsUrl: string;

  test.beforeAll(() => {
    docDetailsUrl = readDocState().docDetailsUrl;
  });

  test.beforeEach(async ({ page, loginPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  // ── DOC-OFFER-001 ─────────────────────────────────────────────────────────
  test('should show Digital Offer Details tab content in read-only mode', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-001: Digital Offer Details tab in read-only mode must display ' +
      'DOC Name, DOC Reason section and an Edit Details button.',
    );

    await test.step('Navigate to DOC Detail and open Digital Offer Details tab', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
    });

    await test.step('Verify read-only panel is visible with Edit Details button', async () => {
      await docDetailsPage.expectDigitalOfferDetailsTabPanelVisible();
      await docDetailsPage.expectEditDetailsButtonVisible();
    });
  });

  // ── DOC-OFFER-002 ─────────────────────────────────────────────────────────
  test('should switch to edit mode when Edit Details is clicked', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-002: Clicking "Edit Details" must switch the tab to edit mode ' +
      'with Save Changes and Cancel buttons visible.',
    );

    await test.step('Navigate to DOC Detail and open Digital Offer Details tab', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
    });

    await test.step('Click Edit Details', async () => {
      await docDetailsPage.clickEditDetails();
    });

    await test.step('Verify Save Changes and Cancel are visible', async () => {
      await docDetailsPage.expectSaveChangesButtonVisible();
      await docDetailsPage.expectCancelEditButtonVisible();
    });
  });

  // ── DOC-OFFER-003 ─────────────────────────────────────────────────────────
  test('should expose an editable DOC Name textbox in edit mode', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-003: In edit mode the DOC Name field must be an editable textbox.',
    );

    await test.step('Navigate and open Digital Offer Details in edit mode', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
      await docDetailsPage.clickEditDetails();
    });

    await test.step('Verify DOC Name input is editable', async () => {
      await docDetailsPage.expectDocNameInputEditable();
    });
  });

  // ── DOC-OFFER-004 ─────────────────────────────────────────────────────────
  test('should show live character count on the DOC Reason textarea', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-004: In edit mode the DOC Reason textarea must show a live ' +
      'character count in "NN/500" format.',
    );

    await test.step('Navigate and open Digital Offer Details in edit mode', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
      await docDetailsPage.clickEditDetails();
    });

    await test.step('Verify character count indicator is visible', async () => {
      await docDetailsPage.expectDocReasonCharCountVisible();
    });
  });

  // ── DOC-OFFER-005 ─────────────────────────────────────────────────────────
  test('should reveal Release Version field when Other Release is selected', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-005: Selecting "Other Release" in the Release dropdown must reveal ' +
      'an additional "Release Version" text field.',
    );

    await test.step('Navigate and open Digital Offer Details in edit mode', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
      await docDetailsPage.clickEditDetails();
    });

    await test.step('Select Other Release', async () => {
      await docDetailsPage.selectOfferRelease('Other Release');
    });

    await test.step('Verify Release Version input appears', async () => {
      await docDetailsPage.expectReleaseVersionInputVisible();
    });
  });

  // ── DOC-OFFER-006 ─────────────────────────────────────────────────────────
  // KNOWN DEFECT (TC-11.5.6): Save Changes returns the UI to read-only mode but
  // does NOT persist the updated DOC Reason to the backend in the QA environment.
  // The test is annotated with test.fail() so it counts as an expected failure
  // (green in the report) and will flag as "unexpected pass" when the defect is fixed.
  test('should persist edits and return to read-only view when Save Changes is clicked', async ({ page, docDetailsPage }) => {
    test.fail(true, 'KNOWN DEFECT TC-11.5.6: Save Changes appears to succeed visually ' +
      '(returns to read-only) but does not persist the updated DOC Reason to the backend. ' +
      'The test will auto-pass when the product defect is resolved.');
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-006: After editing and clicking "Save Changes" the tab must return ' +
      'to read-only view with the updated DOC Name visible.',
    );

    const updatedName = `DOC Edited ${Date.now()}`;
    const updatedReason = `Automated test reason ${Date.now()}`;

    await test.step('Navigate and open Digital Offer Details in edit mode', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
      await docDetailsPage.clickEditDetails();
    });

    await test.step('Update DOC Name field', async () => {
      await docDetailsPage.fillOfferDocName(updatedName);
    });

    // DOC Reason is mandatory — the Save Changes button stays disabled until it is filled.
    await test.step('Fill mandatory DOC Reason field', async () => {
      await docDetailsPage.fillOfferDocReason(updatedReason);
    });

    await test.step('Save Changes', async () => {
      await docDetailsPage.clickSaveChanges();
    });

    await test.step('Reload DOC Detail and verify persisted changes in read-only view', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
      await docDetailsPage.expectEditDetailsButtonVisible();
      await expect(page.getByText(updatedReason)).toBeVisible({ timeout: 30_000 });
    });
  });

  // ── DOC-OFFER-007 ─────────────────────────────────────────────────────────
  test('should discard edits and return to read-only view when Cancel is clicked', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-007: Clicking "Cancel" in edit mode must discard unsaved changes ' +
      'and return the tab to read-only view.',
    );

    const originalName = `DOC Automated Test`;
    const tempName = `SHOULD NOT BE SAVED ${Date.now()}`;

    await test.step('Navigate and open Digital Offer Details in edit mode', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
      await docDetailsPage.clickEditDetails();
    });

    await test.step('Type a temporary name', async () => {
      await docDetailsPage.fillOfferDocName(tempName);
    });

    await test.step('Click Cancel', async () => {
      await docDetailsPage.clickCancelEdit();
    });

    await test.step('Verify read-only mode is restored and temporary name is not saved', async () => {
      await docDetailsPage.expectEditDetailsButtonVisible();
      await expect(page.getByText(tempName)).toBeHidden({ timeout: 10_000 });
    });
  });

  // ── DOC-OFFER-008 ─────────────────────────────────────────────────────────
  test('should display VESTA ID in the Digital Offer Details read-only tab', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-008: The Digital Offer Details tab in read-only mode must show a ' +
      '"VESTA ID" label and a non-empty numeric value.',
    );

    await test.step('Navigate to DOC Detail and open Digital Offer Details tab', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
      await docDetailsPage.expectEditDetailsButtonVisible();
    });

    await test.step('Verify "VESTA ID" label is visible', async () => {
      await expect(
        page.getByRole('tabpanel').getByText('VESTA ID').first(),
        '"VESTA ID" label should be visible in read-only tab',
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('Verify the VESTA ID value is a non-empty string', async () => {
      // The VESTA ID value is inside the tabpanel next to the label
      const tabpanel = page.getByRole('tabpanel').first();
      const vestaIdText = await tabpanel.getByText(/^\d{4,}$/).first().textContent().catch(() => '');
      expect(
        vestaIdText && /^\d{4,}$/.test(vestaIdText.trim()),
        `A numeric VESTA ID value should be visible in the tabpanel. Got: "${vestaIdText}"`,
      ).toBe(true);
    });
  });

  // ── DOC-OFFER-009 ─────────────────────────────────────────────────────────
  test('should show Target Release Date as read-only/disabled in edit mode', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Digital Offer Details');
    await allure.description(
      'DOC-OFFER-009: The "Target Release Date" field must be read-only or disabled ' +
      'in edit mode — users must not be able to type a free-form date.',
    );

    await test.step('Navigate to DOC Detail and enter edit mode', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickDigitalOfferDetailsTab();
      await docDetailsPage.clickEditDetails();
    });

    await test.step('Verify Target Release Date input is disabled or read-only', async () => {
      // Locate the Target Release Date input by label proximity
      const dateInput = page
        .getByLabel(/Target Release Date/i)
        .or(
          page
            .getByText('Target Release Date')
            .locator('..') // parent container
            .locator('input, [role="textbox"]')
            .first(),
        )
        .first();

      // If the element is found, it should be disabled; if not found, the field is display-only
      const inputCount = await dateInput.count();
      if (inputCount > 0) {
        const isDisabled = await dateInput.isDisabled();
        const isReadOnly = await dateInput.evaluate((el) => !!(el as { readOnly?: boolean }).readOnly);
        expect(
          isDisabled || isReadOnly,
          'Target Release Date input should be disabled or read-only in edit mode',
        ).toBe(true);
      } else {
        // No editable input found → field is displayed as plain text (read-only by design)
        await expect(
          page.getByText('Target Release Date').first(),
          '"Target Release Date" label should still be visible',
        ).toBeVisible({ timeout: 15_000 });
      }
    });

    await test.step('Cancel edit mode to leave the form in a clean state', async () => {
      await docDetailsPage.clickCancelEdit();
      await docDetailsPage.expectEditDetailsButtonVisible();
    });
  });
});
