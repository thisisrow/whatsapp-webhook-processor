import React from "react";

export default function StatusIcon({ status }) {
  // simple checkmarks like WhatsApp
  if (status === "read") {
    return <span className="status status-read">✔✔</span>;
  }
  else if (status === "delivered") {
    return <span className="status">✔✔</span>;
  }
   else  {
    return <span className="status">✔</span>;
  }
}
