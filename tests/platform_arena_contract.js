"use strict";

const assert = require("assert");
const arena = require("../scripts/MIA_PLATFORM_ARENA");

function test(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("creates four platform kojs", () => {
  const state = arena.createArenaState();
  assert.equal(Object.keys(state.platforms).length, 4);
  assert.equal(state.platforms.tiktok.label, "Tokžrout");
  assert.equal(state.platforms.kick.label, "Stackžrout");
  assert.equal(state.platforms.twitch.label, "Bitsžrout");
  assert.equal(state.platforms.youtube.label, "Kisstube");
});

test("roster is coin_eater not cute pea", () => {
  const roster = require("../scripts/MIA_KOJ_ROSTER");
  const list = roster.listRoster();
  assert.equal(list.length, 4);
  const animals = new Set(list.map((r) => r.animal));
  assert.equal(animals.size, 4);
  for (const row of list) {
    assert.equal(row.species, "coin_eater");
    assert.ok(row.animal);
    assert.ok(row.formDir);
    assert.ok(row.functions.combat);
    assert.ok(row.functions.love);
    assert.ok(row.functions.items);
  }
  assert.equal(roster.resolveFormSprite("tiktok", "attack"), "/assets/kojnozrout/forms/tiktok/attack.png");
  const gift = roster.resolveRewardChance({
    rewardId: "item_drop",
    eventType: "GIFT",
    miaPoints: 200
  });
  const free = roster.resolveRewardChance({
    rewardId: "item_drop",
    eventType: "COMMENT",
    miaPoints: 0
  });
  assert.ok(gift.chance > free.chance);
  assert.match(gift.publicHint, /Dárek zvyšuje šanci/i);
});

test("youtube koj is Kisstube with Kiss Radio style", () => {
  const id = arena.getPlatformIdentity("youtube");
  assert.equal(id.label, "Kisstube");
  assert.equal(id.mascot, "Kisstube");
  assert.equal(id.styleRef, "kiss_radio");
  assert.equal(arena.normalizePlatform("kisstube"), "youtube");
  assert.equal(arena.normalizePlatform("kiss radio"), "youtube");
  assert.equal(arena.normalizePlatform("júkiss"), "youtube");
  const state = arena.createArenaState({
    platforms: { youtube: { label: "Koj YouTube", miaPoints: 10 } }
  });
  assert.equal(state.platforms.youtube.label, "Kisstube");
  assert.equal(state.platforms.youtube.styleRef, "kiss_radio");
  assert.equal(state.platforms.youtube.miaPoints, 10);
});

test("kiss memorial is youtube-only; MIA=Barbora, Koj=Patrik", () => {
  const memorial = require("../scripts/MIA_KISS_MEMORIAL");
  // Jen YouTube lane / explicit Kisstube
  assert.equal(memorial.shouldAttachMemorial("ahoj", "youtube"), true);
  assert.equal(memorial.shouldAttachMemorial("ahoj kisstube"), true);
  assert.equal(memorial.shouldAttachMemorial("ahoj kiss radio"), true);
  // TikTok / běžný chat — NE
  assert.equal(memorial.shouldAttachMemorial("barbora tlučhořová", "tiktok"), false);
  assert.equal(memorial.shouldAttachMemorial("patrik hezucký", "kick"), false);
  assert.equal(memorial.shouldAttachMemorial("ahoj stream", "twitch"), false);
  const snap = memorial.getMemorialSnapshot();
  assert.equal(snap.scope, "youtube_only");
  assert.equal(snap.roles.mia.name, "Barbora Tlučhořová");
  assert.equal(snap.roles.kojnozrout.name, "Patrik Hezucký");
  const hint = memorial.buildMemorialPromptHint("ahoj", "youtube", "mia");
  assert.match(hint, /YouTube|Kisstube|Barbora|Patrik/i);
  assert.equal(memorial.buildMemorialPromptHint("ahoj", "tiktok", "mia"), "");
});

test("activity awards mia points to platform", () => {
  let state = arena.createArenaState();
  const r = arena.ingestArenaActivity(state, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 75
  });
  assert.equal(r.applied, true);
  assert.equal(r.platform, "tiktok");
  assert.ok(r.state.platforms.tiktok.miaPoints >= 75);
});

test("5min platform duel ranks winner", () => {
  let state = arena.createArenaState();
  state = arena.startArenaDuel(state, { durationMs: 300000, skipPhases: true });
  state = arena.ingestArenaActivity(state, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "A",
    miaPoints: 100
  }).state;
  state = arena.ingestArenaActivity(state, {
    platform: "tiktok",
    eventType: "COMMENT",
    userLabel: "B",
    miaPoints: 2
  }).state;
  state.duel.endsAt = Date.now() - 1;
  state = arena.finishArenaDuel(state);
  assert.equal(state.duel.winner, "kick");
  assert.ok(state.platforms.kick.wins >= 1);
});

test("tournament sets champion", () => {
  let state = arena.createArenaState();
  state = arena.startTournament(state, { durationMs: 60000, withDuel: false });
  state = arena.ingestArenaActivity(state, {
    platform: "twitch",
    eventType: "GIFT",
    userLabel: "Tw",
    miaPoints: 200
  }).state;
  state.tournament.endsAt = Date.now() - 1;
  state = arena.finishTournament(state);
  assert.equal(state.tournament.champion, "twitch");
  assert.ok(state.platforms.twitch.reigns >= 1);
});

test("snapshot exposes economy note and ranking", () => {
  const snap = arena.getArenaSnapshot(arena.createArenaState());
  assert.ok(snap.economyNote);
  assert.equal(snap.platforms.length, 4);
});

test("kick box item attacks other platform kojs", () => {
  let state = arena.createArenaState();
  state = arena.startArenaDuel(state, { durationMs: 300000, skipPhases: true });
  state = arena.ingestArenaActivity(state, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "A",
    miaPoints: 100
  }).state;
  state = arena.ingestArenaActivity(state, {
    platform: "twitch",
    eventType: "GIFT",
    userLabel: "B",
    miaPoints: 100
  }).state;
  // Seed kick energy for interval-gated action.
  state.duel.energy = state.duel.energy || {};
  state.duel.energy.kick = 50;
  const beforeTt = state.platforms.tiktok.miaPoints;
  const push = arena.pushPlatformBattleAction(state, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "KickDonor",
    miaPoints: 80,
    item: { id: "box", label: "Box", role: "duel", power: 15 }
  });
  assert.ok(push.action);
  assert.equal(push.action.attacker, "kick");
  assert.equal(push.action.itemId, "box");
  assert.equal(push.action.anim, "item_box");
  assert.ok(push.action.targets.includes("tiktok"));
  assert.ok(push.state.platforms.tiktok.miaPoints < beforeTt);
  const battle = arena.getArenaSnapshot(push.state).battle;
  assert.equal(battle.poses.kick, "item_box");
  assert.equal(battle.poses.tiktok, "hit");
});

if (!process.exitCode) {
  console.log("platform_arena_contract: all passed");
}
