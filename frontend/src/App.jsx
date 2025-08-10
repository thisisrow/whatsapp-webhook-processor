import React, { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";
import { API_URL, fetchChats, fetchMessages, sendMessage } from "./api";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";

export default function App() {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null); // waId
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // keep latest active for socket handlers
  const activeRef = useRef(null);
  useEffect(() => { activeRef.current = active; }, [active]);

  // ✅ create socket with better connection handling
  const socket = useMemo(() => {
    console.log("🔌 Initializing socket connection to:", API_URL);
    const newSocket = io(API_URL, { 
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
      setSocketConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setSocketConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
    });

    // Add event listeners for debugging
    newSocket.on("message_changed", (data) => {
      console.log("🔍 message_changed event received:", data);
    });
    
    newSocket.on("chat_summary", (data) => {
      console.log("🔍 chat_summary event received:", data);
    });

    // Add test response handler
    newSocket.on("test_response", (data) => {
      console.log("🧪 Test response received from backend:", data);
    });

    return newSocket;
  }, []);

  // realtime: update open thread bubbles
  useEffect(() => {
    const onChanged = (doc) => {
      console.log("Received message_changed event:", doc);
      
      if (!doc || !doc.waId) return;
      
      // Handle refresh events
      if (doc._type === "refresh") {
        console.log("Refreshing chat list due to refresh event");
        fetchChats().then(setChats).catch(console.error);
        return;
      }
      
      // Update messages if this chat is currently open
      if (doc.waId === activeRef.current) {
        console.log("Updating messages for active chat:", doc.waId);
        setMessages((prev) => {
          const idx = prev.findIndex(m => m.msgId === doc.msgId);
          if (idx === -1) {
            // New message - add it and sort
            const newMessages = [...prev, doc].sort((a,b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );
            console.log("Added new message, total messages:", newMessages.length);
            return newMessages;
          } else {
            // Existing message - update it
            const copy = prev.slice(); 
            copy[idx] = doc; 
            console.log("Updated existing message:", doc.msgId);
            return copy;
          }
        });
      }
    };
    
    socket.on("message_changed", onChanged);
    return () => socket.off("message_changed", onChanged);
  }, [socket]);

  // realtime: upsert chat summaries so the LEFT LIST updates across tabs
  useEffect(() => {
    const onSummary = (sum) => {
      console.log("Received chat_summary event:", sum.waId);
      setChats((prev) => {
        const i = prev.findIndex(c => c.waId === sum.waId);
        if (i === -1) {
          // New chat - add it and sort
          const next = [sum, ...prev];
          next.sort((a,b) => new Date(b.lastTimestamp||0) - new Date(a.lastTimestamp||0));
          console.log("Added new chat:", sum.waId);
          return next;
        } else {
          // Existing chat - update it and sort
          const next = prev.slice();
          next[i] = { ...next[i], ...sum };
          next.sort((a,b) => new Date(b.lastTimestamp||0) - new Date(a.lastTimestamp||0));
          console.log("Updated existing chat:", sum.waId);
          return next;
        }
      });
    };
    
    socket.on("chat_summary", onSummary);
    return () => socket.off("chat_summary", onSummary);
  }, [socket]);

  // disconnect only when App unmounts
  useEffect(() => () => socket.disconnect(), [socket]);

  // initial chat list
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
      // keep header/list name visible even if API didn't include it
      const name = (chats.find(c => c.waId === active))?.contactName || null;
      if (name && !doc.contactName) doc.contactName = name;
      
      // Add the message locally for immediate feedback
      setMessages(prev => [...prev, doc]);
      
      // Refresh chat list to show updated last message
      fetchChats().then(setChats).catch(console.error);
    } catch (e) {
      console.error("Send failed:", e);
      alert("Failed to send message. Check backend logs.");
    }
  }

  // Test function to verify socket connection
  const testSocket = () => {
    if (socket.connected) {
      console.log("🔌 Socket is connected, ID:", socket.id);
      // Emit a test event
      socket.emit("test", { message: "Hello from frontend!", timestamp: new Date().toISOString() });
    } else {
      console.log("❌ Socket is not connected");
    }
  };

  return (
    <div className="app">
      <aside className={`sidebar ${active ? "hide-on-mobile" : ""}`}>
        <div className="brand">
          WhatsApp Clone
          <span className={`connection-status ${socketConnected ? 'connected' : 'disconnected'}`}>
            {socketConnected ? '🟢' : '🔴'}
          </span>
        </div>

        <ChatList chats={chats} active={active} onOpen={openChat} />
      </aside>

      <main className={`chat ${!active ? "hide-on-mobile" : ""}`}>
        {active ? (
          <ChatWindow
            waId={active}
            contactName={(chats.find(c => c.waId === active))?.contactName}
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
    </div>
  );
}
