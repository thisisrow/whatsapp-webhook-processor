import React from "react";
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
