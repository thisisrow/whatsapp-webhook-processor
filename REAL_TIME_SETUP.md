# Real-Time Socket Setup Guide

This guide explains how to test and verify that the real-time socket communication is working between the backend and frontend.

## What Was Fixed

1. **Duplicate Socket Initialization**: Removed duplicate socket.io instances in the backend
2. **Database Connection Order**: Ensured database is connected before initializing sockets
3. **Change Stream Setup**: Properly configured MongoDB change streams for real-time updates
4. **Frontend Socket Handling**: Improved socket connection handling with reconnection logic
5. **Event Emission**: Fixed socket event emission for message changes and chat summaries

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
3. Click the "Test Socket" button
4. Check the browser console for:
   - 🔌 Socket is connected, ID: [socket-id]
   - 🧪 Test response received from backend: [data]

### 4. Test Real-Time Updates

#### Option A: Use the Test Script
```bash
cd backend
node test_realtime.js
```

This will:
- Insert a test message
- Update the message status
- Delete the test message
- Trigger change stream events

#### Option B: Send Messages via Frontend
1. Open a chat in the frontend
2. Send a message
3. Open another tab/window with the same frontend
4. The message should appear in real-time without refresh

### 5. Verify Change Stream Events

In the backend console, you should see:
- MongoDB change detected: insert [msgId]
- MongoDB change detected: update [msgId]
- Emitting message_changed for new message: [msgId]

In the frontend console, you should see:
- 🔍 message_changed event received: [data]
- 🔍 chat_summary event received: [data]

## Troubleshooting

### Socket Not Connecting
- Check if backend is running on port 3000
- Verify CORS settings in backend
- Check browser console for connection errors

### Change Streams Not Working
- Ensure MongoDB is running
- Check if MongoDB supports change streams (requires replica set for local MongoDB)
- Verify database connection in backend logs

### Real-Time Updates Not Working
- Check if socket is connected (green circle in UI)
- Verify change stream is established in backend logs
- Check if events are being emitted and received

## Key Files Modified

- `backend/src/server.js` - Main server with socket and change stream setup
- `backend/src/sockets.js` - Socket.io initialization
- `backend/src/db.js` - Database connection management
- `frontend/src/App.jsx` - Frontend socket handling and real-time updates
- `frontend/src/styles.css` - Connection status indicator styling

## Environment Variables

Make sure these are set (or they will use defaults):
- `MONGO_URI` - MongoDB connection string (default: mongodb://localhost:27017)
- `DB_NAME` - Database name (default: whatsapp)
- `PORT` - Backend port (default: 3000)
- `ORIGIN` - Frontend origin for CORS (default: http://localhost:5173)
