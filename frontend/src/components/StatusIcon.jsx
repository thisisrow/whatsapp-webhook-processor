import React from "react";

/**
 * WhatsApp-like ticks:
 * - queued/sent -> single gray check
 * - delivered   -> double gray checks
 * - read        -> double blue checks
 */
export default function StatusIcon({ status, small, inline }) {
  const deliveredLike = status === "delivered" || status === "read";
  const classes = [
    "status",
    deliveredLike ? "double" : "single",
    status,
    small ? "small" : "",
    inline ? "inline" : "",
  ].join(" ").trim();

  return (
    <span className={classes} title={status || "sent"} aria-label={status || "sent"}>
      {deliveredLike ? "✔✔" : "✔"}
    </span>
  );
}
