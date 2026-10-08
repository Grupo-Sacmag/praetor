// Uso: node --env-file=.env scripts/create-admin.mjs <usuario> <contraseña>
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 10) {
  console.error("Uso: node --env-file=.env scripts/create-admin.mjs <usuario> <contraseña (mín. 10 caracteres)>");
  process.exit(1);
}

const client = await new MongoClient(process.env.MONGO_URI ?? "mongodb://localhost:27017").connect();
const col = client.db(process.env.MONGO_DB ?? "envarchdb").collection(process.env.ADMINS_COLLECTION ?? "admins");
await col.createIndex({ username: 1 }, { unique: true });
const passwordHash = await bcrypt.hash(password, 12);
await col.updateOne({ username }, { $set: { passwordHash }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
console.log(`Administrador "${username}" listo.`);
await client.close();
