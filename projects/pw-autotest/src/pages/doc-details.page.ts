import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { docDetailsLocators, type DocDetailsLocators } from '@locators/doc-details.locators';

export class DocDetailsPage extends BasePage {
  // DOC Detail URL — note module is GRC_PICASso_DOC, not GRC_PICASso
  readonly url = '/GRC_PICASso_DOC/DOCDetail';

  private readonly l: DocDetailsLocators;

  constructor(page: Page) {
    super(page);
    this.l = docDetailsLocators(page);
  }

  // ==================== Public locator accessors ====================

  get initiateDOCButton(): Locator { return this.l.initiateDOCButton; }

  // ==================== Actions ====================

  /**
   * Clicks the Initiate DOC button, fills the confirmation modal, and submits.
   *
   * Required fields: docName, docReason.
   * If release is 'Other Release', releaseVersion and targetReleaseDate are also required
   * (the modal reveals two additional fields when "Other Release" is selected).
   */
  async clickInitiateDOC(options: {
    docName: string;
    docReason: string;
    release?: string;
    releaseVersion?: string;
    targetReleaseDate?: { year: number; month: number; day: number };
  }): Promise<void> {
    await this.l.initiateDOCButton.waitFor({ state: 'visible', timeout: 30_000 });
    await this.l.initiateDOCButton.click();
    await this.l.initiateDocModal.waitFor({ state: 'visible', timeout: 30_000 });
    await this.l.modalDocNameInput.fill(options.docName);
    if (options.release) {
      await this.l.modalReleaseCombobox.selectOption({ label: options.release });
    }
    if (options.releaseVersion) {
      await this.l.modalReleaseVersionInput.fill(options.releaseVersion);
    }
    if (options.targetReleaseDate) {
      await this.l.modalTargetReleaseDateInput.click();
      await this.selectCalendarDate(
        options.targetReleaseDate.year,
        options.targetReleaseDate.month,
        options.targetReleaseDate.day,
      );
    }
    await this.l.modalDocReasonInput.fill(options.docReason);
    await this.l.modalInitiateButton.click();
  }

  /**
   * Waits for DOC initiation to complete.
   * The readiness signal is the "Controls Scoping" status appearing in the DOC table
   * on the Product Detail page after the modal is submitted.
   */
  async waitForInitiation(): Promise<void> {
    await this.waitForOSLoad();
    await this.l.docStatusBadge.waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * Navigates from the Product Detail DOC table to the first DOC's detail page.
   * Call after waitForInitiation() to land on the DOC Detail page.
   */
  async navigateToFirstDoc(): Promise<void> {
    await this.l.firstDocTableLink.waitFor({ state: 'visible', timeout: 30_000 });
    await this.l.firstDocTableLink.click();
    await this.waitForOSLoad();
  }

  /**
   * Clicks the Digital Offer Details tab and waits for its panel to load.
   */
  async clickDigitalOfferDetailsTab(): Promise<void> {
    await this.l.digitalOfferDetailsTab.click();
    await this.waitForOSLoad();
    await this.l.digitalOfferDetailsPanel.waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ==================== Assertions ====================

  async expectDocStatus(status: string): Promise<void> {
    await expect(this.l.docStatusBadge).toBeVisible({ timeout: 30_000 });
    await expect(this.l.docStatusBadge).toHaveText(status);
  }

  async expectDocStage(stageName: string): Promise<void> {
    await expect(this.l.docStageLabel).toContainText(stageName);
  }

  async expectDigitalOfferDetailsTabClickable(): Promise<void> {
    await expect(this.l.digitalOfferDetailsTab).toBeVisible({ timeout: 30_000 });
    await expect(this.l.digitalOfferDetailsTab).toBeEnabled();
  }

  /**
   * Roles & Responsibilities tab is clickable after initiation (shows team assignments table).
   */
  async expectRolesResponsibilitiesTabClickable(): Promise<void> {
    await expect(this.l.rolesResponsibilitiesTab).toBeVisible({ timeout: 30_000 });
    await expect(this.l.rolesResponsibilitiesTab).toBeEnabled();
  }

  /**
   * ITS Checklist tab is clickable after initiation.
   */
  async expectITSChecklistTabClickable(): Promise<void> {
    await expect(this.l.itsChecklistTab).toBeVisible({ timeout: 30_000 });
    await expect(this.l.itsChecklistTab).toBeEnabled();
  }

  async expectDigitalOfferDetailsTabPanelVisible(): Promise<void> {
    await expect(this.l.digitalOfferDetailsPanel).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Asserts that the initiator username is shown under the Initiate DOC flow tab.
   * The tab displays the username (login) of the user who initiated the DOC.
   */
  async expectInitiatorNameVisible(username: string): Promise<void> {
    const initiateContainer = this.l.initiateStageContainer;
    await expect(initiateContainer.getByText(username, { exact: true })).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Asserts that the initiation date (year) is shown under the Initiate DOC flow tab.
   */
  async expectInitiationDateVisible(year: string): Promise<void> {
    const initiateContainer = this.l.initiateStageContainer;
    await expect(initiateContainer.getByText(new RegExp(year))).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Asserts that the Cancel DOC button is visible in the header.
   * Visible to users with CANCEL_DIGITAL_OFFER_CERTIFICATION privilege.
   */
  async expectCancelOptionVisibleInScopeStage(): Promise<void> {
    await expect(this.l.cancelDocButton).toBeVisible({ timeout: 30_000 });
  }

  async expectCancelOptionNotVisibleInScopeStage(): Promise<void> {
    await expect(this.l.cancelDocButton).not.toBeVisible();
  }

  async expectDocIdFormat(): Promise<void> {
    await expect(this.l.docIdHeader).toBeVisible({ timeout: 30_000 });
    // DOC ID format: DOC- followed by digits (length varies by environment)
    await expect(this.l.docIdHeader).toHaveText(/^DOC-\d+/);
  }

  async expectVestaIdInHeader(vestaId: string): Promise<void> {
    await expect(this.page.getByText(vestaId)).toBeVisible({ timeout: 30_000 });
  }

  async expectReleaseIsLink(): Promise<void> {
    await expect(this.l.releaseHeaderLink).toBeVisible({ timeout: 30_000 });
  }

  async expectReleaseIsPlainText(releaseValue: string): Promise<void> {
    await expect(this.l.releaseHeaderText).toContainText(releaseValue);
    await expect(this.l.releaseHeaderLink).not.toBeVisible();
  }

  async expectTargetReleaseDatePopulated(): Promise<void> {
    const cell = this.l.targetReleaseDateHeader;
    await expect(cell).not.toHaveText('');
    await expect(cell).toContainText(/\d/);
  }

  // ==================== Private helpers ====================

  /**
   * Selects a date in the OutSystems calendar widget.
   * The calendar floats outside the dialog; it is opened by clicking the date input.
   */
  private async selectCalendarDate(year: number, month: number, day: number): Promise<void> {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = monthNames[month - 1];

    await this.l.calendarMonthSelect.selectOption({ label: monthName });

    const yearInput = this.l.calendarYearSpinbutton;
    await yearInput.fill(year.toString());
    await yearInput.press('Enter'); // Enter triggers calendar update; Tab does not

    // Day cells are generic elements with aria-label "Month D, YYYY" — use CSS attribute selector
    const dateLabel = `${monthName} ${day}, ${year}`;
    const dayCell = this.page.locator(`[aria-label="${dateLabel}"]`).first();
    await dayCell.waitFor({ state: 'visible', timeout: 10_000 });
    await dayCell.click();
  }
}
