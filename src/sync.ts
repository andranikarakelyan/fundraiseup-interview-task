import { DbClient } from "./lib/db.client";
import { anonymizeUsersData } from "./lib/utils";
import { ChangeStreamInsertDocument, MongoError, ObjectId } from "mongodb";
import { TasksBatchExecutor } from "./lib/TasksBatchExecutor";
import { IUserData } from "./lib/types";

async function main() {
  const cl_args = process.argv.slice(2);

  await DbClient.connect();

  if (cl_args.includes("--full-reindex")) {
    console.log("Full reindexing ...");
    await fullReindex();
    process.exit(0);
  } else {
    console.log("Listening to changes ...");

    const tbe = new TasksBatchExecutor<IUserData>(async (users) => {
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
    }).start();

    const cursor = await DbClient.cursors.findOne({
      name: "customers_insert",
    });

    const change_stream = DbClient.customers_collection.watch(
      [{ $match: { operationType: "insert" } }],
      {
        resumeAfter: cursor?.resume_token,
      }
    );
    change_stream.on(
      "change",
      (event: ChangeStreamInsertDocument<IUserData>) => {
        tbe.addTasks([event.fullDocument]);
        DbClient.cursors
          .updateOne(
            { name: "customers_insert" },
            {
              $set: {
                resume_token: event._id as ObjectId | undefined,
              },
            },
            { upsert: true }
          )
          .catch((err) => {
            console.error("error during saving resume token", err);
          });
      }
    );
  }
}

async function fullReindex() {
  let offset = 0,
    limit = 1000;

  while (true) {
    const users = await DbClient.customers_collection
      .find()
      .sort({ _id: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    if (users.length === 0) {
      break;
    }

    offset += limit;

    const anonymized_users = anonymizeUsersData(users);

    try {
      await DbClient.customers_anonymised_collection.insertMany(
        anonymized_users,
        { ordered: false }
      );
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        // Do nothing, when there are error about duplicates ( Err E11000 duplicate key error collection )
      } else throw err;
    }
  }
}

main().catch((err) => {
  console.error("App error", err);
  process.exit(1);
});
