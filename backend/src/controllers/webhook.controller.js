const { getDb } = require("../db");
const { processWebhookPayload } = require("../services/processor");
const { emitChatSummary, extractWaIds } = require("../services/chats");

async function handleWebhook(req, res) {
  try {
    const db = getDb();
    const io = req.app.locals.io;

    await processWebhookPayload(db, req.body);

    io.emit("message_changed", { _type: "refresh" });

    for (const id of extractWaIds(req.body)) {
      await emitChatSummary(db, id, io);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "processing_failed" });
  }
}

module.exports = { handleWebhook };
