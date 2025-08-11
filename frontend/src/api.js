import axios from "axios";
import { io } from "socket.io-client";

export const API_URL = "https://whatsapp-webhook-processor-o18g.onrender.com";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" }
});

// Create a single socket instance
let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
  return socket;
}

export async function fetchChats() {
  const { data } = await api.get("/api/chats");
  return data;
}

export async function fetchMessages(waId, limit = 200) {
  const { data } = await api.get(`/api/chats/${waId}/messages`, { params: { limit } });
  return data;
}

export async function sendMessage(waId, text) {
  const tempMsgId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const currentSocket = getSocket();
  
  // Notify socket about pending message
  currentSocket.emit('message:pending', tempMsgId);
  
  try {
    const { data } = await api.post("/api/messages", { 
      waId, 
      text,
      clientMsgId: tempMsgId 
    });
    
    // Once server confirms, we can mark this message as received
    currentSocket.emit('message:received', tempMsgId);
    return { ...data, msgId: tempMsgId };
  } catch (error) {
    currentSocket.emit('message:received', tempMsgId); // Clean up on error
    throw error;
  }
}
