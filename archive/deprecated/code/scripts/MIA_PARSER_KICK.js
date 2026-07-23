const { buildBaseEvent } = require("./MIA_EVENT_SCHEMA");

function normalizeKickComment(raw) {
  const username =
    raw?.kickUsername ||
    raw?.username ||
    raw?.nickname ||
    "kick_user";

  return buildBaseEvent({
    platform: "kick",
    source: "kick_chatroom",
    rawType: raw?.type || "comment",
    eventType: "COMMENT",
    user: {
      platformUserId: raw?.kickUserId || raw?.userId || null,
      nickname: username,
      avatarUrl: null
    },
    meta: {
      message: raw?.content || "",
      content: raw?.content || ""
    },
    raw
  });
}

function normalizeKickSupport(raw) {
  const username =
    raw?.kickUsername ||
    raw?.username ||
    raw?.nickname ||
    "kick_user";

  const amount =
    Number(raw?.amount) ||
    Number(raw?.coins) ||
    0;

  return buildBaseEvent({
    platform: "kick",
    source: "kick_support",
    rawType: raw?.type || "support",
    eventType: "GIFT",
    user: {
      platformUserId: raw?.kickUserId || raw?.userId || null,
      nickname: username,
      avatarUrl: null
    },
    meta: {
      amount,
      giftName: raw?.giftName || null,
      giftId: raw?.giftId || null
    },
    raw
  });
}

module.exports = {
  normalizeKickComment,
  normalizeKickSupport
};