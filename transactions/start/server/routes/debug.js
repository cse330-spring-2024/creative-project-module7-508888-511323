const express = require("express");
const { getLoggedInUserId } = require("../utils");
const db = require("../db");
const { plaidClient } = require("../plaid");
const {
  SandboxItemFireWebhookRequestWebhookCodeEnum,
  WebhookType,
} = require("plaid");

const router = express.Router();

module.exports = router;
