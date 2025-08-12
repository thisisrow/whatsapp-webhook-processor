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

    const pendingMsgIds = new Set();

    socket.on("message:pending", (msgId) => pendingMsgIds.add(msgId));
    socket.on("message:received", (msgId) => pendingMsgIds.delete(msgId));

    socket.on("test", (data) => {
      console.log("🧪 Test event received from client:", data);
      socket.emit("test_response", { 
        message: "Hello from backend!", 
        timestamp: new Date().toISOString(),
        clientId: socket.id 
      });
    });

    socket.on("disconnect", () => pendingMsgIds.clear());
  });

  return io;
}

module.exports = { initSockets };
