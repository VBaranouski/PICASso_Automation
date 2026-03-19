import { test as base, expect } from '@playwright/test';
import { getUser, getDefaultUser } from '../../config/users';
import type { UserCredentials, UserRole } from '../../config/users/user.types';

type CustomFixtures = {
  /** Credentials for the current test role (from TEST_ROLE env var, defaults to 'admin') */
  userCredentials: UserCredentials;
  /** Get credentials for a specific role */
  getUserByRole: (role: UserRole) => UserCredentials;
};

export const test = base.extend<CustomFixtures>({

  // Provides credentials for the role defined by TEST_ROLE env var
  userCredentials: async ({}, use) => {
    const user = getDefaultUser();
    await use(user);
  },

  // Provides a helper to get credentials for any specific role
  getUserByRole: async ({}, use) => {
    await use((role: UserRole) => getUser(role));
  },
});

export { expect } from '@playwright/test';
