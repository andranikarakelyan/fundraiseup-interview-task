import { Collection, MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import { ICursorData, IUserData } from "./types";

export class DbClient {
  public static customers_collection: Collection<IUserData>;
  public static customers_anonymised_collection: Collection<IUserData>;
  public static cursors: Collection<ICursorData>;

  static async connect() {
    dotenv.config();
    const DB_URI = process.env.DB_URI;
    if (!DB_URI) throw new Error("Environment variable DB_URI is required");

    console.log(`Connecting to MongoDB...`);
    const client = new MongoClient(DB_URI);
    await client.connect();
    const db = client.db();
    this.customers_collection = db.collection("customers");
    this.customers_anonymised_collection = db.collection(
      "customers_anonymised"
    );
    this.cursors = db.collection("cursors");

    console.log("Successfully connected to MongoDB");
  }
}
