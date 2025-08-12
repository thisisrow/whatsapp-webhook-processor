// helpers used by controllers
async function emitChatSummary(db, waId, io) {
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
    if (summary) io.emit("chat_summary", summary); // broadcast fresh summary
  } catch (e) {
    console.warn("emitChatSummary failed:", e.message);
  }
}

function extractWaIds(payload) {
  const waIds = new Set();
  const entries = payload?.entry || [];
  for (const entry of entries) {
    for (const ch of entry?.changes || []) {
      const v = ch?.value || {};
      (v.contacts || []).forEach(c => c?.wa_id && waIds.add(c.wa_id));
      (v.statuses || []).forEach(s => s?.recipient_id && waIds.add(s.recipient_id));
      (v.messages || []).forEach(m => m?.from && waIds.add(m.from));
    }
  }
  return Array.from(waIds);
}

module.exports = { emitChatSummary, extractWaIds };
