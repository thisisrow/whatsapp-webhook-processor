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
    
    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });

  return io;
}

module.exports = { initSockets };
