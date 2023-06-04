import { MongoError } from "mongodb";
import { DbClient } from "./lib/db.client";
import { anonymizeUsersData } from "./lib/utils";

export async function fullReindex() {
  let offset = 0,
    limit = 1000;

  while (true) {
    const users = await DbClient.customers_collection
      .find()
      .sort({ _id: 1 })
      .limit(limit)
      .skip(offset)
      .toArray();

    if (users.length === 0) break;
    offset += limit;

    try {
      await DbClient.customers_anonymised_collection.insertMany(
        anonymizeUsersData(users),
        { ordered: false }
      );
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        // Do nothing, when there are error about duplicates ( Err E11000 duplicate key error collection )
      } else throw err;
    }
  }
}
