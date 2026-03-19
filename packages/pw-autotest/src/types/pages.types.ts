export interface PageObject {
  readonly url: string;
  goto(): Promise<void>;
  getTitle(): Promise<string>;
  waitForPageLoad(): Promise<void>;
}
