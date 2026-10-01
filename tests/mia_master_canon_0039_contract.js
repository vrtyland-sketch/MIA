"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const battle = require("../shared/mia-battle-core");
const obs = require("../shared/mia-obs-core");
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
  const docPath = path.join(MASTER, "0039-battle-engine.md");
  const alignPath = path.join(MASTER, "0039-alignment.md");

  assert.ok(fs.existsSync(docPath), "0039-battle-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0039-alignment.md exists");
  pass("0039 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 23; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0039 section ${i}`);
  }
  assert.ok(doc.includes("Gameplay Core"), "0039 critical priority");
  assert.ok(doc.includes("0038"), "0039 links to 0038");
  assert.ok(doc.includes("0040"), "0039 points to 0040");
  pass("0039 structure (23 sections)");

  assert.equal(battle.BE_COMPONENT_ORDER.length, 12);
  pass("battle components");

  const managed = battle.manageBattle({
    type: battle.BE_TYPE.COMMUNITY,
    participants: ["katka", "vasa"],
    durationMs: battle.BE_DEFAULT_DURATION_MS
  });
  assert.equal(managed.durationMs, 5 * 60 * 1000);
  pass("battle manager");

  const session = battle.createBattleSession(managed, { activePlayers: ["katka", "vasa"] });
  assert.ok(session.endsAt > session.startedAt);
  pass("battle session manager");

  const transition = battle.transitionBattleState(battle.BE_STATE.WAITING, battle.BE_STATE.PREPARING);
  assert.equal(transition.ok, true);
  const skip = battle.transitionBattleState(battle.BE_STATE.WAITING, battle.BE_STATE.ACTIVE);
  assert.equal(skip.ok, false);
  pass("battle state machine");

  const inventory = battle.createInventory("battle-1", [{ itemId: "love-potion" }]);
  assert.equal(inventory.separateFromStreamEconomy, true);
  pass("inventory manager");

  const item = battle.defineItem({
    itemId: "love",
    name: "Love",
    effect: battle.BE_ACTION.LOVE,
    rarity: "rare"
  });
  assert.equal(item.item.cooldownMs, battle.BE_DEFAULT_ACTION_COOLDOWN_MS);
  pass("item manager");

  const queued = battle.enqueueBattleAction([], {
    playerId: "katka",
    action: battle.BE_ACTION.LOVE
  });
  assert.equal(queued.entry.playerId, "katka");
  pass("action queue");

  const tankVsAssassin = battle.calculateDamage({
    attackerClass: battle.BE_KOJ_CLASS.ASSASSIN,
    defenderClass: battle.BE_KOJ_CLASS.TANK,
    item: { power: 5 },
    randomSeed: 42
  });
  assert.ok(tankVsAssassin.damage >= 1);
  assert.equal(tankVsAssassin.deterministic, true);
  pass("damage calculator");

  const ai = battle.controlAiBattle({ risk: 0.2, supplies: 0.8 });
  assert.ok(ai.winChance > 0.5);
  pass("ai battle controller");

  const render = battle.planBattleRender({ battleId: "b1" });
  assert.equal(render.obsViaLayer, true);
  pass("battle renderer");

  const engine = battle.createBattleEngine();
  const decisionEngine = decision.createDecisionEngine();
  const decided = decisionEngine.decide({
    sources: {
      event: { type: "battle", userId: "vasa", battleActive: true, platform: "tiktok" }
    },
    adapters: { memory: { working: true, shortTerm: true } }
  });

  const started = engine.start({
    fromDecision: true,
    decision: decided,
    tiktokBattleTrigger: true,
    participants: ["katka", "vasa", "pavel"],
    items: [item.item],
    type: battle.BE_TYPE.COMMUNITY
  });

  assert.equal(started.ok, true);
  assert.equal(started.decides, false);
  assert.equal(started.miaDecidesOutcome, true);
  assert.equal(started.state, battle.BE_STATE.ACTIVE);
  pass("decision to battle start");

  const action = engine.queueAction({
    playerId: "katka",
    action: battle.BE_ACTION.ATTACK,
    attackerClass: battle.BE_KOJ_CLASS.FIGHTER,
    defenderClass: battle.BE_KOJ_CLASS.TANK,
    item: { power: 8 },
    randomSeed: 1
  });
  assert.equal(action.ok, true);
  assert.ok(action.damage.damage >= 1);

  const cooldownBlock = engine.queueAction({
    playerId: "katka",
    action: battle.BE_ACTION.HEAL
  });
  assert.equal(cooldownBlock.ok, false);
  pass("battle action queue with cooldown");

  const obsLayer = obs.createObsIntegrationLayer();
  const obsExec = obsLayer.execute({
    fromActionOrchestrator: true,
    battleActive: true,
    command: { overlayId: obs.OIL_OVERLAY.BATTLE_OVERLAY }
  });
  assert.equal(obsExec.scene.sceneId, obs.OIL_SCENE.BATTLE);

  const finished = engine.finish({ winner: "katka", stats: { damageDealt: action.damage.damage } });
  assert.equal(finished.state, battle.BE_STATE.ARCHIVED);
  assert.ok(finished.history.memoryLinked);
  assert.ok(finished.render.obsViaLayer);
  pass("battle finish history and render plan");

  const invalid = engine.start({ bypassDecisionEngine: true });
  assert.equal(invalid.ok, false);
  pass("reject battle without decision path");

  assert.equal(battle.assertBattleForbiddenActivity("mutate_stream_economy").ok, false);
  assert.equal(battle.assertBattleForbiddenActivity("bypass_decision_engine").ok, false);
  pass("forbidden activities");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  assert.ok(gameSys.runtime.includes("shared/mia-battle-core/battleEngine.js"));
  pass("game system next doc 0041");

  const intSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.INTEGRATION);
  assert.equal(intSys.nextDocId, "0088");
  pass("integration system next doc 0041");

  for (const rel of battle.BE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0039"), "README 0039");
  pass("README registry");

  console.log("\nMaster Canon 0039 contract: ALL PASS");
}

run();
