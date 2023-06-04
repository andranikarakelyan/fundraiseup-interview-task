import { DbClient } from "./lib/db.client";
import { anonymizeUsersData } from "./lib/utils";
import { ChangeStreamInsertDocument, MongoError, ObjectId } from "mongodb";
import { TasksBatchExecutor } from "./lib/TasksBatchExecutor";
import { IUserData } from "./lib/types";
import { fullReindex } from "./fullReindex";

async function main() {
  const cl_args = process.argv.slice(2);

  await DbClient.connect();

  if (cl_args.includes("--full-reindex")) {
    console.log("Full reindexing ...");
    await fullReindex();
    process.exit(0);
  } else {
    console.log("Listening to changes ...");

    const tbe = new TasksBatchExecutor<{
      user: IUserData;
      resume_token: ObjectId;
    }>(async (args) => {
      try {
        await DbClient.customers_anonymised_collection.insertMany(
          anonymizeUsersData(args.map((v) => v.user)),
          { ordered: false }
        );
      } catch (err) {
        if (err instanceof MongoError && err.code === 11000) {
          // Do nothing, when there are error about duplicates ( Err E11000 duplicate key error collection )
        } else throw err;
      }
      DbClient.cursors
        .updateOne(
          { name: "customers_insert" },
          {
            $set: {
              resume_token: args[args.length - 1].resume_token,
            },
          },
          { upsert: true }
        )
        .catch((err) => {
          console.error("Error during saving resume token", err);
        });
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

    while (true) {
      const event =
        (await change_stream.next()) as ChangeStreamInsertDocument<IUserData>;
      tbe.addTasks([
        { user: event.fullDocument, resume_token: event._id as ObjectId },
      ]);
    }
  }
}

main().catch((err) => {
  console.error("App error", err);
  process.exit(1);
});
