import { IUserData } from "./types";
import { faker } from "@faker-js/faker";
import { WithId } from "mongodb";

export function generateFakeUsersData(count: number = 1): Array<IUserData> {
  return Array(count)
    .fill(0)
    .map(() => ({
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

export function anonymizeUsersData(
  users: Array<WithId<IUserData>>
): Array<WithId<IUserData>> {
  return users.map((u) => ({
    _id: u._id,
    firstName: faker.string.alphanumeric({ length: 8 }),
    lastName: faker.string.alphanumeric({ length: 8 }),
    email:
      faker.string.alphanumeric({ length: 8 }) +
      u.email.slice(u.email.lastIndexOf("@")),
    address: {
      line1: faker.string.alphanumeric({ length: 8 }),
      line2: faker.string.alphanumeric({ length: 8 }),
      postcode: faker.string.alphanumeric({ length: 8 }),
      state: u.address.state,
      city: u.address.city,
      country: u.address.country,
    },
    createdAt: u.createdAt,
  }));
}

export async function sleep(timeout: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
