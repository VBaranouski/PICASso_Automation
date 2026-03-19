import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Represents the role-based team member lookup widget used in the Product Team section.
 * Each role (Product Owner, Security Manager, etc.) uses an identical widget pattern:
 *   1. Click the edit link (pencil icon) to reveal the searchbox
 *   2. Type at least 4 characters to trigger search
 *   3. Select the person from the dropdown results
 */
type TeamRole =
  | 'Product Owner'
  | 'Security Manager'
  | 'Security and Data Protection Advisor'
  | 'Process Quality Leader';

export class NewProductPage extends BasePage {
  readonly url = '/GRC_PICASso/ProductDetail?ProductId=0';

  // --- Page header ---
  readonly breadcrumb: Locator;
  readonly productHeading: Locator;
  readonly productId: Locator;
  readonly productStatus: Locator;

  // --- Tabs (top level) ---
  readonly productDetailsTab: Locator;
  readonly releasesTab: Locator;

  // --- Product Related Details section ---
  readonly sectionTitle: Locator;
  readonly productNameInput: Locator;
  readonly productStateSelect: Locator;
  readonly productDefinitionSelect: Locator;
  readonly productTypeSelect: Locator;
  readonly digitalOfferCheckbox: Locator;
  readonly commercialRefInput: Locator;
  readonly dataProtectionCheckbox: Locator;
  readonly brandLabelCheckbox: Locator;

  // --- Product Description (collapsible accordion) ---
  readonly productDescriptionToggle: Locator;
  readonly productDescriptionEditor: Locator;

  // --- Bottom section tabs ---
  readonly productOrganizationTab: Locator;
  readonly productTeamTab: Locator;
  readonly securitySummaryTab: Locator;
  readonly productConfigurationTab: Locator;

  // --- Product Organization fields ---
  readonly orgLevel1Select: Locator;
  readonly orgLevel2Select: Locator;
  readonly orgLevel3Select: Locator;
  readonly crossOrgCheckbox: Locator;

  // --- Product Team fields (display values after selection) ---
  readonly productOwnerLabel: Locator;
  readonly securityManagerLabel: Locator;
  readonly sdpaLabel: Locator;
  readonly pqlLabel: Locator;

  // --- Form action buttons ---
  readonly resetFormButton: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  // --- Post-save elements ---
  readonly editProductButton: Locator;
  readonly viewHistoryLink: Locator;
  readonly actionsManagementLink: Locator;

