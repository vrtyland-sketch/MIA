function classifyEvent(event) {
  if (!event || typeof event !== "object") {
    return {
      streamType: "ignore",
      reason: "invalid_event"
    };
  }

  const eventType = String(event.eventType || "").toUpperCase();
  const platform = String(event.platform || "unknown").toLowerCase();

  // SUPPORT STREAM
  if (
    eventType === "GIFT" ||
    eventType === "SUBSCRIPTION" ||
    eventType === "DONATION" ||
    eventType === "BITS" ||
    eventType === "SUPERCHAT"
  ) {
    return {
      streamType: "support",
      platform,
      eventType
    };
  }

  // COMMUNITY STREAM
  if (
    eventType === "COMMENT" ||
    eventType === "CHAT_MESSAGE" ||
    eventType === "LIKE" ||
    eventType === "FOLLOW" ||
    eventType === "SHARE" ||
    eventType === "JOIN" ||
    eventType === "COMMUNITY_ACTIVITY"
  ) {
    return {
      streamType: "community",
      platform,
      eventType
    };
  }

  // SYSTEM STREAM
  if (
    eventType === "SYSTEM" ||
    eventType === "HEALTH" ||
    eventType === "DEBUG"
  ) {
    return {
      streamType: "system",
      platform,
      eventType
    };
  }

  return {
    streamType: "ignore",
    platform,
    eventType,
    reason: "unknown_event_type"
  };
}

module.exports = {
  classifyEvent
};