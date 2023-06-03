import { DbClient } from "./lib/db.client";
import { generateFakeUsersData, sleep } from "./lib/utils";
import { faker } from "@faker-js/faker";
import { WithId } from "mongodb";
import { IUserData } from "./lib/types";

(async () => {
  try {
    await DbClient.connect();
    let added_cnt = 0;

    console.log("Adding users ...");

    while (true) {
      await sleep(200);

      const users = generateFakeUsersData(
        faker.number.int({ max: 10, min: 1 })
      );

      /*
        Because there are no strict restrictions about error handling,
        and also there are no strict definition of 200ms delay ( DB queries "sending" delay, or "resolving" delay, etc. )
        in this case I prefer to use this solution,
        when after any error app.ts will crash and 200ms is delay between "real" insertions.
      */
      await DbClient.customers_collection.insertMany(
        users as WithId<IUserData>[]
      );
      added_cnt += users.length;

      process.stdout.moveCursor(0, -1);
      process.stdout.clearLine(0);
      process.stdout.write(`Added ${added_cnt} users\n`);
    }
  } catch (err) {
    console.error("App error", err);
    process.exit(1);
  }
})();
