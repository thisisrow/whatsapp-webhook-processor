const express = require("express");
const { sendMessage } = require("../controllers/messages.controller");
const router = express.Router();

router.post("/messages", sendMessage);

module.exports = router;
