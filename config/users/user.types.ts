import type { EnvironmentName } from '../environments/environment.types';

export type UserRole =
  | 'product_owner'
  | 'security_manager'
  | 'security_and_data_protection_advisor'
  | 'process_quality_leader'
  | 'it_owner'
  | 'project_manager'
  | 'docl'
  | 'drl'
  | 'dedicated_privacy_advisor'
  | 'invalid_user'
  | 'super_user';

export interface UserCredentials {
  role: UserRole;
  name: string;
  login: string;
  password: string;
}

export type UsersByRole = Record<UserRole, UserCredentials>;

export type UsersByEnvironment = Record<EnvironmentName, UsersByRole>;
