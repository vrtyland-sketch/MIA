"use strict";

/**
 * Herní konstanty (battle / inventář / chat).
 * Gift tiering a coin→body žijí v MIA_GIFT_TIERS + shared/gifts — tady jen odkaz.
 */

const giftTiers = require("./MIA_GIFT_TIERS");

const MIA_GAME_CONFIG = {
  ECONOMY: {
    /** Jediný zdroj: MIA_GIFT_TIERS.MIA_POINTS_PER_COIN */
    coin_to_points: giftTiers.MIA_POINTS_PER_COIN,
    comment_to_points: giftTiers.MIA_POINTS_PER_COIN,

    /** Legacy prahy (MIA body) — gift path používá stream tier + gift mapu, ne tyto. */
    thanks_threshold: giftTiers.MIA_POINTS_PER_COIN * 5,
    item_threshold: giftTiers.MIA_POINTS_PER_COIN * 10,
    video_threshold: giftTiers.MIA_POINTS_PER_COIN * 20,
    song_threshold: giftTiers.MIA_POINTS_PER_COIN * 33
  },

  /** Odkaz na stream coin tiery (dokumentace / UI). */
  STREAM_TIERS: giftTiers.COIN_TIER_THRESHOLDS,

  CHAT: {
    cooldown_sec: 10,
    cap_per_min: 6,

    min_length: 3,
    allow_emoji_only: false
  },

  INVENTORY: {
    overlay_duration_ms: 10000,
    overlay_duration_battle_ms: 8000,

    queue_max: 10,
    command_cooldown_sec: 5
  },

  BATTLE: {
    duration_sec: 300,

    action_interval_ms: 1000,
    user_cooldown_sec: 3,

    queue_max: 100
  },

  SCORE: {
    fight: 15,

    love_attack: 10,
    love_support: 5,

    friends_buff: 5,
    friends_buff_uses: 2,

    chaos_results: [0, 10, 15, 20, "support_10"]
  },

  ITEM_POOL: {
    chat: ["love", "chaos"],

    small_gift: ["love", "chaos", "fight"],
    mid_gift: ["fight", "shield", "love"],
    big_gift: ["fight", "shield", "friends"]
  }
};

module.exports = MIA_GAME_CONFIG;
