import React, { useState, useRef, useEffect } from "react";

export default function MessageInput({ onSend }) {
  const [text, setText] = useState("");
  const taRef = useRef(null);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(150, el.scrollHeight) + "px";
  }, [text]);

  return (
    <form className="input-row" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <button type="button" className="icon-btn" title="Emoji">😊</button>
      <button type="button" className="icon-btn" title="Attach">📎</button>

      <textarea
        ref={taRef}
        rows={1}
        placeholder="Type a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />

      <button type="submit" className="send-btn" aria-label="Send">Send</button>
    </form>
  );
}
