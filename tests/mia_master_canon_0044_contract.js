"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const community = require("../shared/mia-community-core");
const battle = require("../shared/mia-battle-core");
const economy = require("../shared/mia-economy-core");
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
  const docPath = path.join(MASTER, "0044-community-engine.md");
  const alignPath = path.join(MASTER, "0044-alignment.md");

  assert.ok(fs.existsSync(docPath), "0044-community-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0044-alignment.md exists");
  pass("0044 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 24; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0044 section ${i}`);
  }
  assert.ok(doc.includes("Community Core"), "0044 critical priority");
  assert.ok(doc.includes("0043"), "0044 links to 0043");
  assert.ok(doc.includes("0045"), "0044 points to 0045");
  pass("0044 structure (24 sections)");

  assert.equal(community.CE_COMPONENT_ORDER.length, 12);
  pass("community components");

  assert.equal(community.CE_REPUTATION.MIN, -1000);
  assert.equal(community.CE_REPUTATION.MAX, 1000);
  assert.equal(community.clampReputation(1500), 1000);
  pass("reputation manager");

  const profile = community.createUserProfile({
    userId: "vasa",
    displayName: "Váša",
    platforms: [community.CE_PLATFORM.TIKTOK, community.CE_PLATFORM.KICK]
  });
  assert.equal(profile.sharedAcrossPlatform, true);
  pass("user profile manager");

  const relationship = community.strengthenRelationship(
    community.createRelationship({ fromId: "mia", toId: "vasa", strength: 40 }),
    15
  );
  assert.equal(relationship.label, "oblíbený krmič");
  pass("relationship manager");

  const guild = community.createGuild({ guildId: "guild-1", name: "Koj Squad", members: ["katka"] });
  assert.ok(guild.guildId);
  pass("guild manager");

  const vip = community.assignVipTier({ userId: "katka", tier: community.CE_VIP_TIER.GOLD });
  assert.equal(vip.unlocks.exclusiveBattle, true);
  pass("vip manager");

  const mod = community.registerModerator({ userId: "mod1", permissions: ["mute"] });
  const modAction = community.recordModeratorAction(mod, { type: "timeout", targetUserId: "spam-user" });
  assert.equal(modAction.audited, true);
  pass("moderator manager");

  const vote = community.castCommunityVote({
    userId: "lukas",
    topic: "battle_map",
    choice: "arena_forest"
  });
  assert.equal(vote.archived, true);
  pass("voting manager");

  const engine = community.createCommunityEngine();
  engine.registerMember({ userId: "katka", displayName: "Katka" });

  const memoryAdapter = {
    recordReference(payload) {
      return { ok: true, readOnly: true, ref: payload.userId };
    }
  };

  const interaction = engine.processInteraction(
    {
      userId: "katka",
      type: "communication",
      targetId: "mia",
      relationshipDelta: 60
    },
    { memoryAdapter }
  );
  assert.equal(interaction.ok, true);
  assert.equal(interaction.mutatesBattleLogic, false);
  assert.equal(interaction.mutatesEconomy, false);
  assert.ok(interaction.memoryRef?.readOnly);
  pass("interaction pipeline");

  engine.joinGuild("katka", "guild-1", "Koj Squad");
  const battleContext = engine.getBattleContext("katka", "guild-1");
  assert.equal(battleContext.readOnly, true);
  assert.equal(battleContext.battleManaged, false);
  pass("battle read-only context");

  const battleEngine = battle.createBattleEngine();
  const started = battleEngine.start({ fromDecision: true, participants: ["katka"] });
  assert.equal(started.ok, true);
  pass("battle independent of community management");

  engine.assignVip("katka", community.CE_VIP_TIER.SILVER);
  const bonus = engine.getReputationBonus("katka");
  assert.equal(bonus.economyCalculates, true);
  assert.ok(bonus.vipBonus >= 2);
  pass("economy bonus metadata");

  const economyEngine = economy.createEconomyEngine();
  assert.equal(typeof economyEngine.processEvent, "function");
  pass("economy remains separate");

  const lifecycle = engine.getMemberLifecycle("katka");
  assert.ok(lifecycle.lifecycle.some((s) => s.step === "registration" && s.done));
  pass("member lifecycle");

  const blocked = engine.processInteraction({ userId: "x", generatesAiResponses: true });
  assert.equal(blocked.ok, false);
  pass("reject ai response generation");

  assert.equal(community.assertCommunityForbiddenActivity("mutate_decision_engine").ok, false);
  assert.equal(community.assertCommunityForbiddenActivity("mutate_economy").ok, false);
  pass("forbidden activities");

  const userSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.USER);
  assert.equal(userSys.nextDocId, "0088");
  assert.ok(userSys.runtime.includes("shared/mia-community-core/communityEngine.js"));
  pass("user system next doc 0046");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  pass("game system next doc 0046");

  for (const rel of community.CE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0044"), "README 0044");
  pass("README registry");

  console.log("\nMaster Canon 0044 contract: ALL PASS");
}

run();
