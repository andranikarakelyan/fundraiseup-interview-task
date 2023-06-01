import {DbClient} from "./lib/db.client";
import {anonymizeUsersData} from "./lib/utils";
import {MongoError} from "mongodb";


(async () => {
  try {

    const cl_args = process.argv.slice(2);

    await DbClient.connect();

    if (cl_args.includes('--full-reindex')) {
      console.log('Full reindex ...');
      await fullReindex();
      process.exit(0);
    } else {
      //TODO: listen to changes
    }

  } catch (error) {
    console.error('App error', error);
    process.exit(1);
  }
})();

async function fullReindex() {

  // In some cases this is not exact count of synced users, but it's ok for me,
  // because I need this only as progress indicator
  let synchronized_count = 0;
  let offset = 0, limit = 1000;

  while (true) {

    const users = await DbClient.customers_collection.find()
      .sort({_id: 1}).skip(offset).limit(limit).toArray();

    if (users.length === 0) {
      break;
    }

    offset += limit;

    const anonymized_users = anonymizeUsersData(users);

    try {
      await DbClient.customers_anonymised_collection
        .insertMany(anonymized_users, {ordered: false,});
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        // Do nothing, when there are error about duplicates ( Err E11000 duplicate key error collection )
      } else {
        throw err;
      }
    } finally {
      synchronized_count += anonymized_users.length;
    }

    process.stdout.moveCursor(0, -1)
    process.stdout.clearLine(0);
    process.stdout.write(`Anonymized ${synchronized_count} users\n`);

  }

}
