import React, { useMemo } from "react";
import { format } from "date-fns";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ waId, contactName, messages, loading, onBack, children }) {
  const nameFromMsgs = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const n = messages[i]?.contactName;
      if (n) return n;
    }
    return null;
  }, [messages]);

  const displayName = contactName || nameFromMsgs || waId;

  // Deduplicate messages by msgId
  const uniqueMessages = useMemo(() => {
    const seen = new Map();
    return messages.reduce((acc, msg) => {
      if (!seen.has(msg.msgId)) {
        seen.set(msg.msgId, true);
        acc.push(msg);
      } else {
        // If message exists, update it if the new one has more info
        const existingIndex = acc.findIndex(m => m.msgId === msg.msgId);
        if (existingIndex !== -1 && msg.currentStatus) {
          acc[existingIndex] = msg;
        }
      }
      return acc;
    }, []);
  }, [messages]);

  return (
    <div className="chat-window">
      <header className="chat-header">
        <button className="back" onClick={onBack} aria-label="Back">←</button>
        <div className="avatar">{(displayName || "?").slice(0,1).toUpperCase()}</div>
        <div className="peer">
          <div className="name">{displayName}</div>
          <div className="sub">{waId}</div>
        </div>
      </header>

      <div className="messages">
        {loading && <div className="loading">Loading…</div>}
        {uniqueMessages.map(m => (
          <MessageBubble
            key={m.msgId}
            direction={m.direction}
            text={m.textBody}
            timestamp={m.timestamp ? format(new Date(m.timestamp), "dd MMM yyyy, HH:mm") : ""}
            status={m.currentStatus}
          />
        ))}
      </div>

      <footer className="composer">{children}</footer>
    </div>
  );
}
