import axios from "axios";
export const API_URL =  "https://whatsapp-webhook-processor-o18g.onrender.com";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" }
});

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
  const socket = io(API_URL);
  
  // Notify socket about pending message
  socket.emit('message:pending', tempMsgId);
  
  try {
    const { data } = await api.post("/api/messages", { 
      waId, 
      text,
      clientMsgId: tempMsgId 
    });
    
    // Once server confirms, we can mark this message as received
    socket.emit('message:received', tempMsgId);
    return { ...data, msgId: tempMsgId };
  } catch (error) {
    socket.emit('message:received', tempMsgId); // Clean up on error
    throw error;
  } finally {
    socket.disconnect();
  }
}
