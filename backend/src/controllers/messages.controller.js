const { getDb } = require("../db");
const { emitChatSummary } = require("../services/chats");

async function sendMessage(req, res) {
  try {
    const db = getDb();
    const io = req.app.locals.io;

    const { waId, text } = req.body || {};
    if (!waId || !text) {
      return res.status(400).json({ error: "waId_and_text_required" });
    }

    const businessNumber = process.env.BUSINESS_NUMBER || "000000000000";
    const phoneNumberId  = process.env.PHONE_NUMBER_ID || null;
    const now   = new Date();
    const msgId = "local-" + now.getTime() + "-" + Math.random().toString(36).slice(2, 8);

    const col = db.collection("processed_messages");

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

    io.emit("message_changed", doc);
    await emitChatSummary(db, waId, io);

    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "failed_to_create_message" });
  }
}

module.exports = { sendMessage };
