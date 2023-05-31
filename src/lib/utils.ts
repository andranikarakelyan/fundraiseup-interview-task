import {IUserData} from "./types";
import {faker} from '@faker-js/faker';

export function generateFakeUsersData(count: number = 1): Array<IUserData> {

  return Array(count).fill(0).map(() => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    address: {
      line1: faker.location.streetAddress(),
      line2: faker.location.secondaryAddress(),
      postcode: faker.location.zipCode(),
      state: faker.location.state(),
      city: faker.location.city(),
      country: faker.location.country(),
    },
    createdAt: new Date(),
  }));

}

export async function sleep(timeout: number = 0) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}