  constructor(page: Page) {
    super(page);

    // Page header
    this.breadcrumb = page.getByRole('navigation', { name: 'breadcrumb' });
    this.productHeading = page.locator('main').getByText('Product Name').first();
    this.productId = page.getByText(/ID:PIC-\d+/);
    this.productStatus = page.getByText('Draft');

    // Top-level tabs
    this.productDetailsTab = page.getByRole('tab', { name: 'Product Details' });
    this.releasesTab = page.getByRole('tab', { name: 'Releases' });

    // Product Related Details
    this.sectionTitle = page.getByText('PRODUCT RELATED DETAILS');
    this.productNameInput = page.getByRole('textbox', { name: 'Product Name*' });
    this.productStateSelect = page.getByRole('combobox', { name: 'Product State*' });
    this.productDefinitionSelect = page.getByRole('combobox', { name: 'Product Definition*' });
    this.productTypeSelect = page.getByRole('combobox', { name: 'Product Type*' });
    this.digitalOfferCheckbox = page.getByText('Digital Offer').locator('..').getByRole('checkbox');
    this.commercialRefInput = page.getByRole('textbox', { name: 'Commercial Reference Number' });
    this.dataProtectionCheckbox = page.getByText('Data Protection & Privacy').locator('..').getByRole('checkbox');
    this.brandLabelCheckbox = page.getByText('Brand Label').locator('..').getByRole('checkbox');

    // Product Description accordion
    this.productDescriptionToggle = page.getByRole('button', { name: /PRODUCT DESCRIPTION/ });
    this.productDescriptionEditor = page.getByRole('textbox', { name: /Rich Text Editor/ });

    // Bottom section tabs
    this.productOrganizationTab = page.getByRole('tab', { name: /Product Organization/ });
    this.productTeamTab = page.getByRole('tab', { name: /Product Team/ });
    this.securitySummaryTab = page.getByRole('tab', { name: /Security Summary/ });
    this.productConfigurationTab = page.getByRole('tab', { name: /Product Configuration/ });

    // Product Organization
    this.orgLevel1Select = page.getByRole('combobox', { name: 'Org Level 1*' });
    this.orgLevel2Select = page.getByRole('combobox', { name: 'Org Level 2*' });
    this.orgLevel3Select = page.getByRole('combobox', { name: /Org Level 3/ });
    this.crossOrgCheckbox = page.getByText('Cross-Organizational Development').locator('..').getByRole('checkbox');

    // Product Team display labels (visible after a person is selected)
    // Note: asterisk is CSS-generated (.mandatory class), not in text content
    this.productOwnerLabel = page.getByText('Product Owner', { exact: true }).locator('..').getByText(/^[A-Z][a-z]+ [A-Z]/);
    this.securityManagerLabel = page.getByText('Security Manager', { exact: true }).locator('..').getByText(/^[A-Z][a-z]+ [A-Z]/);
    this.sdpaLabel = page.getByText('Security and Data Protection Advisor', { exact: true }).locator('..').getByText(/^[A-Z][a-z]+ [A-Z]/);
    this.pqlLabel = page.getByText('Process Quality Leader', { exact: true }).locator('..').getByText(/^[A-Z][a-z]+ [A-Z]/);

    // Form actions
    this.resetFormButton = page.getByRole('button', { name: 'Reset Form' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveButton = page.getByRole('button', { name: 'Save' });

    // Post-save elements
    this.editProductButton = page.getByRole('button', { name: 'Edit Product' });
    this.viewHistoryLink = page.getByRole('link', { name: /View History/ });
    this.actionsManagementLink = page.getByRole('link', { name: 'Actions Management' });
  }

  // ==================== Product Information ====================

  async fillProductName(name: string): Promise<void> {
    await this.productNameInput.fill(name);
  }

  /**
   * Waits for the OutSystems partial refresh after Product Type selection.
   * Product Type change triggers a server-side AJAX that replaces DOM elements.
   * We detect completion by capturing the input element's identity and waiting
   * until it stabilizes (no more DOM replacements for 500ms).
   */
  private async waitForProductTypeRefresh(): Promise<void> {
    await this.productNameInput.waitFor({ state: 'visible', timeout: 30_000 });

    // Wait for DOM to stabilize: mark the element on first poll, then verify
    // the mark persists on subsequent polls. If OutSystems replaces the element,
    // the mark disappears and we re-mark the new element. Stable = mark survives.
    /* eslint-disable max-len */
    await this.page.waitForFunction(`
      (() => {
        const input = document.querySelector('input[placeholder="Product Name"]');
        if (!input) return false;
        if (!input.dataset.__pw_stable) { input.dataset.__pw_stable = '1'; return false; }
        return true;
      })()
    `, { timeout: 30_000, polling: 500 });
    /* eslint-enable max-len */

    // Clean up marker
    await this.productNameInput.evaluate('(el) => delete el.dataset.__pw_stable');
  }

  /**
   * Fills product name with retry. OutSystems late AJAX may replace the input
   * DOM element after fill, losing the value. Retries up to 3 times.
   */
  private async fillProductNameWithRetry(name: string, maxRetries = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await this.productNameInput.click();
      await this.productNameInput.fill(name);

      try {
        await expect(this.productNameInput).toHaveValue(name, { timeout: 6_000 });
        return; // value persisted
      } catch {
        if (attempt === maxRetries) throw new Error(
          `Product name was cleared ${maxRetries} times by OutSystems AJAX. ` +
          `The partial refresh may be slower than expected.`,
        );
        // Wait for potential DOM replacement to settle before retrying
        await this.productNameInput.waitFor({ state: 'visible', timeout: 10_000 });
      }
    }
  }

  async selectProductState(label: string): Promise<void> {
    await expect(this.productStateSelect).toBeEnabled({ timeout: 30_000 });
    await this.productStateSelect.selectOption({ label });
  }

  async selectProductDefinition(label: string): Promise<void> {
    await expect(this.productDefinitionSelect).toBeEnabled({ timeout: 30_000 });
    await this.productDefinitionSelect.selectOption({ label });
  }

  async selectProductType(label: string): Promise<void> {
    await expect(this.productTypeSelect).toBeEnabled({ timeout: 30_000 });
    await this.productTypeSelect.selectOption({ label });
  }

  async fillDescription(text: string): Promise<void> {
    await this.productDescriptionEditor.click();
    await this.productDescriptionEditor.fill(text);
  }

  async fillCommercialRefNumber(value: string): Promise<void> {
    await this.commercialRefInput.fill(value);
  }

  async toggleDigitalOffer(): Promise<void> {
    await this.digitalOfferCheckbox.click();
  }

  async toggleDataProtection(): Promise<void> {
    await this.dataProtectionCheckbox.click();
  }

  async toggleBrandLabel(): Promise<void> {
    await this.brandLabelCheckbox.click();
  }

  // ==================== Product Organization ====================

  async clickProductOrganizationTab(): Promise<void> {
    await this.productOrganizationTab.click();
  }

  async selectOrgLevel1(label: string): Promise<void> {
    // Org Level 1 starts disabled and loads asynchronously
    await expect(this.orgLevel1Select).toBeEnabled({ timeout: 30_000 });
    await this.orgLevel1Select.selectOption({ label });
  }

  async selectOrgLevel2(label: string): Promise<void> {
    // Org Level 2 becomes enabled after Org Level 1 is selected
    await expect(this.orgLevel2Select).toBeEnabled({ timeout: 30_000 });
    await this.orgLevel2Select.selectOption({ label });
  }

  async selectOrgLevel3(label: string): Promise<void> {
    // Org Level 3 becomes enabled after Org Level 2 is selected
    await expect(this.orgLevel3Select).toBeEnabled({ timeout: 30_000 });
    await this.orgLevel3Select.selectOption({ label });
  }

  async toggleCrossOrgDevelopment(): Promise<void> {
    await this.crossOrgCheckbox.click();
  }

  // ==================== Product Team ====================

  async clickProductTeamTab(): Promise<void> {
    await this.productTeamTab.click();
    // Wait for the Product Team tab content to render
    await expect(this.page.getByText('PRODUCT TEAM', { exact: true })).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Assigns a team member to a specific role using the user lookup widget.
   *
   * The OutSystems user lookup pattern:
   *   1. Click the edit link (pencil icon) next to the role label
   *   2. A searchbox "Type 4 letters" appears
   *   3. Type at least 4 characters slowly to trigger the search API
   *   4. Select the matching person from the dropdown
   *
   * @param role - The team role to fill
   * @param searchQuery - At least 4 characters to search (e.g., "Ulad")
   * @param fullName - The full display name to select from results (e.g., "Uladzislau Baranouski")
   */
  async assignTeamMember(role: TeamRole, searchQuery: string, fullName: string): Promise<void> {
    // Each role container holds the label and the lookup widget as siblings.
    // Structure: container > [label "Role*"] + [widget > tooltip + (display value + edit link)]
    const roleContainer = this.getRoleSectionLocator(role);

    // Click the edit link (pencil icon) to reveal the searchbox
    const editLink = roleContainer.getByRole('link').first();
    await editLink.waitFor({ state: 'visible', timeout: 240_000 });
    await editLink.click();

    // Wait for the searchbox to appear and type slowly to trigger OutSystems search API
    const searchBox = roleContainer.getByRole('searchbox', { name: 'Type 4 letters' });
    await searchBox.waitFor({ state: 'visible', timeout: 30_000 });

    await searchBox.pressSequentially(searchQuery, { delay: 150 });

    // Wait for and click the search result WITHIN this role's container.
    // Scoping to roleContainer avoids matching names displayed in previously
    // assigned roles and hidden tooltip spans outside the viewport.
    const resultItem = roleContainer.getByText(fullName, { exact: true }).first();
    await resultItem.waitFor({ state: 'visible', timeout: 30_000 });
    await resultItem.click();
  }

  /**
   * Returns a locator scoped to the container of a specific team role.
   * DOM structure: DIV.columns-item > LABEL.mandatory "Role" + DIV.OSBlockWidget (widget)
   * The asterisk (*) shown in UI is CSS-generated via .mandatory class, NOT in text content.
   */
  private getRoleSectionLocator(role: TeamRole): Locator {
    return this.page.getByText(role, { exact: true }).locator('..');
  }

  /**
   * Returns the display name locator for an assigned team member.
   */
  getTeamMemberDisplayName(role: TeamRole): Locator {
    const roleContainer = this.getRoleSectionLocator(role);
    return roleContainer.getByText(/^[A-Z]/).first();
  }

  // ==================== Form Actions ====================

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Clicks Cancel and confirms the "Leave Page" OutSystems modal dialog.
   * The dialog appears when there are unsaved changes on the form.
   */
  async clickCancelAndConfirmLeave(): Promise<void> {
    await this.cancelButton.click();
    const leaveButton = this.page.getByRole('button', { name: 'Leave' });
    await expect(leaveButton).toBeVisible({ timeout: 20_000 });
    await leaveButton.click();
  }

  async clickResetForm(): Promise<void> {
    await this.resetFormButton.click();
  }

  async clickEditProduct(): Promise<void> {
    await this.editProductButton.click();
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
   */
  async fillProductInformation(data: {
    name: string;
    state: string;
    definition: string;
    type: string;
    description?: string;
  }): Promise<void> {
    // Select dropdowns FIRST — OutSystems partial page refreshes can clear text inputs
    await this.selectProductDropdowns(data);

    // Wait for OutSystems partial refresh triggered by Product Type selection.
    // The refresh replaces DOM elements — we must wait for it to complete
    // before filling text inputs, otherwise the fill targets the old element
    // that gets replaced by a new empty one.
    await this.waitForProductTypeRefresh();

    // Fill text fields AFTER AJAX settles, with retry for late DOM replacement
    await this.fillProductNameWithRetry(data.name);
    if (data.description) {
      await this.fillDescription(data.description);
    }
  }

  /**
   * Fills the Product Organization section with all three org levels.
   */
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

  /**
   * Fills all four required Product Team roles with the same person.
   * Navigates to the Product Team tab first.
   */
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
