const express = require("express");
const { listChats, listMessages } = require("../controllers/chats.controller");
const router = express.Router();

router.get("/chats", listChats);
router.get("/chats/:waId/messages", listMessages);

module.exports = router;
