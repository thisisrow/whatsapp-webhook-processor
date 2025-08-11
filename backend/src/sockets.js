// sockets.js
const { Server } = require("socket.io");

function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { 
      origin: process.env.ORIGIN || "http://localhost:5173", 
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("⚡ Socket connected:", socket.id);
    
    // Store client's optimistic message IDs to prevent duplicates
    const pendingMsgIds = new Set();

    socket.on("message:pending", (msgId) => {
      pendingMsgIds.add(msgId);
    });

    socket.on("message:received", (msgId) => {
      pendingMsgIds.delete(msgId);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
      pendingMsgIds.clear();
    });
  });

  return io;
}

module.exports = { initSockets };
