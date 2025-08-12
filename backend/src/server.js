require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");

const { connect: connectDb } = require("./db");
const { initSockets } = require("./sockets");
const routes = require("./routes");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: process.env.ORIGIN || "http://localhost:5173" }));

app.get("/", (_, res) => res.send("OK"));

const server = http.createServer(app);
const PORT = process.env.PORT;

async function start() {
  // 1) DB first
  const db = await connectDb();
  console.log(`✅ Connected to MongoDB, DB: ${process.env.DB_NAME}`);

  // 2) Sockets
  const io = initSockets(server);
  app.locals.io = io; 

  // 3) Routes
  app.use(routes);

  // 4) Mongo change stream (optional but kept)
  let changeStream;
  const setupChangeStream = () => {
    try {
      const col = db.collection("processed_messages");
      changeStream = col.watch([], { fullDocument: "updateLookup" });

      changeStream.on("change", (change) => {
        console.log("MongoDB change:", change.operationType, change.fullDocument?.msgId);
        if (["insert", "update", "replace"].includes(change.operationType)) {
          const doc = change.fullDocument;
          if (doc && doc.waId) {
            io.emit("message_changed", doc);
            io.emit("message_changed", { _type: "refresh" });
          }
        }
      });

      changeStream.on("error", (error) => {
        console.warn("Change stream error:", error.message);
        setTimeout(setupChangeStream, 5000);
      });

      console.log("✅ MongoDB change stream established");
    } catch (e) {
      console.warn("Change streams unavailable (not a replica set?):", e.message);
    }
  };
  setupChangeStream();

  server.listen(PORT, () =>
    console.log(`🚀 Server + Socket.IO on http://localhost:${PORT}`)
  );
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
