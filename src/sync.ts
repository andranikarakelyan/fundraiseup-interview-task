import { DbClient } from "./lib/db.client";
import { anonymizeUsersData } from "./lib/utils";
import { MongoError, ObjectId } from "mongodb";
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

    const tbe = new TasksBatchExecutor<ITaskArg>(execTask).start();

    const cursor = await DbClient.cursors.findOne({
      name: "customers_anonymization ",
    });

    const change_stream = DbClient.customers_collection.watch([], {
      resumeAfter: cursor?.resume_token,
      fullDocument: "updateLookup",
    });

    while (true) {
      const event = await change_stream.next();

      if (
        event.operationType === "insert" ||
        event.operationType === "update" ||
        event.operationType === "replace"
      ) {
        tbe.addTasks([
          {
            user: event.fullDocument as IUserData,
            resume_token: event._id as ObjectId,
            op_type: event.operationType,
          },
        ]);
      }
    }
  }
}

interface ITaskArg {
  user: IUserData;
  op_type: "insert" | "update" | "replace";
  resume_token: ObjectId;
}

async function execTask(args: ITaskArg[]) {
  try {
    await DbClient.customers_anonymised_collection.bulkWrite(
      args.map(({ user, op_type }) => {
        user = anonymizeUsersData([user])[0];

        if (op_type === "insert") {
          return {
            insertOne: {
              document: user,
            },
          };
        } else if (op_type === "update") {
          return {
            updateOne: {
              filter: { _id: user._id },
              update: { $set: user },
              upsert: true,
            },
          };
        } else {
          return {
            replaceOne: {
              filter: { _id: user._id },
              replacement: user,
              upsert: true,
            },
          };
        }
      }),
      {
        ordered: false,
      }
    );
  } catch (err) {
    if (err instanceof MongoError && err.code === 11000) {
      // Do nothing, when there are error about duplicates ( Err E11000 duplicate key error collection )
    } else throw err;
  }
  DbClient.cursors
    .updateOne(
      { name: "customers_anonymization" },
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
}

main().catch((err) => {
  console.error("App error", err);
  process.exit(1);
});
