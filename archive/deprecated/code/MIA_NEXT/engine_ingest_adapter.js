"use strict";

/**
 * MIA_NEXT ingest adapter
 *
 * Převádí raw event → normalized_event kontrakt
 */

const {
  createNormalizedEvent
} = require("./core_contracts_normalized_event");

function adaptRawEvent(raw = {}) {
  if (!raw || typeof raw !== "object") {
    return createNormalizedEvent({});
  }

  return createNormalizedEvent({
    platform: raw.platform,
    source: raw.source,

    eventType: raw.eventType || raw.type,

    message: raw.message || raw.text,

    user: raw.user || {
      username: raw.username,
      nickname: raw.nickname
    },

    support: raw.support || {
      tier: raw.tier,
      coins: raw.coins,
      giftName: raw.giftName
    },

    communityImpact: raw.communityImpact || null,

    ts: raw.ts || Date.now(),
    raw
  });
}

module.exports = {
  adaptRawEvent
};