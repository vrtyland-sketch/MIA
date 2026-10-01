"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const inventory = require("../shared/mia-inventory-core");
const battle = require("../shared/mia-battle-core");
const decision = require("../shared/mia-decision-core");
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
  const docPath = path.join(MASTER, "0040-inventory-engine.md");
  const alignPath = path.join(MASTER, "0040-alignment.md");

  assert.ok(fs.existsSync(docPath), "0040-inventory-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0040-alignment.md exists");
  pass("0040 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 25; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0040 section ${i}`);
  }
  assert.ok(doc.includes("Gameplay Core"), "0040 critical priority");
  assert.ok(doc.includes("0039"), "0040 links to 0039");
  assert.ok(doc.includes("0041"), "0040 points to 0041");
  pass("0040 structure (25 sections)");

  assert.equal(inventory.IE_COMPONENT_ORDER.length, 12);
  pass("inventory components");

  const engine = inventory.createInventoryEngine();
  const apple = engine.registerDefinition({
    itemId: "apple",
    name: "Jablko",
    type: inventory.IE_ITEM_TYPE.FOOD,
    rarity: inventory.IE_RARITY.COMMON,
    maxStack: 25
  });
  const prak = engine.registerDefinition({
    itemId: "slingshot",
    name: "Prak",
    type: inventory.IE_ITEM_TYPE.WEAPON,
    rarity: inventory.IE_RARITY.RARE,
    maxStack: 1
  });
  assert.ok(apple.definition.itemId === "apple");
  pass("item registry");

  const inv = inventory.createInventory({
    ownerId: "katka",
    type: inventory.IE_INVENTORY_TYPE.PLAYER
  });
  assert.equal(inv.type, inventory.IE_INVENTORY_TYPE.PLAYER);
  pass("inventory manager");

  const instance = inventory.createItemInstance(apple.definition, "katka");
  const stacked = inventory.stackItems(inv, [instance, instance, instance], apple.definition);
  assert.ok(stacked.stacks[0].quantity === 3);
  pass("stack manager");

  const equipped = inventory.equipItem(inv, instance, inventory.IE_EQUIP_SLOT.HANDS);
  assert.equal(equipped.slot, inventory.IE_EQUIP_SLOT.HANDS);
  pass("equipment manager");

  const loot = inventory.rollLoot(
    inventory.IE_LOOT_SOURCE.CHAT,
    { entries: [{ itemId: "apple", weight: 1, rarity: inventory.IE_RARITY.COMMON }] },
    () => 0.5
  );
  assert.equal(loot.itemId, "apple");
  pass("loot manager");

  const chatGrant = engine.grantLoot({
    ownerId: "katka",
    inventoryId: "inv-katka",
    source: inventory.IE_LOOT_SOURCE.CHAT,
    table: { entries: [{ itemId: "apple", weight: 1 }] },
    rng: () => 0.5
  });
  assert.equal(chatGrant.ok, true);
  assert.ok(chatGrant.instance.instanceId);
  pass("grant loot from chat");

  const giftGrant = engine.grantLoot({
    ownerId: "vasa",
    inventoryId: "inv-vasa",
    source: inventory.IE_LOOT_SOURCE.GIFT,
    table: { entries: [{ itemId: "slingshot", weight: 1, rarity: inventory.IE_RARITY.RARE }] },
    rng: () => 0.1
  });
  assert.equal(giftGrant.loot.source, inventory.IE_LOOT_SOURCE.GIFT);
  pass("grant loot from gift");

  const crafted = engine.craft(
    { recipeId: "wood_stone_slingshot", inputs: ["apple"], outputItemId: "slingshot" },
    "inv-katka"
  );
  assert.equal(crafted.ok, true);
  pass("crafting manager");

  const trade = inventory.executeTrade(
    inventory.createInventory({ inventoryId: "inv-katka", ownerId: "katka", itemRefs: [] }),
    inventory.createInventory({ inventoryId: "inv-vasa", ownerId: "vasa", itemRefs: [] }),
    chatGrant.instance,
    { audited: true }
  );
  assert.equal(trade.audited, true);
  pass("trade manager");

  const validation = engine.validate("inv-katka");
  assert.equal(validation.ok, true);
  pass("inventory validator");

  const decisionEngine = decision.createDecisionEngine();
  const decided = decisionEngine.decide({
    sources: { event: { type: "battle", userId: "katka", battleActive: true } },
    adapters: { memory: { working: true, shortTerm: true } }
  });

  const battleEngine = battle.createBattleEngine();
  const started = battleEngine.start({
    fromDecision: true,
    decision: decided,
    tiktokBattleTrigger: true,
    participants: ["katka", "vasa"],
    inventoryType: inventory.IE_INVENTORY_TYPE.BATTLE
  });
  assert.equal(started.ok, true);

  const used = engine.useInBattle({
    inventoryId: "inv-katka",
    battleId: started.battle.battleId,
    instanceId: chatGrant.instance.instanceId,
    cooldownMs: battle.BE_DEFAULT_ACTION_COOLDOWN_MS
  });
  assert.equal(used.ok, true);
  assert.equal(used.battleManaged, false);

  const battleAction = battleEngine.queueAction({
    playerId: "katka",
    action: battle.BE_ACTION.ITEM,
    item: { itemId: "apple", power: 4, instanceId: chatGrant.instance.instanceId },
    randomSeed: 7
  });
  assert.equal(battleAction.ok, true);
  pass("inventory to battle pipeline");

  const analytics = engine.analytics();
  assert.ok(analytics.usageCount >= 1);
  pass("inventory analytics");

  const invalid = engine.grantLoot({ createOutsideLoot: true, bypassDecisionEngine: true });
  assert.equal(invalid.ok, false);
  pass("reject invalid loot grant");

  assert.equal(inventory.assertInventoryForbiddenActivity("decide_battle").ok, false);
  assert.equal(inventory.assertInventoryForbiddenActivity("mutate_economy").ok, false);
  pass("forbidden activities");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  assert.ok(gameSys.runtime.includes("shared/mia-inventory-core/inventoryEngine.js"));
  pass("game system next doc 0041");

  const ecoSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.ECONOMY);
  assert.equal(ecoSys.nextDocId, "0088");
  pass("economy system next doc 0041");

  for (const rel of inventory.IE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0040"), "README 0040");
  pass("README registry");

  console.log("\nMaster Canon 0040 contract: ALL PASS");
}

run();
