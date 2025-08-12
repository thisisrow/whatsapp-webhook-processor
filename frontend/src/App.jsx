import { Analytics } from "@vercel/analytics/next"
import React, { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";
import { API_URL, fetchChats, fetchMessages, sendMessage } from "./api";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";

export default function App() {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  
  const activeRef = useRef(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  
  const socket = useMemo(() => {
    const newSocket = io(API_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    newSocket.on("connect", () => {
      setSocketConnected(true);
    });

    newSocket.on("disconnect", () => {
      setSocketConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
    });

    
    

    return newSocket;
  }, []);

  
  useEffect(() => {
    const onChanged = (doc) => {
      if (!doc || !doc.waId) return;

      
      if (doc._type === "refresh") {
        fetchChats().then(setChats).catch(console.error);
        return;
      }

      
      if (doc.waId === activeRef.current) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.msgId === doc.msgId);
          if (idx === -1) {
            
            const newMessages = [...prev, doc].sort(
              (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            );
            return newMessages;
          } else {
            
            const copy = prev.slice();
            copy[idx] = doc;
            return copy;
          }
        });
      }
    };

    socket.on("message_changed", onChanged);
    return () => socket.off("message_changed", onChanged);
  }, [socket]);

  
  useEffect(() => {
    const onSummary = (sum) => {
      setChats((prev) => {
        const i = prev.findIndex((c) => c.waId === sum.waId);
        if (i === -1) {
          
          const next = [sum, ...prev];
          next.sort(
            (a, b) =>
              new Date(b.lastTimestamp || 0) - new Date(a.lastTimestamp || 0)
          );
          return next;
        } else {
          
          const next = prev.slice();
          next[i] = { ...next[i], ...sum };
          next.sort(
            (a, b) =>
              new Date(b.lastTimestamp || 0) - new Date(a.lastTimestamp || 0)
          );
          return next;
        }
      });
    };

    socket.on("chat_summary", onSummary);
    return () => socket.off("chat_summary", onSummary);
  }, [socket]);

  useEffect(() => () => socket.disconnect(), [socket]);

  useEffect(() => {
    fetchChats().then(setChats).catch(console.error);
  }, []);

  async function openChat(waId) {
    setActive(waId);
    setLoadingMsgs(true);
    try {
      const data = await fetchMessages(waId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function handleSend(text) {
    if (!active || !text.trim()) return;
    try {
      const doc = await sendMessage(active, text.trim());
      const name =
        chats.find((c) => c.waId === active)?.contactName || null;
      if (name && !doc.contactName) doc.contactName = name;

      
      setMessages((prev) => [...prev, doc]);

      fetchChats().then(setChats).catch(console.error);
    } catch (e) {
      console.error("Send failed:", e);
      alert("Failed to send message. Check backend logs.");
    }
  }

  
  const testSocket = () => {
    if (socket.connected) {
      socket.emit("test", {
        message: "Hello from frontend!",
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="app">
      <aside className={`sidebar ${active ? "hide-on-mobile" : ""}`}>
        <div className="brand">
          WhatsApp Clone
          <span
            className={`connection-status ${
              socketConnected ? "connected" : "disconnected"
            }`}
          >
            {socketConnected ? "🟢" : "🔴"}
          </span>
        </div>

        <ChatList chats={chats} active={active} onOpen={openChat} />
      </aside>

      <main className={`chat ${!active ? "hide-on-mobile" : ""}`}>
        {active ? (
          <ChatWindow
            waId={active}
            contactName={chats.find((c) => c.waId === active)?.contactName}
            messages={messages}
            loading={loadingMsgs}
            onBack={() => setActive(null)}
          >
            <MessageInput onSend={handleSend} />
          </ChatWindow>
        ) : (
          <div className="empty">Select a chat to start</div>
        )}
      </main>
          <Analytics/>
    </div>
  );
}
