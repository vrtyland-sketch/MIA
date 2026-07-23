"use strict";

/**
 *   npm run twitch:probe
 */

const bridge = require("./MIA_TWITCH_BRIDGE");

const samples = [
  {
    type: "channel.chat.message",
    event: {
      broadcaster_user_id: "1",
      chatter: { user_id: "2", login: "viewer1", user_name: "Viewer1" },
      message: { text: "Ahoj MIA z Twitch probe" },
      message_id: "probe-chat-1"
    }
  },
  {
    type: "channel.cheer",
    event: {
      user_id: "3",
      user_login: "biter",
      user_name: "Biter",
      bits: 500,
      message: "cheer500 test"
    }
  },
  {
    type: "channel.follow",
    event: {
      user_id: "4",
      user_login: "newfan",
      user_name: "NewFan",
      followed_at: new Date().toISOString()
    }
  }
];

console.log("\n=== Twitch ingest mapping probe ===\n");

for (const s of samples) {
  const mapped = bridge.mapEventSubToIngest(s.type, s.event);
  console.log(s.type, "->", mapped?.eventType, mapped?.platform, mapped?.message || mapped?.giftName || "");
}

const st = bridge.getTwitchBridgeStatus();
console.log("\nBridge status:", JSON.stringify(st, null, 2));
console.log("\nPhase-1 subscriptions:", bridge.PHASE1_SUBSCRIPTIONS.map((x) => x.type).join(", "));
console.log("");
