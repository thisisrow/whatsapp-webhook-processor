// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const http = require("http");
const { initSockets } = require("./sockets");
const { processWebhookPayload } = require("./processor");
const { connect: connectDb, getDb } = require("./db");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: process.env.ORIGIN || "http://localhost:5173" }));

const server = http.createServer(app);

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME   = process.env.DB_NAME || "whatsapp";
const PORT      = process.env.PORT || 3000;

let db;

// --- helper: emit a fresh chat summary to all clients ---
async function emitChatSummary(waId, io) {
  try {
    const col = db.collection("processed_messages");
    const pipeline = [
      { $match: { waId } },
      { $sort: { timestamp: 1, createdAt: 1 } },
      {
        $group: {
          _id: "$waId",
          waId: { $last: "$waId" },
          lastMessage: { $last: "$textBody" },
          lastStatus: { $last: "$currentStatus" },
          lastDirection: { $last: "$direction" },
          lastTimestamp: { $last: "$timestamp" },
          names: { $push: "$contactName" }
        }
      },
      {
        $project: {
          waId: 1,
          lastMessage: 1,
          lastStatus: 1,
          lastDirection: 1,
          lastTimestamp: 1,
          contactName: {
            $let: {
              vars: {
                nn: {
                  $filter: {
                    input: "$names",
                    as: "n",
                    cond: { $and: [ { $ne: ["$$n", null] }, { $ne: ["$$n", ""] } ] }
                  }
                }
              },
              in: {
                $cond: [
                  { $gt: [ { $size: "$$nn" }, 0 ] },
                  { $arrayElemAt: [ "$$nn", { $subtract: [ { $size: "$$nn" }, 1 ] } ] },
                  null
                ]
              }
            }
          }
        }
      }
    ];
    const [summary] = await col.aggregate(pipeline).toArray();
    if (summary) {
      console.log("Emitting chat summary:", summary.waId);
      io.emit("chat_summary", summary);
    }
  } catch (e) {
    console.warn("emitChatSummary failed:", e.message);
  }
}

// optional: pull waIds from a webhook payload so we can emit summaries
function extractWaIds(payload) {
  const waIds = new Set();
  const entries = payload?.entry || [];
  for (const entry of entries) {
    for (const ch of entry?.changes || []) {
      const v = ch?.value || {};
      (v.contacts || []).forEach(c => c?.wa_id && waIds.add(c.wa_id));
      (v.statuses || []).forEach(s => s?.recipient_id && waIds.add(s.recipient_id));
      // sometimes messages lack contacts; infer from inbound "from"
      (v.messages || []).forEach(m => m?.from && waIds.add(m.from));
    }
  }
  return Array.from(waIds);
}

