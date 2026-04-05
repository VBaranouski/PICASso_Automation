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

  get saveRolesChangesButton(): Locator { return this.l.saveRolesChangesButton; }

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
    await this.l.productTableStatusCell.waitFor({ state: 'visible', timeout: 60_000 });
    await this.l.firstDocTableLink.waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * Navigates from the Product Detail DOC table to the first DOC's detail page.
   * Call after waitForInitiation() to land on the DOC Detail page.
   */
  async navigateToFirstDoc(): Promise<void> {
    await this.l.firstDocTableLink.waitFor({ state: 'visible', timeout: 30_000 });

    const href = await this.l.firstDocTableLink.getAttribute('href');
    const targetUrl = href
      ? new URL(href, this.page.url()).toString()
      : null;

    if (targetUrl) {
      await this.page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
    } else {
      await this.l.firstDocTableLink.click();
      await this.page.waitForURL(/GRC_PICASso_DOC\/DOCDetail/, { timeout: 60_000 });
    }

    for (let attempt = 1; attempt <= 5; attempt++) {
      await this.waitForOSLoad().catch(() => undefined);

      const hasDocHeader = await this.l.docIdHeader.isVisible().catch(() => false);
      const hasCancelButton = await this.l.cancelDocButton.isVisible().catch(() => false);
      const hasDigitalOfferTab = await this.l.digitalOfferDetailsTab.isVisible().catch(() => false);

      if (hasDocHeader || hasCancelButton || hasDigitalOfferTab) {
        break;
      }

      const hasProcessingError = await this.page.getByText('There was an error processing your request.').isVisible().catch(() => false);
      const hasTimeoutAlert = await this.page.getByRole('alert').filter({ hasText: /The connection has timed out/i }).isVisible().catch(() => false);
      const reloadButtonVisible = await this.page.getByRole('button', { name: 'RELOAD' }).isVisible().catch(() => false);

      if (attempt < 5) {
        if (reloadButtonVisible) {
          await this.page.getByRole('button', { name: 'RELOAD' }).click();
          await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
        } else if (hasProcessingError || hasTimeoutAlert || targetUrl) {
          if (targetUrl) {
            await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => undefined);
          } else {
            await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => undefined);
          }
        }

        await this.page.waitForTimeout(2_000);
        continue;
      }

      await Promise.any([
        this.l.docIdHeader.waitFor({ state: 'visible', timeout: 20_000 }),
        this.l.cancelDocButton.waitFor({ state: 'visible', timeout: 20_000 }),
        this.l.digitalOfferDetailsTab.waitFor({ state: 'visible', timeout: 20_000 }),
      ]);
    }

    await this.l.cancelDocButton.waitFor({ state: 'visible', timeout: 60_000 });
  }

  /**
   * Clicks the Digital Offer Details tab and waits for its panel to load.
   */
  async clickDigitalOfferDetailsTab(): Promise<void> {
    await this.waitForOSLoad();

    const panelAlreadyVisible = await this.l.digitalOfferDetailsPanel.isVisible().catch(() => false);
    const editButtonVisible = await this.l.editDetailsButton.isVisible().catch(() => false);
    const saveButtonVisible = await this.l.saveChangesButton.isVisible().catch(() => false);
    if (panelAlreadyVisible && (editButtonVisible || saveButtonVisible)) {
      return;
    }

    await this.l.digitalOfferDetailsTab.waitFor({ state: 'visible', timeout: 30_000 });

    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.l.digitalOfferDetailsTab.click({ force: attempt > 1 });
      await this.waitForOSLoad();

      const panelVisible = await this.l.digitalOfferDetailsPanel.isVisible().catch(() => false);
      if (panelVisible) {
        return;
      }
    }

    await this.l.digitalOfferDetailsPanel.waitFor({ state: 'visible', timeout: 30_000 });
  }

  // ==================== Assertions ====================

  async expectDocStatus(status: string): Promise<void> {
    await this.l.docIdHeader.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(this.l.docStatusBadge).toHaveText(status, { timeout: 30_000 });
  }

  async expectDocStage(stageName: string): Promise<void> {
    await expect(this.l.docStageLabel).toBeVisible({ timeout: 30_000 });
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
    await expect(this.l.cancelDocButton).toBeHidden();
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
    await expect(this.l.releaseHeaderLink).toBeHidden();
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

  // ==================== DOC Detail — Breadcrumb ====================

  async expectBreadcrumbHomeLinkVisible(): Promise<void> {
    await expect(this.l.breadcrumbHomeLink).toBeVisible({ timeout: 30_000 });
  }

  async expectBreadcrumbProductLinkVisible(): Promise<void> {
    await expect(this.l.breadcrumbProductLink).toBeVisible({ timeout: 30_000 });
  }

  // ==================== DOC Detail — Pipeline stages ====================

  /**
   * Asserts all 5 DOC workflow pipeline stages are rendered and visible.
   * Stage tabs: Initiate DOC · Scope ITS Controls · Risk Assessment · Risk Summary Review · Issue Certification
   */
  async expectAllPipelineStagesVisible(): Promise<void> {
    await expect(this.l.initiateStageContainer).toBeVisible({ timeout: 30_000 });
    await expect(this.l.docStageLabel).toBeVisible({ timeout: 30_000 });
    await expect(this.l.docPipelineTab3).toBeVisible({ timeout: 30_000 });
    await expect(this.l.docPipelineTab4).toBeVisible({ timeout: 30_000 });
    await expect(this.l.docPipelineTab5).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Returns true when the given pipeline stage tab has aria-selected="true".
   */
  async isPipelineStageActive(stageName: string): Promise<boolean> {
    const stageTab = this.page.getByRole('tab', { name: stageName });
    const ariaSelected = await stageTab.getAttribute('aria-selected');
    return ariaSelected === 'true';
  }

  async expectPipelineStageActive(stageName: string): Promise<void> {
    const stageTab = this.page.getByRole('tab', { name: stageName });
    await expect(stageTab).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
  }

  async clickHideShowFlowButton(): Promise<void> {
    await this.l.hideShowFlowButton.waitFor({ state: 'visible', timeout: 15_000 });
    await this.l.hideShowFlowButton.click();
    await this.waitForOSLoad();
  }

  async expectPipelineHidden(): Promise<void> {
    // When 'Hide Flow' is clicked the expandable-area container collapses to height:0.
    // Playwright considers an element with a zero bounding box as hidden.
    await expect(this.page.locator('.expandable-area').first()).toBeHidden({ timeout: 15_000 });
  }

  async expectPipelineVisible(): Promise<void> {
    // When 'Show Flow' is clicked the expandable-area container expands back to its natural height.
    await expect(this.page.locator('.expandable-area').first()).toBeVisible({ timeout: 15_000 });
  }

  // ==================== DOC Detail — Digital Offer Details tab (edit) ====================

  async clickEditDetails(): Promise<void> {
    await this.l.editDetailsButton.waitFor({ state: 'visible', timeout: 15_000 });
    await this.l.editDetailsButton.click();
    await this.waitForOSLoad();
  }

  async fillOfferDocName(name: string): Promise<void> {
    await this.l.offerDocNameInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.l.offerDocNameInput.fill(name);
  }

  async fillOfferDocReason(text: string): Promise<void> {
    await this.l.offerDocReasonTextarea.waitFor({ state: 'visible', timeout: 15_000 });
    await this.l.offerDocReasonTextarea.fill(text);
  }

  async selectOfferRelease(label: string): Promise<void> {
    await this.l.offerReleaseDropdown.selectOption({ label });
  }

  async clickSaveChanges(): Promise<void> {
    await expect(this.l.saveChangesButton).toBeVisible({ timeout: 15_000 });
    await expect(this.l.saveChangesButton).toBeEnabled({ timeout: 15_000 });

    const activeTagName = await this.page.evaluate(() => (globalThis as any).document?.activeElement?.tagName ?? '');
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTagName)) {
      await this.page.keyboard.press('Tab');
      await this.waitForOSLoad();
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.l.saveChangesButton.click({ force: attempt > 1 });
      await this.waitForOSLoad();

      const returnedToReadOnly = await this.l.editDetailsButton.isVisible().catch(() => false);
      if (returnedToReadOnly) {
        return;
      }

      const canRetrySave = await this.l.saveChangesButton.isVisible().catch(() => false);
      if (!canRetrySave || attempt === 3) {
        break;
      }
    }
  }

  async clickCancelEdit(): Promise<void> {
    await this.l.cancelEditButton.click();
    await this.waitForOSLoad();
  }

  async expectEditDetailsButtonVisible(): Promise<void> {
    await expect(this.l.editDetailsButton).toBeVisible({ timeout: 30_000 });
  }

  async expectSaveChangesButtonVisible(): Promise<void> {
    await expect(this.l.saveChangesButton).toBeVisible({ timeout: 15_000 });
  }

  async expectCancelEditButtonVisible(): Promise<void> {
    await expect(this.l.cancelEditButton).toBeVisible({ timeout: 15_000 });
  }

  async expectDocNameInputEditable(): Promise<void> {
    await expect(this.l.offerDocNameInput).toBeVisible({ timeout: 15_000 });
    await expect(this.l.offerDocNameInput).toBeEditable();
  }

  async expectDocReasonCharCountVisible(): Promise<void> {
    await expect(this.l.offerDocReasonCharCount).toBeVisible({ timeout: 15_000 });
  }

  async expectReleaseVersionInputVisible(): Promise<void> {
    await expect(this.l.offerReleaseVersionInput).toBeVisible({ timeout: 15_000 });
  }

  async isEditRolesButtonVisible(): Promise<boolean> {
    return this.l.editRolesButton.isVisible().catch(() => false);
  }

  async isSaveRolesChangesDisabled(): Promise<boolean> {
    return this.l.saveRolesChangesButton.isDisabled().catch(() => false);
  }

  async expectSaveRolesChangesButtonVisible(): Promise<void> {
    await expect(this.l.saveRolesChangesButton).toBeVisible({ timeout: 15_000 });
  }

  async getRolesTeamMembersText(roleName: string): Promise<string> {
    const row = this.l.rolesGrid.locator('tr').filter({ hasText: roleName }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    const teamMembersCell = row.locator('td').nth(1);
    return (await teamMembersCell.textContent())?.trim() ?? '';
  }

  // ==================== DOC Detail — Roles & Responsibilities tab ====================

  async clickRolesResponsibilitiesTab(): Promise<void> {
    await this.waitForOSLoad();

    const rolesVisible = await this.l.rolesGrid.isVisible().catch(() => false);
    const editRolesVisible = await this.l.editRolesButton.isVisible().catch(() => false);
    const saveRolesVisible = await this.l.saveRolesChangesButton.isVisible().catch(() => false);
    if (rolesVisible && (editRolesVisible || saveRolesVisible)) {
      return;
    }

    await this.l.rolesResponsibilitiesTab.waitFor({ state: 'visible', timeout: 30_000 });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.l.rolesResponsibilitiesTab.click({ force: attempt > 1 });
      await this.waitForOSLoad();

      if (await this.l.rolesGrid.isVisible().catch(() => false)) {
        return;
      }
    }

    await this.l.rolesGrid.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async expectRolesGridVisible(): Promise<void> {
    await expect(this.l.rolesGrid).toBeVisible({ timeout: 30_000 });
  }

  async expectRolesGridColumnHeaders(): Promise<void> {
    // Column headers are uppercase in DOM: 'USER ROLE', 'TEAM MEMBERS', 'EMAIL', 'LOCATION'
    const expected = ['USER ROLE', 'TEAM MEMBERS', 'EMAIL', 'LOCATION'];
    for (const header of expected) {
      await expect(this.l.rolesGrid.locator('th').filter({ hasText: header })).toBeVisible({ timeout: 15_000 });
    }
  }

  async expectRolesRowPresent(roleName: string | RegExp): Promise<void> {
    await expect(this.l.rolesGrid.locator('tr').filter({ hasText: roleName }).first()).toBeVisible({ timeout: 15_000 });
  }

  async expectAllRoleRowsPresent(): Promise<void> {
    const requiredRoles = [
      'IT Owner',
      'Project Manager',
      'Product Owner',
      /Security (and Data Protection )?Advisor/,
    ];
    const optionalRoles = [
      'BU Security Officer',
      'CISO',
      'Digital Offer Certification Lead',
      'Digital Risk Lead',
      'Business Vice President',
      'Senior Business Vice President',
    ];
    for (const role of requiredRoles) {
      await this.expectRolesRowPresent(role);
    }

    // In QA some Controls Scoping DOCs only expose the product-derived rows.
    // Treat the remaining workflow-assigned roles as optional for this assertion.
    for (const role of optionalRoles) {
      const isVisible = await this.l.rolesGrid.locator('tr').filter({ hasText: role }).first().isVisible().catch(() => false);
      if (isVisible) {
        await this.expectRolesRowPresent(role);
      }
    }
  }

  async expectEditRolesButtonVisible(): Promise<void> {
    await expect(this.l.editRolesButton).toBeVisible({ timeout: 15_000 });
  }

  async clickEditRoles(): Promise<void> {
    await this.l.editRolesButton.waitFor({ state: 'visible', timeout: 15_000 });
    await this.l.editRolesButton.click();
    await this.waitForOSLoad();
  }

  async expectSaveRolesChangesButtonDisabled(): Promise<void> {
    await expect(this.l.saveRolesChangesButton).toBeDisabled({ timeout: 15_000 });
  }

  async clickCancelRoles(): Promise<void> {
    await this.l.cancelRolesButton.click();
    await this.waitForOSLoad();
  }

  // ==================== DOC Detail — ITS Checklist tab ====================

  async clickITSChecklistTab(): Promise<void> {
    await this.waitForOSLoad();

    const itsVisible = await this.l.itsChecklistPanel.isVisible().catch(() => false);
    if (itsVisible) {
      return;
    }

    await this.l.itsChecklistTab.waitFor({ state: 'visible', timeout: 30_000 });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.l.itsChecklistTab.click({ force: true });
      await this.waitForOSLoad();

      if (await this.l.itsChecklistPanel.isVisible().catch(() => false)) {
        return;
      }
    }

    await this.l.itsChecklistPanel.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async expectITSSecurityControlsTitleVisible(): Promise<void> {
    await expect(this.l.itsSecurityControlsTitle).toBeVisible({ timeout: 30_000 });
  }

  async expectITSGridColumnHeaders(): Promise<void> {
    // ITS grid column headers are uppercase in DOM
    const expected = ['CONTROL ID', 'DESCRIPTION', 'EVIDENCE EXPECTATION', 'CATEGORY'];
    for (const header of expected) {
      await expect(
        this.l.itsGrid.locator('th').filter({ hasText: header }),
      ).toBeVisible({ timeout: 15_000 });
    }
  }

  /**
   * Checks whether the ITS Checklist has at least one data row.
   * Use to guard tests that depend on controls being present.
   */
  async hasITSControls(): Promise<boolean> {
    const noControlsMsg = await this.l.itsNoControlsAddedMessage.isVisible().catch(() => false);
    const noActiveMsg = await this.l.itsNoActiveControlsMessage.isVisible().catch(() => false);
    return !noControlsMsg && !noActiveMsg;
  }

  async expectITSFilterControlsVisible(): Promise<void> {
    await expect(this.l.itsCategoryFilter).toBeVisible({ timeout: 15_000 });
    await expect(this.l.itsSearchInput).toBeVisible({ timeout: 15_000 });
    await expect(this.l.itsResetButton).toBeVisible({ timeout: 15_000 });
  }

  async hasControlsInAddControlPopup(): Promise<boolean> {
    return this.l.addControlTable.locator('tbody tr').first().isVisible().catch(() => false);
  }

  async searchITSControls(query: string): Promise<void> {
    await this.l.itsSearchInput.fill(query);
    await this.waitForOSLoad();
  }

  async hasITSNoResultsMessage(): Promise<boolean> {
    return this.l.itsNoResultsMessage.isVisible().catch(() => false);
  }

  async getITSGridDataRowCount(): Promise<number> {
    return this.l.itsGrid.locator('tbody tr').count();
  }

  async clickITSReset(): Promise<void> {
    await this.l.itsResetButton.click();
    await this.waitForOSLoad();
  }

  async expectITSSecurityControlsTitleLoaded(): Promise<void> {
    await expect(this.l.itsSecurityControlsTitle).toBeVisible({ timeout: 15_000 });
  }

  async expectAddControlButtonVisible(): Promise<void> {
    await expect(this.l.itsAddControlButton).toBeVisible({ timeout: 15_000 });
  }

  async clickAddControl(): Promise<void> {
    await this.l.itsAddControlButton.waitFor({ state: 'visible', timeout: 15_000 });
    await this.l.itsAddControlButton.click();
    await this.waitForOSLoad();
  }

  async expectAddControlPopupVisible(): Promise<void> {
    await expect(this.l.addControlPopup).toBeVisible({ timeout: 30_000 });
  }

  async expectAddControlPopupElements(): Promise<void> {
    await expect(this.l.addControlSearchInput).toBeVisible({ timeout: 15_000 });
    await expect(this.l.addControlCategoryFilter).toBeVisible({ timeout: 15_000 });
    await expect(this.l.addControlTable).toBeVisible({ timeout: 15_000 });
    await expect(this.l.addSelectedButton).toBeVisible({ timeout: 15_000 });
  }

  /** Checks first checkbox in the Add Control popup table. */
  async selectFirstControlInPopup(): Promise<void> {
    // addControlTable uses <table> with <tbody><tr> structure
    const firstRow = this.l.addControlTable.locator('tbody tr').first();
    await firstRow.waitFor({ state: 'visible', timeout: 15_000 });
    await firstRow.locator('input[type="checkbox"]').click();
    await this.waitForOSLoad();
  }

  async expectAddSelectedButtonEnabled(): Promise<void> {
    await expect(this.l.addSelectedButton).toBeEnabled({ timeout: 15_000 });
  }

  async expectSelectedCountVisible(): Promise<void> {
    await expect(this.l.addControlSelectedCount).toBeVisible({ timeout: 15_000 });
  }

  async closeAddControlPopup(): Promise<void> {
    await this.l.addControlCloseButton.click();
    await this.waitForOSLoad();
  }

  /** Clicks the Descope (×) button on the first ITS control data row. */
  async clickFirstControlDescopeButton(): Promise<void> {
    const firstRow = this.l.itsGridDataRow(0);
    await firstRow.waitFor({ state: 'visible', timeout: 15_000 });
    // The last cell in the row contains the descope link (icon)
    await firstRow.locator('td:last-child a').click();
    await this.waitForOSLoad();
  }

  /** Navigates to Control Detail page by clicking the Control ID link in the first row. */
  async clickFirstControlIdLink(): Promise<void> {
    const firstRow = this.l.itsGridDataRow(0);
    await firstRow.waitFor({ state: 'visible', timeout: 15_000 });
    const controlLink = firstRow.locator('td:first-child a').first();
    const href = await controlLink.getAttribute('href');

    if (href) {
      await this.page.goto(new URL(href, this.page.url()).toString(), {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
    } else {
      await controlLink.click({ force: true });
    }

    await this.page.waitForURL(/ControlDetail/, { timeout: 30_000, waitUntil: 'domcontentloaded' }).catch(async () => {
      await expect.poll(() => this.page.url(), { timeout: 30_000 }).toMatch(/ControlDetail/);
    });
    await this.waitForOSLoad();
  }

  async expectUnscopePopupVisible(): Promise<void> {
    await expect(this.l.unscopePopupHeading).toBeVisible({ timeout: 15_000 });
  }

  async fillUnscopeJustification(text: string): Promise<void> {
    await this.l.unscopeJustificationInput.fill(text);
  }

  async expectUnscopeDescoperButtonEnabled(): Promise<void> {
    await expect(this.l.unscopeDescoperButton).toBeEnabled({ timeout: 15_000 });
  }

  async expectUnscopeDescoperButtonDisabled(): Promise<void> {
    await expect(this.l.unscopeDescoperButton).toBeDisabled({ timeout: 15_000 });
  }

  async cancelUnscopePopup(): Promise<void> {
    await this.l.unscopePopupCancelButton.click();
    await this.waitForOSLoad();
  }

  // ==================== DOC Detail — Action Plan tab ====================

  async clickActionPlanTab(): Promise<void> {
    await this.waitForOSLoad();

    const panelVisible = await this.l.actionPlanPanel.isVisible().catch(() => false);
    if (panelVisible) {
      return;
    }

    await this.l.actionPlanTab.waitFor({ state: 'visible', timeout: 30_000 });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.l.actionPlanTab.click({ force: attempt > 1 });
      await this.waitForOSLoad();

      if (await this.l.actionPlanPanel.isVisible().catch(() => false)) {
        return;
      }
    }

    await this.l.actionPlanPanel.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async expectActionPlanTitleVisible(): Promise<void> {
    await expect(this.l.actionPlanTitle).toBeVisible({ timeout: 15_000 });
  }

  async expectActionPlanControlsVisible(): Promise<void> {
    await expect(this.l.actionPlanSearchInput).toBeVisible({ timeout: 15_000 });
    await expect(this.l.actionPlanShowOpenOnly).toBeVisible({ timeout: 15_000 });
    await expect(this.l.actionPlanResetButton).toBeVisible({ timeout: 15_000 });
  }

  async expectActionPlanGridColumnHeaders(): Promise<void> {
    const expected = ['Action Name', 'Description', 'Status', 'Due Date', 'Assignee', 'Findings'];
    for (const header of expected) {
      await expect(this.l.actionPlanGrid.getByRole('columnheader', { name: header })).toBeVisible({ timeout: 15_000 });
    }
  }

  async hasActionPlanRows(): Promise<boolean> {
    return this.l.actionPlanDataRows.first().isVisible().catch(() => false);
  }

  async getActionPlanRowCount(): Promise<number> {
    return this.l.actionPlanDataRows.count();
  }

  async getActionPlanRowText(rowIndex = 0): Promise<string> {
    const row = this.l.actionPlanDataRows.nth(rowIndex);
    await expect(row).toBeVisible({ timeout: 15_000 });
    return (await row.textContent())?.replace(/\s+/g, ' ').trim() ?? '';
  }

  async expectFirstActionNameLinkVisible(): Promise<void> {
    await expect(this.l.actionPlanDataRows.first().getByRole('link').first()).toBeVisible({ timeout: 15_000 });
  }

  async expectAnyFindingLinkVisible(): Promise<void> {
    await expect(this.l.actionPlanDataRows.getByRole('link', { name: /Finding/i }).first()).toBeVisible({ timeout: 15_000 });
  }

  async searchActionPlan(query: string): Promise<void> {
    await this.l.actionPlanSearchInput.fill(query);
    await this.waitForOSLoad();
  }

  async toggleActionPlanShowOpenOnly(enable: boolean): Promise<void> {
    await this.l.actionPlanShowOpenOnly.setChecked(enable);
    await this.waitForOSLoad();
  }

  async resetActionPlanFilters(): Promise<void> {
    await this.l.actionPlanResetButton.click();
    await this.waitForOSLoad();
    // Wait for the grid to repopulate after the reset clears any active filters.
    await this.l.actionPlanDataRows.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
  }

  async hasActionPlanNoResultsMessage(): Promise<boolean> {
    return this.l.actionPlanNoResultsMessage.isVisible().catch(() => false);
  }

  // ==================== DOC Detail — Risk Summary tab ====================

  async clickRiskSummaryTab(): Promise<void> {
    await this.waitForOSLoad();

    const panelVisible = await this.l.riskSummaryPanel.isVisible().catch(() => false);
    if (panelVisible) {
      return;
    }

    await this.l.riskSummaryTab.waitFor({ state: 'visible', timeout: 30_000 });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.l.riskSummaryTab.click({ force: attempt > 1 });
      await this.waitForOSLoad();

      if (await this.l.riskSummaryPanel.isVisible().catch(() => false)) {
        return;
      }
    }

    await this.l.riskSummaryPanel.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async expectRiskSummarySectionsVisible(): Promise<void> {
    await expect(this.l.riskSummarySdlTitle).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryPrivacyTitle).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryItsTitle).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryControlsTitle).toBeVisible({ timeout: 15_000 });
  }

  async expectRiskSummarySdlFcsrContentVisible(): Promise<void> {
    await expect(this.l.riskSummarySdlDecisionLabel).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummarySdlCommentsLabel).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummarySdlLinkLabel).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryLinks.first()).toBeVisible({ timeout: 15_000 });
  }

  async expectRiskSummaryPrivacyContentVisible(): Promise<void> {
    await expect(this.l.riskSummaryPrivacyDecisionLabel).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryPrivacyCommentsLabel).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryPrivacyLinkLabel).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryLinks.nth(1)).toBeVisible({ timeout: 15_000 });
  }

  async expectRiskSummaryItsControlSummaryVisible(): Promise<void> {
    await expect(this.l.riskSummaryOverallRiskLabel).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryItsCommentLabel).toBeVisible({ timeout: 15_000 });
  }

  async hasRiskSummaryNoResultsMessage(): Promise<boolean> {
    return this.l.riskSummaryNoResultsMessage.isVisible().catch(() => false);
  }

  async getRiskSummaryPanelText(): Promise<string> {
    await expect(this.l.riskSummaryPanel).toBeVisible({ timeout: 15_000 });
    return (await this.l.riskSummaryPanel.textContent())?.replace(/\s+/g, ' ').trim() ?? '';
  }

  // ==================== DOC Detail — View History ====================

  async clickViewHistory(): Promise<void> {
    await this.l.viewHistoryLink.waitFor({ state: 'visible', timeout: 15_000 });
    await this.l.viewHistoryLink.click();
    await this.waitForOSLoad();
  }

  async expectHistoryDialogVisible(): Promise<void> {
    await expect(this.l.historyDialog).toBeVisible({ timeout: 30_000 });
  }

  async expectHistoryGridVisible(): Promise<void> {
    await expect(this.l.historyGrid).toBeVisible({ timeout: 30_000 });
  }

  async expectHistoryGridHasRows(): Promise<void> {
    // historyGrid is a <table>; check that at least one tbody tr exists
    await expect(this.l.historyGrid.locator('tbody tr').first()).toBeVisible({ timeout: 30_000 });
  }

  async expectHistoryGridColumnHeaders(): Promise<void> {
    const expected = ['Date', 'User', 'Activity', 'Description'];
    for (const header of expected) {
      await expect(
        this.l.historyGrid.locator('th').filter({ hasText: header }),
      ).toBeVisible({ timeout: 15_000 });
    }
  }

  async expectHistoryFiltersVisible(): Promise<void> {
    await expect(this.l.historySearchInput).toBeVisible({ timeout: 15_000 });
    await expect(this.l.historyActivityFilter).toBeVisible({ timeout: 15_000 });
    await expect(this.l.historySearchButton).toBeVisible({ timeout: 15_000 });
    await expect(this.l.historyResetButton).toBeVisible({ timeout: 15_000 });
  }

  async expectHistoryDateRangeInputsVisible(): Promise<void> {
    // The date range uses a flatpickr component with a single visible input.
    // The "from" and "to" dates are selected from the same calendar popup, not via two separate text inputs.
    await expect(this.l.historyDateFromInput).toBeVisible({ timeout: 15_000 });
  }

  async getHistoryRowCount(): Promise<number> {
    return this.l.historyGrid.locator('tbody tr').count();
  }

  async clickHistorySearchButton(): Promise<void> {
    await this.l.historySearchButton.click();
    await this.waitForOSLoad();
  }

  async selectHistoryActivityFilter(activityLabel: string): Promise<void> {
    await this.l.historyActivityFilter.selectOption({ label: activityLabel });
    await this.waitForOSLoad();
  }

  async clickHistoryResetFilters(): Promise<void> {
    await this.l.historyResetButton.click();
    await this.waitForOSLoad();
  }

  async closeHistoryDialog(): Promise<void> {
    await this.l.historyCloseButton.waitFor({ state: 'visible', timeout: 15_000 });
    await this.l.historyCloseButton.click();
    await this.waitForOSLoad();
  }

  // ==================== DOC Detail — Certification Decision tab ====================

  async clickCertificationDecisionTab(): Promise<void> {
    await this.waitForOSLoad();

    // Use aria-selected to detect whether the tab is already active
    const isAlreadyActive = await this.l.certificationDecisionTab
      .getAttribute('aria-selected')
      .catch(() => null);
    if (isAlreadyActive === 'true') return;

    await this.l.certificationDecisionTab.waitFor({ state: 'visible', timeout: 30_000 });
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.l.certificationDecisionTab.click({ force: attempt > 1 });
      await this.waitForOSLoad();

      const isNowActive = await this.l.certificationDecisionTab
        .getAttribute('aria-selected')
        .catch(() => null);
      if (isNowActive === 'true') return;
    }

    await this.l.certDecisionPanel.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** True when the "Propose Decision" action button is visible (no decision set yet). */
  async hasProposeDecisionButton(): Promise<boolean> {
    return this.l.proposeDecisionButton.isVisible().catch(() => false);
  }

  /** True when the warning text about a missing proposed decision is visible. */
  async hasCertDecisionWarning(): Promise<boolean> {
    return this.l.certDecisionWarningText.isVisible().catch(() => false);
  }

  /**
   * Asserts that at least one of the decision-action buttons is visible:
   * – "Propose Decision" (no decision set) OR "Edit" (decision already saved).
   */
  async expectProposeOrEditDecisionButtonVisible(): Promise<void> {
    // Wait up to 15s for at least one of the action buttons to appear.
    // The cert decision panel content is rendered asynchronously by OutSystems
    // after the tab becomes active, so an immediate isVisible() check can return
    // false even when the page is still hydrating.
    const hasProposeBtn = await this.l.proposeDecisionButton
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (hasProposeBtn) return; // fast path

    // "Edit" button for an existing decision – scoped inside the cert decision panel
    const hasEditBtn = await this.l.certDecisionPanel
      .getByRole('button', { name: 'Edit' })
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    expect(
      hasProposeBtn || hasEditBtn,
      'Expected either "Propose Decision" or "Edit" button to be visible on the Certification Decision tab',
    ).toBe(true);
  }

  async expectSubmitForApprovalButtonVisible(): Promise<void> {
    await expect(this.l.submitForApprovalButton).toBeVisible({ timeout: 15_000 });
  }

  /** Asserts that all three Risk Summary cards are visible on the Certification Decision tab. */
  async expectCertRiskSummaryCardsVisible(): Promise<void> {
    // certDecisionItsCardTitle uses a case-insensitive regex to handle "ITS Control Summary"
    // or "ITS CONTROL SUMMARY" — whichever the cert decision tabpanel renders.
    await expect(this.l.certDecisionItsCardTitle).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummarySdlTitle).toBeVisible({ timeout: 15_000 });
    await expect(this.l.riskSummaryPrivacyTitle).toBeVisible({ timeout: 15_000 });
  }

  async expectUnresolvedFindingsSectionVisible(): Promise<void> {
    await expect(this.l.unresolvedFindingsSection).toBeVisible({ timeout: 15_000 });
  }

  async hasUnresolvedFindingsGrid(): Promise<boolean> {
    return this.l.unresolvedFindingsGrid.isVisible().catch(() => false);
  }

  async expectDocApprovalsSectionVisible(): Promise<void> {
    await expect(this.l.docApprovalsSection).toBeVisible({ timeout: 15_000 });
  }

  async hasDocApprovalsSection(): Promise<boolean> {
    return this.l.docApprovalsSection.isVisible().catch(() => false);
  }
}

