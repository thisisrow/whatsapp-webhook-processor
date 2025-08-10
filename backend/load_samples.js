// load_samples.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { processWebhookPayload } = require("./src/processor");

const MONGO_URI = process.env.MONGO_URI ;
const SAMPLE_DIR = process.argv[2] || "./samples"; // pass a folder, defaults to ./samples
// 
async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("whatsapp");

  const files = fs
    .readdirSync(SAMPLE_DIR)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort();

  console.log(`Found ${files.length} JSON files in ${SAMPLE_DIR}`);

  for (const file of files) {
    const full = path.join(SAMPLE_DIR, file);
    const raw = fs.readFileSync(full, "utf8");
    try {
      const payload = JSON.parse(raw);
      await processWebhookPayload(db, payload);
      console.log(`✅ Processed ${file}`);
    } catch (e) {
      console.error(`❌ Failed ${file}:`, e.message);
    }
  }

  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
