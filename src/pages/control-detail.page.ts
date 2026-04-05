import { type Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { controlDetailLocators, type ControlDetailLocators } from '@locators/control-detail.locators';

/**
 * Page object for the ITS Control Detail page.
 *
 * URL: /GRC_PICASso_DOC/ControlDetail?ControlId=…
 * Reached via a Control ID link in the ITS Checklist tab on DOC Detail.
 */
export class ControlDetailPage extends BasePage {
  readonly url = '/GRC_PICASso_DOC/ControlDetail';

  private readonly l: ControlDetailLocators;

  constructor(page: Page) {
    super(page);
    this.l = controlDetailLocators(page);
  }

  // ─── Public locator accessors ──────────────────────────────────────────────

  get descopeControlButton() { return this.l.descopeControlButton; }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Waits for the Control Detail page to be ready (Control ID heading visible).
   */
  async waitForPageLoaded(): Promise<void> {
    await this.waitForOSLoad();
    await this.l.controlIdHeader.waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  async expectControlIdVisible(): Promise<void> {
    await expect(this.l.controlIdHeader).toBeVisible({ timeout: 30_000 });
  }

  async expectControlIdFormat(): Promise<void> {
    // Control names are plain text IDs (e.g. "11-AUG_ TEST NEW"), not "ITS-NNN" format.
    // Just verify the header is non-empty.
    const text = await this.l.controlIdHeader.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  }

  async expectBreadcrumbHomeLinkVisible(): Promise<void> {
    await expect(this.l.breadcrumbHomeLink).toBeVisible({ timeout: 30_000 });
  }

  async expectBreadcrumbProductLinkVisible(): Promise<void> {
    await expect(this.l.breadcrumbProductLink).toBeVisible({ timeout: 30_000 });
  }

  async expectBreadcrumbDocLinkVisible(): Promise<void> {
    await expect(this.l.breadcrumbDocLink).toBeVisible({ timeout: 30_000 });
  }

  async expectDescriptionSectionVisible(): Promise<void> {
    // Description is a <label class="OSFillParent"> — no heading tags on this page.
    await expect(this.l.descriptionLabel).toBeVisible({ timeout: 30_000 });
  }

  async expectEvidenceExpectationSectionVisible(): Promise<void> {
    // Evidence Expectation is a <label class="OSFillParent"> — no heading tags on this page.
    await expect(this.l.evidenceExpectationLabel).toBeVisible({ timeout: 30_000 });
  }

  /**
   * On the Scope ITS Controls stage the content below the control details shows
   * a read-only placeholder message instead of findings / evidence / comments.
   */
  async expectScopingStageReadOnlyMessageVisible(): Promise<void> {
    await expect(this.l.scopingStageReadOnlyMessage).toBeVisible({ timeout: 30_000 });
  }

  async expectDescopeControlButtonVisible(): Promise<void> {
    await expect(this.l.descopeControlButton).toBeVisible({ timeout: 30_000 });
  }

  async expectDescopeControlButtonHidden(): Promise<void> {
    await expect(this.l.descopeControlButton).toBeHidden({ timeout: 15_000 });
  }
}
