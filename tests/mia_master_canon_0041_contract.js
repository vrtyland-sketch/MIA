"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const economy = require("../shared/mia-economy-core");
const inventory = require("../shared/mia-inventory-core");
const battle = require("../shared/mia-battle-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0041-economy-engine.md");
  const alignPath = path.join(MASTER, "0041-alignment.md");

  assert.ok(fs.existsSync(docPath), "0041-economy-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0041-alignment.md exists");
  pass("0041 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 24; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0041 section ${i}`);
  }
  assert.ok(doc.includes("Economy Core"), "0041 critical priority");
  assert.ok(doc.includes("0040"), "0041 links to 0040");
  assert.ok(doc.includes("0042"), "0041 points to 0042");
  pass("0041 structure (24 sections)");

  assert.equal(economy.EE_COMPONENT_ORDER.length, 12);
  pass("economy components");

  assert.equal(economy.EE_POINT_RATE.COIN_TO_POINTS, 7.5);
  assert.equal(economy.EE_POINT_RATE.VALID_COMMENT_TO_POINTS, 7.5);
  assert.equal(economy.EE_MILESTONE.PLAYLIST, 250);
  pass("canon point rates and milestones");

  const giftPoints = economy.calculatePoints("gift", { coins: 10 });
  assert.equal(giftPoints.points, 75);
  pass("point calculator gift");

  const gift = economy.processGiftEconomy({ coins: 10 });
  assert.equal(gift.points, 75);
  pass("gift economy");

  const chat = economy.processChatEconomy({
    userId: "katka",
    message: "Ahoj MIA!",
    now: 1000
  });
  assert.equal(chat.points, 7.5);
  const spam = economy.processChatEconomy({ userId: "katka", message: "", spam: true });
  assert.equal(spam.ok, false);
  pass("chat economy");

  const bowl = economy.processBowlEconomy({ percent: 95 }, 100);
  assert.equal(bowl.full, true);
  assert.equal(bowl.triggerTier, "T4");
  pass("bowl economy");

  const playlist = economy.processPlaylistEconomy(300, { enqueue: true });
  assert.equal(playlist.ok, true);
  assert.equal(playlist.balanceAfter, 50);
  pass("playlist economy");

  const milestone = economy.resolveMilestoneReward(80);
  assert.ok(milestone.rewards.includes(economy.EE_REWARD_TYPE.ITEM));
  pass("reward manager");

  const achievement = economy.evaluateAchievement({ firstGift: true, totalPoints: 1200 });
  assert.ok(achievement.unlocked.includes("first_gift"));
  assert.ok(achievement.unlocked.includes("points_1000"));
  pass("achievement manager");

  const invalidChange = economy.validateEconomyChange({ points: -1 });
  assert.equal(invalidChange.ok, false);
  pass("economy validator");

  const engine = economy.createEconomyEngine({ initialBalance: 0 });
  const inventoryEngine = inventory.createInventoryEngine();
  inventoryEngine.registerDefinition({
    itemId: "community_item",
    name: "Community Item",
    type: inventory.IE_ITEM_TYPE.FOOD,
    maxStack: 5
  });

  const giftEvent = engine.processEvent(
    {
      event: { type: "gift", coins: 10, userId: "vasa", itemId: "community_item" }
    },
    { inventoryEngine }
  );
  assert.equal(giftEvent.ok, true);
  assert.equal(giftEvent.points, 75);
  assert.equal(giftEvent.balance, 75);
  assert.ok(giftEvent.reward);
  assert.ok(giftEvent.inventory?.ok);
  pass("gift to inventory pipeline");

  const chatEvent = engine.processEvent({
    event: { type: "chat", userId: "katka", message: "Super stream!", now: Date.now() }
  });
  assert.equal(chatEvent.ok, true);
  assert.equal(chatEvent.points, 7.5);
  pass("chat economy pipeline");

  const playlistEngine = economy.createEconomyEngine({ initialBalance: 300 });
  const playlistEvent = playlistEngine.processEvent({
    event: { type: "playlist_enqueue" }
  });
  assert.equal(playlistEvent.ok, true);
  assert.equal(playlistEvent.playlist.cost, 250);
  pass("playlist debit pipeline");

  const battleEngine = battle.createBattleEngine();
  const battleReward = engine.processEvent({
    event: { type: "battle_reward", points: 25, firstVictory: true }
  });
  assert.equal(battleReward.ok, true);
  assert.equal(battleReward.controlsBattle, false);
  assert.ok(battleReward.achievements.unlocked.includes("first_victory"));
  pass("battle reward via economy");

  const started = battleEngine.start({
    fromDecision: true,
    tiktokBattleTrigger: true,
    participants: ["katka"]
  });
  assert.equal(started.ok, true);
  pass("battle independent of economy calculation");

  const blocked = engine.processEvent({ controlsBattle: true, event: { type: "gift", coins: 1 } });
  assert.equal(blocked.ok, false);
  pass("reject economy battle control");

  assert.equal(economy.assertEconomyForbiddenActivity("control_battle").ok, false);
  assert.equal(economy.assertEconomyForbiddenActivity("mutate_memory").ok, false);
  pass("forbidden activities");

  const ecoSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.ECONOMY);
  assert.equal(ecoSys.nextDocId, "0088");
  assert.ok(ecoSys.runtime.includes("shared/mia-economy-core/economyEngine.js"));
  pass("economy system next doc 0045");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  pass("game system next doc 0045");

  for (const rel of economy.EE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0041"), "README 0041");
  pass("README registry");

  console.log("\nMaster Canon 0041 contract: ALL PASS");
}

run();
