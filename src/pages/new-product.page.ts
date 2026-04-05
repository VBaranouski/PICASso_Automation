import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { newProductLocators, type NewProductLocators } from '@locators/new-product.locators';

type TeamRole =
  | 'Product Owner'
  | 'Security Manager'
  | 'Security and Data Protection Advisor'
  | 'Process Quality Leader';

export class NewProductPage extends BasePage {
  readonly url = '/GRC_PICASso/ProductDetail?ProductId=0';

  private static readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ] as const;

  private readonly l: NewProductLocators;

  constructor(page: Page) {
    super(page);
    this.l = newProductLocators(page);
  }

  // --- Public locator accessors (tests access these directly) ---

  get breadcrumb(): Locator            { return this.l.breadcrumb; }
  get productHeading(): Locator        { return this.l.productHeading; }
  get productId(): Locator             { return this.l.productId; }
  get productStatus(): Locator         { return this.l.productStatus; }

  get productDetailsTab(): Locator     { return this.l.productDetailsTab; }
  get releasesTab(): Locator           { return this.l.releasesTab; }
  get noReleasesMessage(): Locator     { return this.l.noReleasesMessage; }
  get createReleaseButton(): Locator   { return this.l.createReleaseButton; }
  get releasesGrid(): Locator          { return this.l.releasesGrid; }

  get sectionTitle(): Locator          { return this.l.sectionTitle; }
  get productNameInput(): Locator      { return this.l.productNameInput; }
  get productStateSelect(): Locator    { return this.l.productStateSelect; }
  get productDefinitionSelect(): Locator { return this.l.productDefinitionSelect; }
  get productTypeSelect(): Locator     { return this.l.productTypeSelect; }
  get digitalOfferCheckbox(): Locator  { return this.l.digitalOfferCheckbox; }
  get vestaIdInput(): Locator                 { return this.l.vestaIdInput; }
  get docItOwnerSearchBox(): Locator          { return this.l.docItOwnerSearchBox; }
  get docProjectManagerSearchBox(): Locator   { return this.l.docProjectManagerSearchBox; }
  get commercialRefInput(): Locator    { return this.l.commercialRefInput; }
  get dataProtectionCheckbox(): Locator { return this.l.dataProtectionCheckbox; }
  get brandLabelCheckbox(): Locator    { return this.l.brandLabelCheckbox; }

  get productDescriptionToggle(): Locator { return this.l.productDescriptionToggle; }
  get productDescriptionEditor(): Locator { return this.l.productDescriptionEditor; }

  get productOrganizationTab(): Locator          { return this.l.productOrganizationTab; }
  get productTeamTab(): Locator                  { return this.l.productTeamTab; }
  get securitySummaryTab(): Locator              { return this.l.securitySummaryTab; }
  get productConfigurationTab(): Locator         { return this.l.productConfigurationTab; }
  get digitalOfferCertificationTab(): Locator    { return this.l.digitalOfferCertificationTab; }

  get orgLevel1Select(): Locator   { return this.l.orgLevel1Select; }
  get orgLevel2Select(): Locator   { return this.l.orgLevel2Select; }
  get orgLevel3Select(): Locator   { return this.l.orgLevel3Select; }
  get crossOrgCheckbox(): Locator  { return this.l.crossOrgCheckbox; }

  get productOwnerLabel(): Locator    { return this.l.productOwnerLabel; }
  get securityManagerLabel(): Locator { return this.l.securityManagerLabel; }
  get sdpaLabel(): Locator            { return this.l.sdpaLabel; }
  get pqlLabel(): Locator             { return this.l.pqlLabel; }

  get resetFormButton(): Locator   { return this.l.resetFormButton; }
  get cancelButton(): Locator      { return this.l.cancelButton; }
  get saveButton(): Locator        { return this.l.saveButton; }

  get editProductButton(): Locator    { return this.l.editProductButton; }
  get viewHistoryLink(): Locator      { return this.l.viewHistoryLink; }
  get actionsManagementLink(): Locator { return this.l.actionsManagementLink; }

  get createReleaseDialog(): Locator                  { return this.l.createReleaseDialog; }
  get newProductReleaseRadio(): Locator               { return this.l.newProductReleaseRadio; }
  get existingProductReleaseRadio(): Locator          { return this.l.existingProductReleaseRadio; }
  get releaseVersionInput(): Locator                  { return this.l.releaseVersionInput; }
  get targetReleaseDateInput(): Locator               { return this.l.targetReleaseDateInput; }
  get continuousPenetrationTestingCheckbox(): Locator { return this.l.continuousPenetrationTestingCheckbox; }
  get changeSummaryInput(): Locator                   { return this.l.changeSummaryInput; }
  get createAndScopeButton(): Locator                 { return this.l.createAndScopeButton; }

  // ==================== Product Information ====================

  async fillProductName(name: string): Promise<void> {
    await this.l.productNameInput.fill(name);
  }

  /**
   * Waits for the OutSystems partial refresh after Product Type selection.
   * Product Type change triggers a server-side AJAX that replaces DOM elements.
   * We detect completion by marking the input element and waiting until the mark persists.
   */
  private async waitForProductTypeRefresh(): Promise<void> {
    await this.l.productNameInput.waitFor({ state: 'visible', timeout: 30_000 });

    await this.page.waitForFunction(`
      (() => {
        const input = document.querySelector('input[placeholder="Product Name"]');
        if (!input) return false;
        if (!input.dataset.__pw_stable) { input.dataset.__pw_stable = '1'; return false; }
        return true;
      })()
    `, { timeout: 30_000, polling: 500 });

    await this.l.productNameInput.evaluate('(el) => delete el.dataset.__pw_stable');
  }

  /**
   * Fills product name with retry. OutSystems late AJAX may replace the input
   * DOM element after fill, losing the value. Retries up to 3 times.
   */
  private async fillProductNameWithRetry(name: string, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await this.l.productNameInput.click();
      await this.l.productNameInput.fill(name);

      try {
        await expect(this.l.productNameInput).toHaveValue(name, { timeout: 6_000 });
        return;
      } catch {
        if (attempt === maxRetries) throw new Error(
          `Product name was cleared ${maxRetries} times by OutSystems AJAX. ` +
          `The partial refresh may be slower than expected.`,
        );
        await this.l.productNameInput.waitFor({ state: 'visible', timeout: 10_000 });
      }
    }
  }

  async selectProductState(label: string): Promise<void> {
    await expect(this.l.productStateSelect).toBeEnabled({ timeout: 30_000 });
    await this.l.productStateSelect.selectOption({ label });
  }

  async selectProductDefinition(label: string): Promise<void> {
    await expect(this.l.productDefinitionSelect).toBeEnabled({ timeout: 30_000 });
    await this.l.productDefinitionSelect.selectOption({ label });
  }

  async selectProductType(label: string): Promise<void> {
    await expect(this.l.productTypeSelect).toBeEnabled({ timeout: 30_000 });
    await this.l.productTypeSelect.selectOption({ label });
  }

  private async getSelectedOptionLabel(select: Locator): Promise<string> {
    return select.evaluate((element) => {
      const selectedOption = element.querySelector('option:checked');
      return selectedOption?.textContent?.trim() ?? '';
    });
  }

  async getSelectedProductState(): Promise<string> {
    return this.getSelectedOptionLabel(this.l.productStateSelect);
  }

  async getSelectedProductDefinition(): Promise<string> {
    return this.getSelectedOptionLabel(this.l.productDefinitionSelect);
  }

  async getSelectedProductType(): Promise<string> {
    return this.getSelectedOptionLabel(this.l.productTypeSelect);
  }

  async fillDescription(text: string): Promise<void> {
    await this.l.productDescriptionEditor.click();
    await this.l.productDescriptionEditor.fill(text);
  }

  async fillCommercialRefNumber(value: string): Promise<void> {
    await this.l.commercialRefInput.fill(value);
  }

  async toggleDigitalOffer(): Promise<void> {
    await this.l.digitalOfferCheckbox.click();
  }

  /**
   * Fills the Digital Offer Certification (DOC) section that appears after toggling Digital Offer.
   * DOC searchboxes (IT Owner, Project Manager) are directly visible — no edit-link click needed.
   * Uses pressSequentially() to trigger the OutSystems search API.
   */
  async fillDigitalOfferDetails(data: {
    vestaId: string;
    searchQuery: string;
    itOwnerFullName: string;
    projectManagerFullName: string;
  }): Promise<void> {
    await this.l.vestaIdInput.fill(data.vestaId);

    // Scope results to their gridcell so the same person's name in adjacent cells doesn't cause
    // .first() to match the wrong element (e.g. IT Owner display after selection).
    const itOwnerCell = this.page.getByRole('gridcell', { name: /IT Owner/ });
    await this.l.docItOwnerSearchBox.pressSequentially(data.searchQuery, { delay: 150 });
    const itOwnerResult = itOwnerCell.getByText(data.itOwnerFullName, { exact: true }).first();
    await itOwnerResult.waitFor({ state: 'visible', timeout: 30_000 });
    await itOwnerResult.click();

    // Wait for IT Owner selection to settle before typing in Project Manager field.
    // OutSystems updates the DOC section after each selection, replacing DOM elements.
    await this.l.docProjectManagerSearchBox.waitFor({ state: 'visible', timeout: 30_000 });
    const pmCell = this.page.getByRole('gridcell', { name: /Project Manager/ });
    await this.l.docProjectManagerSearchBox.pressSequentially(data.searchQuery, { delay: 150 });
    const pmResult = pmCell.getByText(data.projectManagerFullName, { exact: true }).first();
    await pmResult.waitFor({ state: 'visible', timeout: 30_000 });
    await pmResult.click();
  }

  async toggleDataProtection(): Promise<void> {
    await this.l.dataProtectionCheckbox.click();
  }

  async toggleBrandLabel(): Promise<void> {
    // Brand Label toggle triggers an OutSystems partial refresh that clears the Vendor field.
    // Capture the vendor value before toggling and restore it if cleared.
    const vendorValue = await this.l.vendorInput.inputValue().catch(() => '');
    await this.l.brandLabelCheckbox.click();
    await this.waitForOSLoad();

    if (vendorValue) {
      const currentValue = await this.l.vendorInput.inputValue().catch(() => '');
      if (!currentValue) {
        await this.l.vendorInput.fill(vendorValue);
      }
    }
  }

  // ==================== Product Organization ====================

  async clickProductOrganizationTab(): Promise<void> {
    await this.l.productOrganizationTab.click();
  }

  async selectOrgLevel1(label: string): Promise<void> {
    // Org Level 1 starts disabled and loads asynchronously
    await expect(this.l.orgLevel1Select).toBeEnabled({ timeout: 30_000 });
    await this.l.orgLevel1Select.selectOption({ label });
  }

  async selectOrgLevel2(label: string): Promise<void> {
    // Org Level 2 becomes enabled after Org Level 1 is selected
    await expect(this.l.orgLevel2Select).toBeEnabled({ timeout: 30_000 });
    await this.l.orgLevel2Select.selectOption({ label });
  }

  async selectOrgLevel3(label: string): Promise<void> {
    // Org Level 3 becomes enabled after Org Level 2 is selected
    await expect(this.l.orgLevel3Select).toBeEnabled({ timeout: 30_000 });
    await this.l.orgLevel3Select.selectOption({ label });
  }

  async getSelectedOrgLevel1(): Promise<string> {
    return this.getSelectedOptionLabel(this.l.orgLevel1Select);
  }

  async getSelectedOrgLevel2(): Promise<string> {
    return this.getSelectedOptionLabel(this.l.orgLevel2Select);
  }

  async getSelectedOrgLevel3(): Promise<string> {
    return this.getSelectedOptionLabel(this.l.orgLevel3Select);
  }

  async toggleCrossOrgDevelopment(): Promise<void> {
    await this.l.crossOrgCheckbox.click();
  }

  // ==================== Product Team ====================

  async clickProductTeamTab(): Promise<void> {
    await this.l.productTeamTab.click();
    await expect(this.page.getByText('PRODUCT TEAM', { exact: true })).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Assigns a team member to a specific role using the OutSystems user lookup widget.
   *
   * Pattern:
   *   1. Click the edit link (pencil icon) next to the role label
   *   2. A searchbox "Type 4 letters" appears
   *   3. Type at least 4 characters slowly to trigger the search API
   *   4. Select the matching person from the dropdown
   */
  async assignTeamMember(role: TeamRole, searchQuery: string, fullName: string): Promise<void> {
    const roleContainer = this.getRoleSectionLocator(role);

    const editLink = roleContainer.getByRole('link').first();
    await editLink.waitFor({ state: 'visible', timeout: 240_000 });
    await editLink.click();

    const searchBox = roleContainer.getByRole('searchbox', { name: 'Type 4 letters' });
    await searchBox.waitFor({ state: 'visible', timeout: 30_000 });
    await searchBox.pressSequentially(searchQuery, { delay: 150 });

    // Scope to roleContainer to avoid matching names in previously assigned roles
    const resultItem = roleContainer.getByText(fullName, { exact: true }).first();
    await resultItem.waitFor({ state: 'visible', timeout: 30_000 });
    await resultItem.click();

    // Wait for OutSystems to process the selection — searchbox disappears when committed
    await searchBox.waitFor({ state: 'hidden', timeout: 30_000 });
  }

  /**
   * Returns a locator scoped to the container of a specific team role.
   * DOM structure: DIV.columns-item > LABEL.mandatory "Role" + DIV.OSBlockWidget
   * The asterisk (*) shown in UI is CSS-generated via .mandatory class, NOT in text content.
   */
  private getRoleSectionLocator(role: TeamRole): Locator {
    return this.page.getByText(role, { exact: true }).locator('..');
  }

  getTeamMemberDisplayName(role: TeamRole): Locator {
    const roleContainer = this.getRoleSectionLocator(role);
    return roleContainer.getByText(/^[A-Z]/).first();
  }

  // ==================== Assertions ====================

  async expectNewProductFormLoaded(): Promise<void> {
    await this.l.productNameInput.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async expectProductSaved(): Promise<void> {
    // Edit Product button is the save-completion readiness signal — wait for it first
    await expect(this.l.editProductButton).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByText(/ID:PIC-(?!0)\d+/)).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText('Active')).toBeVisible({ timeout: 30_000 });
  }

  async expectFormVisible(): Promise<void> {
    await expect(this.l.productNameInput).toBeVisible();
    await expect(this.l.sectionTitle).toBeVisible();
  }

  async expectOrgLevelsDisabled(): Promise<void> {
    await expect(this.l.orgLevel1Select).toBeDisabled();
    await expect(this.l.orgLevel2Select).toBeDisabled();
    await expect(this.l.orgLevel3Select).toBeDisabled();
  }

  async expectOrgLevel2Enabled(timeout = 40_000): Promise<void> {
    await expect(this.l.orgLevel2Select).toBeEnabled({ timeout });
  }

  async expectOrgLevel3Enabled(timeout = 40_000): Promise<void> {
    await expect(this.l.orgLevel3Select).toBeEnabled({ timeout });
  }

  async expectDigitalOfferCertificationTabVisible(): Promise<void> {
    await expect(this.l.digitalOfferCertificationTab).toBeVisible({ timeout: 30_000 });
  }

  async expectProductDetailLoaded(): Promise<void> {
    await this.l.editProductButton.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(this.page).toHaveURL(/.*ProductDetail/);
    await expect(this.l.editProductButton).toBeVisible();
  }

  // ==================== Product Detail View-Mode Assertions ====================

  async expectProductDetailHeaderVisible(productName: string): Promise<void> {
    await expect(this.page.getByText(productName).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.l.productId).toBeVisible({ timeout: 30_000 });
    await expect(this.l.editProductButton).toBeVisible({ timeout: 30_000 });
  }

  async expectProductStatusBadge(status: string): Promise<void> {
    await expect(this.page.getByText(status, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  }

  async expectViewHistoryLinkVisible(): Promise<void> {
    await expect(this.l.viewHistoryLink).toBeVisible({ timeout: 30_000 });
  }

  async expectActionsManagementLinkVisible(): Promise<void> {
    await expect(this.l.actionsManagementLink).toBeVisible({ timeout: 30_000 });
  }

  async expectProductDetailViewMode(data: {
    name: string;
    state: string;
    definition: string;
    type: string;
  }): Promise<void> {
    await expect(this.page.getByText(data.name).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText(data.state).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText(data.definition).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText(data.type).first()).toBeVisible({ timeout: 30_000 });
  }

  async expectDigitalOfferValue(value: 'Yes' | 'No'): Promise<void> {
    const digitalOfferSection = this.page.getByText('Digital Offer', { exact: true }).locator('..');
    await expect(digitalOfferSection.locator('..').getByText(value)).toBeVisible({ timeout: 30_000 });
  }

  async expectDataProtectionValue(value: 'Yes' | 'No'): Promise<void> {
    const section = this.page.getByText('Data Protection & Privacy').locator('..').locator('..');
    await expect(section.getByText(value)).toBeVisible({ timeout: 15_000 });
  }

  async expectBrandLabelValue(value: 'Yes' | 'No'): Promise<void> {
    const section = this.page.getByText('Brand Label').locator('..');
    await expect(section.getByText(value)).toBeVisible({ timeout: 15_000 });
  }

  async expectProductDescriptionContains(text: string): Promise<void> {
    // In view mode, description is inside PRODUCT DESCRIPTION accordion's tabpanel as a paragraph
    // In edit mode, it's inside the Rich Text Editor
    const viewPanel = this.page.getByRole('tab', { name: /PRODUCT DESCRIPTION/ })
      .locator('..').locator('[role="tabpanel"]');
    await expect(viewPanel).toContainText(text, { timeout: 30_000 });
  }

  async getDescriptionText(): Promise<string> {
    // In edit mode the CKEditor textbox contains only the actual content;
    // in view mode we fall back to the accordion tabpanel.
    const editor = this.page.getByRole('textbox', { name: /Rich Text Editor/ });
    if (await editor.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return (await editor.textContent())?.trim() ?? '';
    }
    const viewPanel = this.page.getByRole('tab', { name: /PRODUCT DESCRIPTION/ })
      .locator('..').locator('[role="tabpanel"]');
    return (await viewPanel.textContent())?.trim() ?? '';
  }

  async expectOrgLevelValues(data: {
    level1: string;
    level2: string;
    level3?: string;
  }): Promise<void> {
    await expect(this.page.getByText(data.level1).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByText(data.level2).first()).toBeVisible({ timeout: 30_000 });
    if (data.level3) {
      await expect(this.page.getByText(data.level3).first()).toBeVisible({ timeout: 30_000 });
    }
  }

  async expectBottomTabsVisible(): Promise<void> {
    await expect(this.l.productOrganizationTab).toBeVisible({ timeout: 30_000 });
    await expect(this.l.productTeamTab).toBeVisible({ timeout: 30_000 });
    await expect(this.l.securitySummaryTab).toBeVisible({ timeout: 30_000 });
    await expect(this.l.productConfigurationTab).toBeVisible({ timeout: 30_000 });
  }

  async isDataProtectionChecked(): Promise<boolean> {
    return this.l.dataProtectionCheckbox.isChecked();
  }

  async isBrandLabelChecked(): Promise<boolean> {
    return this.l.brandLabelCheckbox.isChecked();
  }

  async expectResetFormButtonVisible(): Promise<void> {
    await expect(this.l.resetFormButton).toBeVisible({ timeout: 30_000 });
  }

  async expectEditModeVisible(): Promise<void> {
    await expect(this.l.productNameInput).toBeVisible({ timeout: 30_000 });
    await expect(this.l.productNameInput).toBeEnabled({ timeout: 30_000 });
    await expect(this.l.saveButton).toBeVisible({ timeout: 30_000 });
  }

  async expectProductNameVisible(name: string): Promise<void> {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async expectProductIdVisible(): Promise<void> {
    await expect(this.l.productId).toBeVisible();
  }

  async expectProductNameValue(expected: string): Promise<void> {
    await expect(this.l.productNameInput).toHaveValue(expected);
  }

  async expectCommercialRefNumberValue(expected: string): Promise<void> {
    await expect(this.l.commercialRefInput).toHaveValue(expected);
  }

  async clickReleasesTab(): Promise<void> {
    await this.l.releasesTab.waitFor({ state: 'visible', timeout: 30_000 });
    await this.l.releasesTab.click();
    await this.l.createReleaseButton.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async isNoReleasesMessageVisible(): Promise<boolean> {
    return this.l.noReleasesMessage.isVisible().catch(() => false);
  }

  async expectNoReleasesStateVisible(): Promise<void> {
    await expect(this.l.noReleasesMessage).toBeVisible({ timeout: 30_000 });
    await expect(this.l.createReleaseButton).toBeVisible();
  }

  async expectNoReleasesStateHidden(): Promise<void> {
    await expect(this.l.noReleasesMessage).toBeHidden();
  }

  async clickCreateRelease(): Promise<void> {
    await this.l.createReleaseButton.click();
    await this.l.createReleaseDialog.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async clickCreateAndScope(): Promise<void> {
    await this.l.createAndScopeButton.click();
  }

  async expectCreateReleaseDialogVisible(): Promise<void> {
    await expect(this.l.createReleaseDialog).toBeVisible({ timeout: 30_000 });
    await expect(this.l.releaseVersionInput).toBeVisible();
    await expect(this.l.targetReleaseDateInput).toBeVisible();
    await expect(this.l.changeSummaryInput).toBeVisible();
  }

  async expectCreateReleaseValidation(): Promise<void> {
    await expect(this.l.releaseValidationAlert).toContainText('Please review the necessary fields');
    await expect(this.l.requiredFieldError).toHaveCount(3);
  }

  async fillReleaseVersion(version: string): Promise<void> {
    await this.l.releaseVersionInput.fill(version);
  }

  async fillReleaseChangeSummary(summary: string): Promise<void> {
    await this.l.changeSummaryInput.fill(summary);
  }

  async toggleContinuousPenetrationTesting(): Promise<void> {
    await this.l.continuousPenetrationTestingCheckbox.click();
  }

  async selectReleaseTargetDate(targetDate: Date): Promise<void> {
    const monthName = NewProductPage.monthNames[targetDate.getMonth()];
    const year = targetDate.getFullYear();
    const day = targetDate.getDate();

    await this.l.targetReleaseDateInput.click();
    await this.l.releaseDateMonthSelect.selectOption({ label: monthName });
    await this.l.releaseDateYearSpinbutton.fill(String(year));
    await this.l.releaseDateYearSpinbutton.press('Enter');

    const dateLabel = `${monthName} ${day}, ${year}`;
    const dayCell = this.page.locator(`[aria-label="${dateLabel}"]`).first();
    await dayCell.waitFor({ state: 'visible', timeout: 10_000 });
    await dayCell.click();
  }

  async createFirstRelease(data: {
    releaseVersion: string;
    targetDate: Date;
    changeSummary: string;
    continuousPenetrationTesting?: boolean;
  }): Promise<void> {
    await this.fillReleaseVersion(data.releaseVersion);
    await this.selectReleaseTargetDate(data.targetDate);
    await this.fillReleaseChangeSummary(data.changeSummary);
    if (data.continuousPenetrationTesting) {
      await this.toggleContinuousPenetrationTesting();
    }
    await this.clickCreateAndScope();
  }

  async expectReleaseListed(releaseVersion: string, status: string): Promise<void> {
    await this.l.releasesGrid.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(this.l.noReleasesMessage).toBeHidden();
    await expect(this.page.getByRole('link', { name: releaseVersion })).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByRole('gridcell', { name: status })).toBeVisible({ timeout: 30_000 });
  }

  // ==================== Form Actions ====================

  async clickSave(): Promise<void> {
    await this.l.saveButton.click();
  }

  /**
   * Handles an OutSystems confirmation dialog if one is visible.
   * Looks for a dialog with a "Save" or "OK" button and clicks it.
   */
  async handleConfirmDialogIfVisible(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    const dialogSaveBtn = dialog.getByRole('button', { name: 'Save' });
    const dialogOkBtn = dialog.getByRole('button', { name: 'OK' });
    if (await dialogSaveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await dialogSaveBtn.click();
    } else if (await dialogOkBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await dialogOkBtn.click();
    }
  }

  /**
   * Clicks Save and handles an optional OutSystems confirmation dialog.
   * Some field toggles (Data Protection, Digital Offer) trigger a "Save Product"
   * dialog requiring explicit confirmation before the form completes saving.
   */
  async clickSaveAndHandleConfirmDialog(): Promise<void> {
    await this.l.saveButton.click();
    await this.handleConfirmDialogIfVisible();
    await this.waitForOSLoad();
  }

  async clickCancel(): Promise<void> {
    await this.l.cancelButton.click();
  }

  /**
   * Clicks Cancel and confirms the "Leave Page" OutSystems modal dialog.
   * The dialog appears when there are unsaved changes on the form.
   */
  async clickCancelAndConfirmLeave(): Promise<void> {
    await this.l.cancelButton.click();
    const leaveButton = this.page.getByRole('button', { name: 'Leave' });
    await expect(leaveButton).toBeVisible({ timeout: 20_000 });
    await leaveButton.click();
  }

  async clickResetForm(): Promise<void> {
    await this.l.resetFormButton.click();
  }

  async clickEditProduct(): Promise<void> {
    await this.l.editProductButton.click();
  }

  async clickEditProductAndWaitForForm(): Promise<void> {
    await this.clickEditProduct();
    await this.expectEditModeVisible();
  }

  async getProductNameValue(): Promise<string> {
    return this.l.productNameInput.inputValue();
  }

  async getCommercialRefNumberValue(): Promise<string> {
    return this.l.commercialRefInput.inputValue();
  }

  // ==================== Composite Helpers ====================

  /**
   * Selects the three product dropdown values (State, Definition, Type).
   * Separated from fillProductInformation so it can be re-applied before save
   * if OutSystems partial refreshes during Org/Team operations reset them.
   */
  async selectProductDropdowns(data: {
    state: string;
    definition: string;
    type: string;
  }): Promise<void> {
    await this.selectProductState(data.state);
    await this.selectProductDefinition(data.definition);
    await this.selectProductType(data.type);
  }

  /**
   * Fills all required product information fields in one call.
   * Selects dropdowns first — OutSystems partial refreshes can clear text inputs.
   * Waits for DOM to stabilize after Product Type selection before filling text fields.
   */
  async fillProductInformation(data: {
    name: string;
    state: string;
    definition: string;
    type: string;
    description?: string;
  }): Promise<void> {
    await this.selectProductDropdowns(data);
    await this.waitForProductTypeRefresh();
    await this.fillProductNameWithRetry(data.name);
    if (data.description) {
      await this.fillDescription(data.description);
    }
  }

  async fillProductOrganization(data: {
    level1: string;
    level2: string;
    level3?: string;
  }): Promise<void> {
    await this.clickProductOrganizationTab();
    await this.selectOrgLevel1(data.level1);
    await this.selectOrgLevel2(data.level2);
    if (data.level3) {
      await this.selectOrgLevel3(data.level3);
    }
  }

  async reapplyProductOrganization(data: {
    level1: string;
    level2: string;
    level3?: string;
  }): Promise<void> {
    await this.clickProductOrganizationTab();

    await expect(this.l.orgLevel1Select).toBeEnabled({ timeout: 30_000 });
    await this.l.orgLevel1Select.selectOption({ index: 0 });
    await expect(this.l.orgLevel2Select).toBeDisabled({ timeout: 60_000 });

    await this.selectOrgLevel1(data.level1);
    await expect(this.l.orgLevel2Select).toBeEnabled({ timeout: 60_000 });

    if (data.level2 && data.level2 !== '- Select -') {
      await this.l.orgLevel2Select.selectOption({ label: data.level2 });
    }

    if (data.level3 && data.level3 !== '- Select -') {
      await expect(this.l.orgLevel3Select).toBeEnabled({ timeout: 60_000 });
      await this.l.orgLevel3Select.selectOption({ label: data.level3 });
    }
  }

  async fillProductTeam(data: {
    searchQuery: string;
    fullName: string;
  }): Promise<void> {
    await this.clickProductTeamTab();
    const roles: TeamRole[] = [
      'Product Owner',
      'Security Manager',
      'Security and Data Protection Advisor',
      'Process Quality Leader',
    ];
    for (const role of roles) {
      await this.assignTeamMember(role, data.searchQuery, data.fullName);
    }
  }
}
