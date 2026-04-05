import { devUsers } from './dev.users';
import { qaUsers } from './qa.users';
import { pprUsers } from './ppr.users';
import type { EnvironmentName } from '../environments/environment.types';
import type { UserCredentials, UserRole, UsersByEnvironment } from './user.types';

const usersByEnvironment: UsersByEnvironment = {
  dev: devUsers,
  qa: qaUsers,
  ppr: pprUsers,
};

/**
 * Get user credentials by role and environment.
 * Environment defaults to TEST_ENV env var, then 'dev'.
 */
export function getUser(role: UserRole, envName?: string): UserCredentials {
  const env = (envName || process.env.TEST_ENV || 'qa') as EnvironmentName;
  const users = usersByEnvironment[env];
  if (!users) {
    throw new Error(`No users configured for environment: "${env}". Available: ${Object.keys(usersByEnvironment).join(', ')}`);
  }
  const user = users[role];
  if (!user) {
    throw new Error(`No user with role "${role}" in environment "${env}". Available roles: ${Object.keys(users).join(', ')}`);
  }
  return user;
}

/**
 * Get the default user for test execution.
 * Role is determined by TEST_ROLE env var, defaults to 'product_owner'.
 */
export function getDefaultUser(envName?: string): UserCredentials {
  const role = (process.env.TEST_ROLE || 'process_quality_leader') as UserRole;
  return getUser(role, envName);
}

export type { UserCredentials, UserRole, UsersByRole, UsersByEnvironment } from './user.types';
