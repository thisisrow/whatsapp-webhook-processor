import React from "react";
import { format, isToday, isYesterday } from "date-fns";
import StatusIcon from "./StatusIcon";

function whenLabel(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM");
}

export default function ChatList({ chats, active, onOpen }) {
  return (
    <div className="chat-list">
      {chats.map((c) => {
        const displayName =
          (c.contactName && c.contactName.trim()) ? c.contactName : c.waId;
        const when = whenLabel(c.lastTimestamp);

        return (
          <button
            key={c.waId}
            className={`chat-list-item ${active === c.waId ? "active" : ""}`}
            onClick={() => onOpen(c.waId)}
            aria-current={active === c.waId ? "page" : undefined}
            title={displayName}
          >
            <div className="avatar">
              {(displayName?.[0] || "?").toUpperCase()}
            </div>

            <div className="meta">
              <div className="top">
                <div className="name">{displayName}</div>
                <div className="time">{when}</div>
              </div>

              <div className="bottom">
                <div className="last">
                  {c.lastDirection === "outbound" && (
                    <>
                      <StatusIcon status={c.lastStatus} small inline />
                      <span className="you">You: </span>
                    </>
                  )}
                  <span className="preview">{c.lastMessage || ""}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
      {chats.length === 0 && <div className="empty">No chats yet</div>}
    </div>
  );
}
