import { MongoClient, type Db } from "mongodb";
import { env } from "./config";

const g = globalThis as unknown as { _mongo?: Promise<MongoClient> };

export async function getDb(): Promise<Db> {
  g._mongo ??= new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 5000 }).connect();
  return (await g._mongo).db(env.db);
}
