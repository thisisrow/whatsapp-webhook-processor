import React from "react";
import StatusIcon from "./StatusIcon";

export default function MessageBubble({ direction, text, timestamp, status }) {
  const mine = direction === "outbound";
  return (
    <div className={`bubble-row ${mine ? "mine" : "theirs"}`}>
      <div className="bubble">
        <div className="text">{text}</div>
        <div className="meta">
          <span className="time">{timestamp}</span>
          {mine && <StatusIcon status={status} />}
        </div>
      </div>
    </div>
  );
}
