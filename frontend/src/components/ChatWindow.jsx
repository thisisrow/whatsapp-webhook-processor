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
        {messages.map(m => (
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
