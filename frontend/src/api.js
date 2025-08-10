import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
  const { data } = await api.post("/api/messages", { waId, text });
  return data;
}
