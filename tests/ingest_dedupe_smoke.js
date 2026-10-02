"use strict";

const assert = require("assert/strict");
const { createIngestDeduper } = require("../scripts/MIA_INGEST_GUARD");
const {
  normalizeEvent,
  readTrustedGiftSourceId,
  GIFT_TRUSTED_SOURCE_FIELDS
} = require("../shared/platform_normalizers/normalize_event");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function deduper(extra = {}) {
  return createIngestDeduper({
    nowTs: () => 10_000,
    windowMs: 4500,
    ...extra
  });
}

function rose(extra = {}) {
  return {
    platform: "tiktok",
    type: "gift",
    giftName: "Rose",
    giftId: "5655",
    coins: 1,
    repeatCount: 1,
    userId: "viewer-1",
    nickname: "Tomino",
    ...extra
  };
}

function withFrozenNow(now, fn) {
  const original = Date.now;
  Date.now = () => now;
  try {
    return fn();
  } finally {
    Date.now = original;
  }
}

function run() {
  test("comment text dedupe still suppresses a repeat with no event id", () => {
    const guard = deduper();
    const baseComment = {
      eventType: "COMMENT",
      platform: "tiktok",
      user: { userId: "0", username: "Tester", nickname: "Test User" },
      message: "ahoj mia"
    };
    assert.equal(guard.checkDuplicate(baseComment).duplicate, false);
    assert.equal(guard.checkDuplicate(baseComment).duplicate, true);
  });

  test("comment event-id dedupe is unchanged", () => {
    const guard = deduper();
    const first = normalizeEvent({
      platform: "tiktok",
      type: "comment",
      message: "ahoj mia",
      messageId: "c-1",
      userId: "0",
      username: "Tester"
    });
    const replay = normalizeEvent({
      platform: "tiktok",
      type: "comment",
      message: "a different line",
      messageId: "c-1",
      userId: "0",
      username: "Tester"
    });
    const other = normalizeEvent({
      platform: "tiktok",
      type: "comment",
      message: "ahoj mia",
      messageId: "c-2",
      userId: "0",
      username: "Tester"
    });

    assert.equal(first.eventId, "tiktok_comment_c-1");
    assert.equal(guard.checkDuplicate(first).duplicate, false);
    assert.equal(guard.checkDuplicate(replay).duplicate, true);
    assert.equal(guard.checkDuplicate(replay).key, "tiktok|COMMENT|tiktok_comment_c-1");
    assert.equal(guard.checkDuplicate(other).duplicate, false);
  });

  test("same Rose with different trusted event ids both pass", () => {
    const guard = deduper();
    const first = normalizeEvent(rose({ messageId: "msg-a" }));
    const second = normalizeEvent(rose({ eventId: "evt-b" }));

    assert.equal(first.trustedSourceId, "msg-a");
    assert.equal(first.eventIdentityTrusted, true);
    assert.equal(first.support.giftId, "5655");
    assert.equal(second.trustedSourceId, "evt-b");
    assert.equal(guard.checkDuplicate(first).duplicate, false);
    const admitted = guard.checkDuplicate(second);
    assert.equal(admitted.duplicate, false);
    assert.equal(admitted.identity, "trusted");
    assert.equal(admitted.reason, "trusted_source_id");
    assert.equal(admitted.key, "tiktok|GIFT|evt-b");
  });

  test("replay of the same trusted gift event id is a duplicate", () => {
    const guard = deduper();
    const first = normalizeEvent(rose({ transactionId: "txn-9" }));
    const replay = normalizeEvent(rose({ transactionId: "txn-9" }));

    assert.equal(first.trustedSourceId, "txn-9");
    assert.equal(guard.checkDuplicate(first).duplicate, false);
    const duplicate = guard.checkDuplicate(replay);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.reason, "trusted_source_id");
    assert.equal(duplicate.trustedSourceId, "txn-9");
    assert.equal(duplicate.key, "tiktok|GIFT|txn-9");
  });

  test("generic gift id is catalog identity and is not a trusted event id", () => {
    const guard = deduper();
    const logs = [];
    const loggingGuard = deduper({
      appendJsonLog: (channel, entry) => logs.push({ channel, entry })
    });
    const normalized = normalizeEvent({
      platform: "tiktok",
      type: "gift",
      giftName: "Rose",
      id: "5655",
      coins: 1,
      repeatCount: 1,
      userId: "viewer-1",
      nickname: "Tomino"
    });

    assert.deepEqual(GIFT_TRUSTED_SOURCE_FIELDS, [
      "eventId",
      "messageId",
      "msgId",
      "uuid",
      "transactionId"
    ]);
    assert.equal(readTrustedGiftSourceId({ id: "5655", giftName: "Rose" }), "");
    assert.equal(normalized.support.giftId, "5655");
    assert.equal(normalized.eventIdentityTrusted, false);
    assert.equal(normalized.trustedSourceId, null);
    assert.notEqual(normalized.eventId, "tiktok_gift_5655");

    const first = loggingGuard.checkDuplicate(normalized);
    const second = loggingGuard.checkDuplicate(
      normalizeEvent({
        platform: "tiktok",
        type: "gift",
        giftName: "Rose",
        id: "5655",
        coins: 1,
        repeatCount: 1,
        userId: "viewer-1",
        nickname: "Tomino"
      })
    );
    assert.equal(first.duplicate, false);
    assert.equal(first.reason, "no_trusted_gift_source_id");
    assert.equal(first.identity, "untrusted");
    assert.equal(second.duplicate, false);
    assert.equal(second.reason, "no_trusted_gift_source_id");
    assert.equal(logs.length, 2);
    assert.ok(logs.every((row) => row.channel === "ingest-deduped"));
    assert.ok(logs.every((row) => row.entry.reason === "no_trusted_gift_source_id"));
    assert.equal(guard.checkDuplicate(normalized).duplicate, false);
  });

  test("synthesized event ids in one second do not prove a gift duplicate", () => {
    const guard = deduper();
    const pair = withFrozenNow(1_700_000_000_000, () => {
      const payload = {
        platform: "tiktok",
        type: "gift",
        giftName: "Rose",
        giftId: "5655",
        coins: 1,
        repeatCount: 1,
        userId: "viewer-1",
        nickname: "Tomino"
      };
      return [normalizeEvent(payload), normalizeEvent(payload)];
    });

    assert.equal(pair[0].eventIdentityTrusted, false);
    assert.equal(pair[0].eventId, pair[1].eventId);
    assert.match(pair[0].eventId, /^tiktok_gift_[0-9a-f]{16}$/);
    assert.equal(guard.checkDuplicate(pair[0]).duplicate, false);
    const second = guard.checkDuplicate(pair[1]);
    assert.equal(second.duplicate, false);
    assert.equal(second.identity, "untrusted");
    assert.equal(second.reason, "no_trusted_gift_source_id");
    assert.equal(second.key, null);
  });

  test("msgId and uuid are trusted gift event ids", () => {
    const guard = deduper();
    const byMsg = normalizeEvent(rose({ msgId: "tiktok-msg-1" }));
    const byUuid = normalizeEvent(rose({ uuid: "uuid-2" }));
    assert.equal(byMsg.trustedSourceId, "tiktok-msg-1");
    assert.equal(byMsg.eventId, "tiktok_gift_tiktok-msg-1");
    assert.equal(byUuid.trustedSourceId, "uuid-2");
    assert.equal(guard.checkDuplicate(byMsg).duplicate, false);
    assert.equal(guard.checkDuplicate(byUuid).duplicate, false);
    assert.equal(
      guard.checkDuplicate(normalizeEvent(rose({ msgId: "tiktok-msg-1" }))).duplicate,
      true
    );
  });

  test("a gift payload with no trusted id is not dropped by the old tuple", () => {
    const guard = deduper();
    const gift = {
      eventType: "GIFT",
      platform: "tiktok",
      user: { userId: "0", username: "Tester" },
      support: { giftId: "10", giftName: "Rose", coins: 1, repeatCount: 1 }
    };
    const first = guard.checkDuplicate(gift);
    const second = guard.checkDuplicate(gift);
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, false);
    assert.equal(second.reason, "no_trusted_gift_source_id");
    assert.equal(guard.buildDedupeKey(gift), null);
  });

  console.log("");
  console.log("---- INGEST DEDUPE SMOKE ----");
  console.log("passed");
}

run();
