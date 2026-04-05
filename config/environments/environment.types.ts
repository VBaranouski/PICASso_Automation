export type EnvironmentName = 'dev' | 'qa' | 'ppr';

export interface Environment {
  name: EnvironmentName;
  baseUrl: string;
  apiUrl: string;
}
