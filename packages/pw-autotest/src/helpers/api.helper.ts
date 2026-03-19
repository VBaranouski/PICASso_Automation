import { type APIRequestContext } from '@playwright/test';

export class ApiHelper {
  constructor(private readonly request: APIRequestContext) {}

  async createTestData<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const response = await this.request.post(endpoint, { data });
    return response.json() as Promise<T>;
  }

  async deleteTestData(endpoint: string): Promise<void> {
    await this.request.delete(endpoint);
  }
}
