import { faker } from '@faker-js/faker';

export function generateUser() {
  return {
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };
}

export function generateUniqueEmail(): string {
  return faker.internet.email();
}
