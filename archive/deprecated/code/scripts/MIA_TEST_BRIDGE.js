const { handleTikTokRaw } = require("./MIA_TIKTOK_NORMALIZER");
const { handleKickRaw } = require("./MIA_PARSER_KICK");

async function run() {
  console.log("=== TEST TIKTOK ===");
  await handleTikTokRaw({
    type: "gift",
    userId: "tt_001",
    nickname: "TikTokTester",
    profilePictureUrl: "https://example.com/avatar1.jpg",
    giftName: "Rose",
    giftId: "rose_1",
    coinValue: 1,
    repeatCount: 1
  });

  await new Promise((r) => setTimeout(r, 2000));

  console.log("=== TEST KICK ===");
  await handleKickRaw({
    type: "gift",
    userId: "kick_001",
    username: "KickTester",
    avatarUrl: "https://example.com/avatar2.jpg",
    giftName: "KickGift",
    giftId: "kickgift_1",
    amount: 150,
    count: 1
  });
}

run();