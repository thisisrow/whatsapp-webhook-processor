const express = require("express");
const chats = require("./chats.routes");
const messages = require("./messages.routes");
const webhook = require("./webhook.routes");

const api = express.Router();
api.use("/api", chats);
api.use("/api", messages);
api.use("/", webhook); 

module.exports = api;
