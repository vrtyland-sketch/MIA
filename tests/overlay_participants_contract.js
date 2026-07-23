"use strict";

const assert = require("assert/strict");
const {
  createOverlayState,
  getOverlaySnapshot,
  pushRecentParticipant,
  pushChatFeedItem
} = require("../scripts/MIA_OVERLAY_STATE");

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

test("pushRecentParticipant keeps unique users and moves latest first", () => {
  let state = createOverlayState();

  pushRecentParticipant(state, {
    user: "Alpha",
    avatarUrl: "https://example.com/a.png",
    type: "chat",
    platform: "tiktok"
  });
  pushRecentParticipant(state, {
    user: "Beta",
    type: "gift",
    platform: "tiktok"
  });
  pushRecentParticipant(state, {
    user: "Alpha",
    avatarUrl: "https://example.com/a2.png",
    type: "gift",
    platform: "tiktok"
  });

  const snapshot = getOverlaySnapshot(state, { maxRecentParticipants: 8 });
  assert.equal(snapshot.recentParticipants.length, 2);
  assert.equal(snapshot.recentParticipants[0].user, "Alpha");
  assert.equal(snapshot.recentParticipants[0].type, "gift");
  assert.equal(snapshot.recentParticipants[0].avatarUrl, "https://example.com/a2.png");
  assert.equal(snapshot.recentParticipants[1].user, "Beta");
});

test("chat feed stores avatarUrl when provided", () => {
  let state = createOverlayState();

  pushChatFeedItem(state, {
    user: "ChatUser",
    avatarUrl: "https://example.com/chat.png",
    text: "Ahoj stream",
    platform: "kick"
  });

  const snapshot = getOverlaySnapshot(state);
  assert.equal(snapshot.chatFeed.length, 1);
  assert.equal(snapshot.chatFeed[0].avatarUrl, "https://example.com/chat.png");
});

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("");
console.log("---- OVERLAY PARTICIPANTS CONTRACT ----");
console.log("passed");
