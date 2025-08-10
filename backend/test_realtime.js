// test_realtime.js - Test script to verify real-time socket updates
require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "whatsapp";

async function testRealtime() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection("processed_messages");
    
    console.log("✅ Connected to MongoDB");
    
    // Create a test message
    const testMessage = {
      msgId: "test-" + Date.now(),
      metaMsgId: "test-" + Date.now(),
      direction: "inbound",
      type: "text",
      from: "1234567890",
      to: "0987654321",
      waId: "1234567890",
      contactName: "Test User",
      phoneNumberId: "test-phone-id",
      displayPhoneNumber: "0987654321",
      textBody: "Test message at " + new Date().toISOString(),
      timestamp: new Date(),
      currentStatus: "delivered",
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      raw: { test: true }
    };
    
    console.log("📝 Inserting test message...");
    await col.insertOne(testMessage);
    console.log("✅ Test message inserted");
    
    // Wait a moment for change stream to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update the message status
    console.log("📝 Updating test message status...");
    await col.updateOne(
      { msgId: testMessage.msgId },
      { $set: { currentStatus: "read", updatedAt: new Date() } }
    );
    console.log("✅ Test message updated");
    
    // Wait a moment for change stream to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clean up test message
    console.log("🧹 Cleaning up test message...");
    await col.deleteOne({ msgId: testMessage.msgId });
    console.log("✅ Test message cleaned up");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await client.close();
    console.log("🔌 MongoDB connection closed");
  }
}

console.log("🚀 Starting real-time test...");
testRealtime().then(() => {
  console.log("✅ Test completed");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
