const { getDb } = require("../db");

async function listChats(req, res) {
  try {
    const db = getDb();
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
}

async function listMessages(req, res) {
  try {
    const db = getDb();
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
}

module.exports = { listChats, listMessages };
