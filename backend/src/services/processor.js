let didEnsureIndexes = false;

async function ensureIndexes(col) {
  if (didEnsureIndexes) return;
  await col.createIndex({ msgId: 1 }, { unique: true });
  await col.createIndex({ timestamp: 1 });
  await col.createIndex({ waId: 1 });
  didEnsureIndexes = true;
}

function tsToDate(secStr) {
  if (!secStr) return null;
  const n = Number(secStr);
  if (Number.isNaN(n)) return null;
  return new Date(n * 1000);
}

async function upsertMessages(col, value) {
  const metadata = value?.metadata || {};
  const businessNumber = metadata.display_phone_number;
  const phoneNumberId = metadata.phone_number_id;
  const contact = value?.contacts?.[0];
  const waIdFromContact = contact?.wa_id;
  const contactName = contact?.profile?.name;

  for (const msg of value?.messages || []) {
    const direction = msg.from === businessNumber ? "outbound" : "inbound";
    const waId = waIdFromContact || (direction === "inbound" ? msg.from : undefined);

    const setFields = {
      metaMsgId: msg.id,
      direction,
      type: msg.type,
      from: direction === "outbound" ? businessNumber : waId,
      to: direction === "outbound" ? waId : businessNumber,
      waId,
      contactName,
      phoneNumberId,
      displayPhoneNumber: businessNumber,
      textBody: msg.text?.body || null,
      timestamp: tsToDate(msg.timestamp),
      raw: msg,
      updatedAt: new Date(),
    };

    const setOnInsertFields = {
      msgId: msg.id,
      createdAt: new Date(),
      currentStatus: direction === "inbound" ? "received" : "queued",
    };

    await col.updateOne(
      { msgId: msg.id },
      { $setOnInsert: setOnInsertFields, $set: setFields },
      { upsert: true }
    );
  }
}

async function applyStatuses(col, value) {
  const metadata = value?.metadata || {};
  const businessNumber = metadata.display_phone_number;
  const phoneNumberId = metadata.phone_number_id;

  for (const st of value?.statuses || []) {
    const msgKey = st.meta_msg_id || st.id;

    const statusItem = {
      status: st.status,
      timestamp: tsToDate(st.timestamp),
      recipientId: st.recipient_id,
      conversationId: st.conversation?.id || null,
      raw: st,
    };

    await col.updateOne(
      { msgId: msgKey },
      {
        $setOnInsert: {
          msgId: msgKey,
          direction: "outbound",
          phoneNumberId,
          displayPhoneNumber: businessNumber,
          createdAt: new Date(),
        },
        $set: { currentStatus: st.status, updatedAt: new Date() },
        $addToSet: { statusHistory: statusItem },
      },
      { upsert: true }
    );
  }
}

async function processWebhookPayload(db, payload) {
  const col = db.collection("processed_messages");
  await ensureIndexes(col);

  const entryArr = payload?.metaData?.entry || payload?.entry || [];
  for (const entry of entryArr) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      if (Array.isArray(value.messages)) await upsertMessages(col, value);
      if (Array.isArray(value.statuses)) await applyStatuses(col, value);
    }
  }
}

module.exports = { processWebhookPayload };
