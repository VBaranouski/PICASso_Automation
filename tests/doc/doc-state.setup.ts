/**
 * DOC State Setup
 *
 * Scans the "My DOCs" tab on the Landing Page for a DOC in "Controls Scoping"
 * status and persists its URL to .doc-state.json at the project root.
 *
 * All DOC Detail spec projects (doc-detail-header, doc-detail-offer, etc.)
 * depend on this setup file so they always start with a known, valid DOC URL.
 *
 * Dependency chain:
 *   setup → doc-product-setup → doc-initiation → doc-state-setup → [all DOC detail specs]
 */
import { test as setup } from '../../src/fixtures';
import { writeDocState } from '../../src/helpers/doc.helper';

setup.describe.serial('DOC State Setup — find Controls Scoping DOC and persist URL', () => {
  setup.setTimeout(360_000);

  setup('persist Controls Scoping DOC URL to .doc-state.json', async ({
    page, loginPage, landingPage, docDetailsPage, userCredentials,
  }) => {
    // ── Login ────────────────────────────────────────────────────────────────
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });

    // ── Scan My DOCs tab for a Controls Scoping DOC ───────────────────────────
    await landingPage.goto();
    await landingPage.expectPageLoaded({ timeout: 60_000 });

    // If the My DOCs tab is not visible the user has no VIEW_DOC privilege — fail fast.
    await setup.step('Open My DOCs tab', async () => {
      await landingPage.myDocsTab.waitFor({ state: 'visible', timeout: 30_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
    });

    // Show 100 rows to maximise the chance of finding a Controls Scoping DOC
    await setup.step('Increase per-page to 100', async () => {
      await landingPage.changePerPage('100');
    });

    // ── Row scan ─────────────────────────────────────────────────────────────
    const docUrl = await setup.step('Scan rows for Controls Scoping status', async () => {
      const rows = landingPage.grid.getByRole('row');
      const rowCount = await rows.count();

      for (let i = 1; i < rowCount; i++) {
        const row = rows.nth(i);
        const rowText = await row.textContent().catch(() => '');

        if (rowText?.includes('Controls Scoping')) {
          const docLink = row.getByRole('link').first();
          await docLink.click();
          await page.waitForURL(/GRC_PICASso_DOC\/DOCDetail/, { timeout: 60_000 });
          await docDetailsPage.waitForOSLoad();
          return page.url();
        }
      }
      return null;
    });

    if (docUrl) {
      writeDocState({ docDetailsUrl: docUrl });
      return;
    }

    // ── Fallback: navigate via My Products ───────────────────────────────────
    // doc-initiation just ran and created at least one DOC; look for it via
    // the Product Detail page's Digital Offer Certification table.
    const fallbackUrl = await setup.step('Fallback — find initiated DOC via My Products', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.openMyProductsTab();
      await landingPage.changePerPage('100');

      const rows = landingPage.grid.getByRole('row');
      const rowCount = await rows.count();

      for (let i = 1; i < rowCount; i++) {
        await landingPage.clickProductAtRow(i);
        await page.getByRole('button', { name: 'Edit Product' })
          .waitFor({ state: 'visible', timeout: 30_000 })
          .catch(() => null);

        // Look for the Digital Offer Certification tab
        const docTab = page.locator('button, [role="tab"]').filter({ hasText: /Digital Offer Certification/i });
        const hasDocTab = await docTab.isVisible().catch(() => false);
        if (!hasDocTab) {
          await landingPage.goto();
          await landingPage.expectPageLoaded({ timeout: 30_000 });
          await landingPage.openMyProductsTab();
          await landingPage.changePerPage('100');
          continue;
        }

        await docTab.click();
        await docDetailsPage.waitForOSLoad();

        // Check if there is a "Controls Scoping" status cell in the certification table
        const statusCell = page.getByRole('gridcell', { name: 'Controls Scoping' }).first();
        const hasStatus = await statusCell.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasStatus) {
          await landingPage.goto();
          await landingPage.expectPageLoaded({ timeout: 30_000 });
          await landingPage.openMyProductsTab();
          await landingPage.changePerPage('100');
          continue;
        }

        // Navigate to the DOC Detail page
        await docDetailsPage.navigateToFirstDoc();
        return page.url();
      }
      return null;
    });

    if (fallbackUrl) {
      writeDocState({ docDetailsUrl: fallbackUrl });
      return;
    }

    throw new Error(
      'doc-state-setup: Could not find any DOC in "Controls Scoping" status.\n' +
      'Ensure the doc-initiation project ran successfully before executing this setup.',
    );
  });
});
