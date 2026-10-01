"use strict";

/**
 * Platform catalog — Multi-Platform Integration Layer.
 * Describes auth, capabilities, bridge modules. Chat-only defaults protect frozen Stream Core.
 */

const PLATFORMS = Object.freeze({
  tiktok: {
    id: "tiktok",
    displayName: "TikTok",
    priority: 1,
    authModes: ["tikfinity"],
    bridgeModule: null, // TikFinity → HTTP POST /ingest (external)
    capabilities: {
      chat: true,
      gift: true,
      follow: true,
      subscribe: false,
      like: true,
      chatOnlyDefault: false
    },
    eventMap: {
      chat: "TikFinity chat → COMMENT",
      gift: "TikFinity gift → GIFT",
      follow: "follow → FOLLOW",
      like: "like → LIKE"
    },
    requiredEnv: [],
    optionalEnv: ["MIA_INGEST_SECRET"],
    officialApiNotes:
      "Live ingest přes TikFinity (ne přímé TikTok Open API). Gift lane = Stream Core.",
    operatorSteps: [
      "Spusť TikFinity a nasměruj webhook/HTTP na MIA /ingest",
      "Ověř chat + gift v R1-D / Genesis test scéně"
    ],
    reconnect: "TikFinity client / MIA ingest ACK",
    freezePolicy: "core_allowed"
  },

  kick: {
    id: "kick",
    displayName: "Kick",
    priority: 2,
    authModes: ["pusher", "webhook"],
    bridgeModule: "scripts/MIA_KICK_BRIDGE.js",
    capabilities: {
      chat: true,
      gift: false,
      follow: false,
      subscribe: false,
      like: false,
      chatOnlyDefault: true
    },
    eventMap: {
      chat: "Pusher ChatMessageEvent → COMMENT"
    },
    requiredEnv: ["MIA_KICK_ENABLED"],
    optionalEnv: [
      "MIA_KICK_CHANNEL",
      "MIA_KICK_CHATROOM_ID",
      "MIA_KICK_PUSHER_KEY",
      "MIA_KICK_CLUSTER"
    ],
    officialApiNotes:
      "Realtime chat přes Kick/Pusher WS. Webhook tipy = pozdější monetizace.",
    operatorSteps: [
      "Nastav MIA_KICK_ENABLED=1 a channel/chatroom",
      "Restart MIA → ověř kick chat v logu"
    ],
    reconnect: "WS auto-reconnect v MIA_KICK_BRIDGE",
    freezePolicy: "adapter_chat"
  },

  twitch: {
    id: "twitch",
    displayName: "Twitch",
    priority: 3,
    authModes: ["oauth"],
    bridgeModule: "scripts/MIA_TWITCH_BRIDGE.js",
    oauthScript: "scripts/twitch_oauth_login.js",
    tokenFile: "twitch_oauth.json",
    capabilities: {
      chat: true,
      gift: false,
      follow: true,
      subscribe: false,
      like: false,
      chatOnlyDefault: true
    },
    eventMap: {
      chat: "EventSub channel.chat.message → COMMENT",
      follow: "channel.follow → FOLLOW",
      gift: "cheer/sub → GIFT (OFF when MIA_TWITCH_CHAT_ONLY=1)"
    },
    requiredEnv: [
      "MIA_TWITCH_ENABLED",
      "TWITCH_CLIENT_ID",
      "TWITCH_ACCESS_TOKEN",
      "TWITCH_CHANNEL_LOGIN"
    ],
    optionalEnv: [
      "TWITCH_CLIENT_SECRET",
      "TWITCH_BROADCASTER_ID",
      "TWITCH_REFRESH_TOKEN",
      "MIA_TWITCH_CHAT_ONLY"
    ],
    officialApiNotes:
      "Twitch Helix + EventSub WebSocket. OAuth: npm run twitch:login",
    operatorSteps: [
      "Zaregistruj app na https://dev.twitch.tv/console/apps",
      "Do .env: TWITCH_CLIENT_ID / SECRET / CHANNEL_LOGIN",
      "npm run twitch:login (prohlížeč + 2FA = ty)",
      "MIA_TWITCH_ENABLED=1, MIA_TWITCH_CHAT_ONLY=1",
      "npm run restart → npm run twitch:status"
    ],
    reconnect: "EventSub session_reconnect + timer v MIA_TWITCH_BRIDGE",
    freezePolicy: "adapter_chat"
  },

  youtube: {
    id: "youtube",
    displayName: "YouTube Live",
    priority: 4,
    authModes: ["api_key"],
    bridgeModule: "scripts/MIA_YOUTUBE_BRIDGE.js",
    tokenFile: "youtube_oauth.json",
    capabilities: {
      chat: true,
      gift: false,
      follow: false,
      subscribe: false,
      like: false,
      chatOnlyDefault: true
    },
    eventMap: {
      chat: "liveChatMessages.list → COMMENT",
      gift: "superChatEvent SKIPPED (chat-only)"
    },
    requiredEnv: ["MIA_YOUTUBE_ENABLED", "YOUTUBE_API_KEY"],
    optionalEnv: [
      "YOUTUBE_LIVE_CHAT_ID",
      "YOUTUBE_VIDEO_ID",
      "MIA_YOUTUBE_POLL_MS"
    ],
    officialApiNotes:
      "YouTube Data API v3 Live Chat. API key stačí pro veřejný live chat poll.",
    operatorSteps: [
      "Google Cloud → YouTube Data API v3 → API key",
      "YOUTUBE_API_KEY + YOUTUBE_LIVE_CHAT_ID (nebo VIDEO_ID při live)",
      "MIA_YOUTUBE_ENABLED=1 → restart",
      "Ověř platform=youtube v ingest logu"
    ],
    reconnect: "poll interval + resolve liveChatId",
    freezePolicy: "adapter_chat"
  },

  telegram: {
    id: "telegram",
    displayName: "Telegram",
    priority: 90,
    authModes: ["bot_token"],
    bridgeModule: "scripts/MIA_TELEGRAM_BRIDGE.js",
    capabilities: {
      chat: true,
      gift: false,
      follow: false,
      subscribe: false,
      like: false,
      chatOnlyDefault: true
    },
    eventMap: {
      chat: "bot updates → streamer command / chat"
    },
    requiredEnv: ["MIA_TELEGRAM_ENABLED", "MIA_TELEGRAM_BOT_TOKEN"],
    optionalEnv: ["MIA_TELEGRAM_ALLOWED_USER_IDS", "MIA_TELEGRAM_STREAMER_ONLY"],
    officialApiNotes: "Bot API long poll — operátorské příkazy, ne veřejný stream chat.",
    operatorSteps: ["npm run telegram:setup", "ulož bot token", "enable"],
    reconnect: "poll loop",
    freezePolicy: "ops_only"
  }
});

function listPlatforms({ includeOps = true } = {}) {
  return Object.values(PLATFORMS)
    .filter((p) => includeOps || p.freezePolicy !== "ops_only")
    .sort((a, b) => a.priority - b.priority);
}

function getPlatform(id) {
  return PLATFORMS[String(id || "").toLowerCase()] || null;
}

function streamPlatforms() {
  return listPlatforms({ includeOps: false }).filter((p) =>
    ["tiktok", "kick", "twitch", "youtube"].includes(p.id)
  );
}

module.exports = {
  PLATFORMS,
  listPlatforms,
  getPlatform,
  streamPlatforms
};
