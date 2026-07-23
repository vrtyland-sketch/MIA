"use strict";

const assert = require("assert/strict");
const { createIngestDeduper } = require("../scripts/MIA_INGEST_GUARD");

const deduper = createIngestDeduper({
  nowTs: () => 10_000,
  windowMs: 4500
});

const baseComment = {
  eventType: "COMMENT",
  platform: "tiktok",
  user: { userId: "0", username: "Tester", nickname: "Test User" },
  message: "ahoj mia"
};

assert.equal(deduper.checkDuplicate(baseComment).duplicate, false);
assert.equal(deduper.checkDuplicate(baseComment).duplicate, true);

const gift = {
  eventType: "GIFT",
  platform: "tiktok",
  user: { userId: "0", username: "Tester" },
  support: { giftId: "10", giftName: "Rose", coins: 1, repeatCount: 1 }
};

assert.equal(deduper.checkDuplicate(gift).duplicate, false);
assert.equal(deduper.checkDuplicate(gift).duplicate, true);

console.log("✅ ingest deduper suppresses duplicate chat/gift within window");
