"use strict";

/**
 * Test mode — synthetic multi-platform events for dry validation.
 * Does not touch economy; payloads are chat/follow oriented by default.
 */

const { toMiaEventType } = require("./eventKinds");

function buildTestEvent({
  platform = "twitch",
  kind = "chat",
  message = "mia platform test",
  username = "mia_tester",
  userId = "test-user"
} = {}) {
  const eventType = toMiaEventType(kind === "chat" ? "COMMENT" : kind);
  const base = {
    source: `${platform}_test_harness`,
    provider: platform,
    platform,
    type: eventType.toLowerCase(),
    eventType: eventType.toLowerCase(),
    message,
    content: message,
    text: message,
    comment: message,
    username,
    nickname: username,
    userId,
    user: { userId, username, nickname: username },
    ts: Date.now(),
    testMode: true
  };

  if (platform === "twitch") {
    base.twitchEventType = "channel.chat.message";
  }
  if (platform === "youtube") {
    base.liveChatId = "test-live-chat";
  }
  if (platform === "kick") {
    base.chatroomId = "test-chatroom";
  }
  if (platform === "tiktok") {
    base.uniqueId = username;
  }

  return base;
}

function buildFourPlatformChatBurst(message = "four-platform smoke") {
  return ["tiktok", "kick", "twitch", "youtube"].map((platform) =>
    buildTestEvent({
      platform,
      kind: "chat",
      message: `[${platform}] ${message}`,
      username: `tester_${platform}`,
      userId: `uid-${platform}`
    })
  );
}

module.exports = {
  buildTestEvent,
  buildFourPlatformChatBurst
};