async function start() {
  // Connect to database first
  try {
    db = await connectDb();
    console.log(`✅ Connected to MongoDB, DB: ${DB_NAME}`);
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }

  // Initialize sockets after database connection
  const io = initSockets(server);

  // Add test event handler
  io.on("connection", (socket) => {
    console.log("⚡ Client connected:", socket.id);
    
    socket.on("test", (data) => {
      console.log("🧪 Test event received from client:", data);
      // Send back a test response
      socket.emit("test_response", { 
        message: "Hello from backend!", 
        timestamp: new Date().toISOString(),
        clientId: socket.id 
      });
    });
    
    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });

  // Set up MongoDB change stream for real-time updates
  let changeStream;
  
  const setupChangeStream = () => {
    try {
      const col = db.collection("processed_messages");
      changeStream = col.watch([], { fullDocument: "updateLookup" });
      
      changeStream.on("change", (change) => {
        console.log("MongoDB change detected:", change.operationType, change.fullDocument?.msgId);
        
        if (change.operationType === "insert" || change.operationType === "update" || change.operationType === "replace") {
          const doc = change.fullDocument;
          if (doc && doc.waId) {
            // Emit message change to all clients
            io.emit("message_changed", doc);
            
            // Also emit a refresh event for general updates
            io.emit("message_changed", { _type: "refresh" });
          }
        }
      });
      
      changeStream.on("error", (error) => {
        console.warn("Change stream error:", error.message);
        // Try to reconnect after a delay
        setTimeout(setupChangeStream, 5000);
      });
      
      console.log("✅ MongoDB change stream established");
    } catch (error) {
      console.warn("Change streams unavailable (not a replica set?):", error.message);
    }
  };

  // Initialize change stream
  setupChangeStream();

  app.get("/", (_, res) => res.send("OK"));

  app.post("/webhook", async (req, res) => {
    try {
      await processWebhookPayload(db, req.body);
      
      // Emit refresh event to all clients
      io.emit("message_changed", { _type: "refresh" });

      // Emit summaries for any chats touched by this payload
      for (const id of extractWaIds(req.body)) {
        await emitChatSummary(id, io);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: "processing_failed" });
    }
  });

  app.get("/api/chats", async (req, res) => {
    try {
      const col = db.collection("processed_messages");
      const pipeline = [
        { $match: { waId: { $exists: true, $ne: null } } },
        { $sort: { timestamp: 1, createdAt: 1 } },
        {
          $group: {
            _id: "$waId",
            waId: { $last: "$waId" },
            lastMessage: { $last: "$textBody" },
            lastStatus: { $last: "$currentStatus" },
            lastDirection: { $last: "$direction" },
            lastTimestamp: { $last: "$timestamp" },
            lastMsgId: { $last: "$msgId" },
            names: { $push: "$contactName" }
          }
        },
        {
          $project: {
            waId: 1,
            lastMessage: 1,
            lastStatus: 1,
            lastDirection: 1,
            lastTimestamp: 1,
            lastMsgId: 1,
            contactName: {
              $let: {
                vars: {
                  nn: {
                    $filter: {
                      input: "$names",
                      as: "n",
                      cond: { $and: [ { $ne: [ "$$n", null ] }, { $ne: [ "$$n", "" ] } ] }
                    }
                  }
                },
                in: {
                  $cond: [
                    { $gt: [ { $size: "$$nn" }, 0 ] },
                    { $arrayElemAt: [ "$$nn", { $subtract: [ { $size: "$$nn" }, 1 ] } ] },
                    null
                  ]
                }
              }
            }
          }
        },
        { $sort: { lastTimestamp: -1 } }
    ];
      res.json(await col.aggregate(pipeline).toArray());
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "failed_to_list_chats" });
    }
  });

  app.get("/api/chats/:waId/messages", async (req, res) => {
    try {
      const { waId } = req.params;
      const limit = Math.min(parseInt(req.query.limit || "200", 10), 500);
      const msgs = await db.collection("processed_messages")
        .find({ waId })
        .sort({ timestamp: 1, createdAt: 1 })
        .limit(limit)
        .toArray();
      res.json(msgs);
    } catch (e) {
      console.error("messages route error:", e);
      res.status(500).json({ error: "failed_to_list_messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { waId, text } = req.body || {};
      if (!waId || !text) return res.status(400).json({ error: "waId_and_text_required" });

      const businessNumber = process.env.BUSINESS_NUMBER || "000000000000";
      const phoneNumberId  = process.env.PHONE_NUMBER_ID || null;
      const now   = new Date();
      const msgId = "local-" + now.getTime() + "-" + Math.random().toString(36).slice(2, 8);

      const col = db.collection("processed_messages");

      // fill name for this waId if we know it
      const existing = await col.findOne(
        { waId, contactName: { $ne: null } },
        { sort: { timestamp: -1, createdAt: -1 }, projection: { contactName: 1 } }
      );
      const contactName = existing?.contactName || null;

      const doc = {
        msgId,
        metaMsgId: msgId,
        direction: "outbound",
        type: "text",
        from: businessNumber,
        to: waId,
        waId,
        contactName,
        phoneNumberId,
        displayPhoneNumber: businessNumber,
        textBody: text,
        timestamp: now,
        currentStatus: "queued",
        statusHistory: [],
        createdAt: now,
        updatedAt: now,
        raw: { simulated: true }
      };

      await col.updateOne({ msgId }, { $setOnInsert: doc }, { upsert: true });

      // Notify clients about the new message
      console.log("Emitting message_changed for new message:", doc.msgId);
      io.emit("message_changed", doc);
      
      // Update the chat list in other tabs
      await emitChatSummary(waId, io);

      res.status(201).json(doc);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "failed_to_create_message" });
    }
  });

  server.listen(PORT, () => console.log(`🚀 Server + Socket.IO on http://localhost:${PORT}`));
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
