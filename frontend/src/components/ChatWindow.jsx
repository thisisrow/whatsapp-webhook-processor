import React, { useEffect, useMemo, useRef } from "react";
import { format, isToday, isYesterday } from "date-fns";
import MessageBubble from "./MessageBubble";

function labelForDay(d) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM yyyy");
}

function groupByDay(messages) {
  const out = [];
  let prevKey = "";
  for (const m of messages) {
    const t = m.timestamp ? new Date(m.timestamp) : new Date(m.createdAt || Date.now());
    const key = format(t, "yyyy-MM-dd");
    if (key !== prevKey) {
      out.push({ _type: "divider", key, label: labelForDay(t) });
      prevKey = key;
    }
    out.push({ _type: "msg", ...m });
  }
  return out;
}

export default function ChatWindow({
  waId,
  contactName,
  messages,
  loading,
  onBack,
  children
}) {
  const displayName = useMemo(() => {
    const fromMsgs = [...messages].reverse().find(m => m?.contactName)?.contactName;
    return contactName || fromMsgs || waId;
  }, [contactName, messages, waId]);

  // Deduplicate messages by msgId (keep newest info)
  const uniqueMessages = useMemo(() => {
    const map = new Map();
    for (const m of messages) map.set(m.msgId, { ...(map.get(m.msgId) || {}), ...m });
    const arr = Array.from(map.values());
    arr.sort((a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0));
    return arr;
  }, [messages]);

  const items = useMemo(() => groupByDay(uniqueMessages), [uniqueMessages]);

  // Auto-scroll to bottom when new messages arrive (unless user scrolled up a lot)
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [items.length]);

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

      <div className="messages" ref={listRef}>
        {loading && <div className="loading">Loading…</div>}
        {items.map((it, i) =>
          it._type === "divider" ? (
            <div className="day-divider" key={`d-${it.key}-${i}`}>
              <span>{it.label}</span>
            </div>
          ) : (
            <MessageBubble
              key={it.msgId}
              direction={it.direction}
              text={it.textBody}
              timestamp={it.timestamp ? format(new Date(it.timestamp), "HH:mm") : ""}
              status={it.currentStatus}
            />
          )
        )}
      </div>

      <footer className="composer">{children}</footer>
    </div>
  );
}
