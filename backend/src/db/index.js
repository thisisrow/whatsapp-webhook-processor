const { MongoClient } = require("mongodb");

let client;
let db;

async function connect() {
  if (db) return db;
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  return db;
}

function getDb() {
  if (!db) throw new Error("DB not initialized. Call connect() first.");
  return db;
}

module.exports = { connect, getDb };
