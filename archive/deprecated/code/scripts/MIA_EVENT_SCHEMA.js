function buildBaseEvent({
  platform,
  source,
  rawType,
  eventType,
  user = {},
  meta = {},
  raw = null,
  spaceId = "SPINAK"
}) {
  return {
    eventId: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    spaceId,
    platform,
    source,
    rawType,
    eventType,
    ts: Date.now(),
    user: {
      platformUserId: user.platformUserId || null,
      nickname: user.nickname || "unknown",
      avatarUrl: user.avatarUrl || null
    },
    meta,
    raw
  };
}

module.exports = {
  buildBaseEvent
};