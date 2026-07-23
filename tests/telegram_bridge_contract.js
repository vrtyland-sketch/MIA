"use strict";

const assert = require("assert/strict");
const telegram = require("../scripts/MIA_TELEGRAM_BRIDGE");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

console.log("\n---- TELEGRAM BRIDGE CONTRACT ----\n");

test("resolveTelegramConfig reads env flags", () => {
  const prevEnabled = process.env.MIA_TELEGRAM_ENABLED;
  const prevToken = process.env.MIA_TELEGRAM_BOT_TOKEN;
  process.env.MIA_TELEGRAM_ENABLED = "1";
  process.env.MIA_TELEGRAM_BOT_TOKEN = "123:abc";
  try {
    const cfg = telegram.resolveTelegramConfig({});
    assert.equal(cfg.enabled, true);
    assert.equal(cfg.botToken, "123:abc");
  } finally {
    if (prevEnabled === undefined) delete process.env.MIA_TELEGRAM_ENABLED;
    else process.env.MIA_TELEGRAM_ENABLED = prevEnabled;
    if (prevToken === undefined) delete process.env.MIA_TELEGRAM_BOT_TOKEN;
    else process.env.MIA_TELEGRAM_BOT_TOKEN = prevToken;
  }
});

test("isUserAllowed respects explicit allow list", () => {
  const cfg = {
    allowedUserIds: ["111", "222"],
    streamerOnly: false,
    runtimeConfig: {}
  };
  assert.equal(telegram.isUserAllowed({ id: "111", username: "any" }, cfg), true);
  assert.equal(telegram.isUserAllowed({ id: "999", username: "any" }, cfg), false);
});

test("buildIncomingContext extracts text and photo attachment", () => {
  const ctx = telegram.buildIncomingContext({
    update_id: 1,
    message: {
      message_id: 9,
      from: { id: 42, username: "VasaSpinak" },
      chat: { id: 42, type: "private" },
      photo: [{ file_id: "p1" }, { file_id: "p2" }],
      caption: "mia co vidis"
    }
  });
  assert.equal(ctx.userLabel, "VasaSpinak");
  assert.equal(ctx.attachmentKind, "photo");
  assert.equal(ctx.text, "mia co vidis");
  assert.equal(ctx.fileId, "p2");
});

test("buildAttachmentAck names Czech media labels", () => {
  const text = telegram.buildAttachmentAck({ attachmentKind: "voice" });
  assert.match(text, /hlasovku/i);
});

test("status export exposes started flag", () => {
  const status = telegram.getTelegramBridgeStatus();
  assert.equal(typeof status.started, "boolean");
  assert.equal(typeof status.tokenConfigured, "boolean");
});

console.log("\n---- TELEGRAM BRIDGE CONTRACT SUMMARY ----\n");
