# Real-Time Socket Setup Guide

This guide explains how to test and verify that the real-time socket communication is working between the backend and frontend.


## Testing the Real-Time Functionality

### 1. Start the Backend

```bash
cd backend
npm run dev
```

You should see:
- ✅ Connected to MongoDB, DB: whatsapp
- ✅ MongoDB change stream established
- 🚀 Server + Socket.IO on http://localhost:3000

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

You should see:
- 🔌 Initializing socket connection to: http://localhost:3000
- ✅ Socket connected: [socket-id]

### 3. Test Socket Connection

1. Open the frontend in your browser
2. Look for the green circle (🟢) in the top-left corner indicating socket connection

### 4. Test Real-Time Updates
### Send Messages via Frontend
1. Open a chat in the frontend
2. Send a message
3. Open another tab/window with the same frontend
4. The message should appear in real-time without refresh
