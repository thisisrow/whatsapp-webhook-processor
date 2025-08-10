import React from "react";
import { format } from "date-fns";

export default function ChatList({ chats, active, onOpen }) {
  return (
    <div className="chat-list">
      {chats.map((c) => {
        const displayName =
          (c.contactName && c.contactName.trim()) ? c.contactName : c.waId;
        const when = c.lastTimestamp
          ? format(new Date(c.lastTimestamp), "dd MMM, HH:mm")
          : "";
        const preview = `${c.lastDirection === "outbound" ? "You: " : ""}${c.lastMessage || ""}`;

        return (
          <button
            key={c.waId}
            className={`chat-list-item ${active === c.waId ? "active" : ""}`}
            onClick={() => onOpen(c.waId)}
            aria-current={active === c.waId ? "page" : undefined}
            title={`${displayName}${preview ? " • " + preview : ""}`}
          >
            <div className="avatar">{(displayName?.[0] || "?").toUpperCase()}</div>
            <div className="meta">
              <div className="top">
                <div className="name">{displayName}</div>
                <div className="time">{when}</div>
              </div>
              <div className="bottom">
                <div className="last">{preview}</div>
              </div>
            </div>
          </button>
        );
      })}
      {chats.length === 0 && <div className="empty">No chats yet</div>}
    </div>
  );
}
