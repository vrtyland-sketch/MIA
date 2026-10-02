"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
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

test("default scoring stays classic and duel is 5 minutes", () => {
  const state = arena.createArenaState();
  assert.equal(state.scoringMode, "classic");
  assert.equal(arena.DEFAULT_DUEL_MS, 300000);
  const started = arena.startArenaDuel(state, { skipPhases: true });
  assert.equal(started.duel.durationMs, 300000);
  assert.equal(started.duel.phase, "active");
});

test("FAIR mode caps paid score and energy across unequal gifts", () => {
  let fair = arena.createArenaState({ scoringMode: "fair" });
  fair = arena.startArenaDuel(fair, { durationMs: 300000, skipPhases: true });
  const gifts = [
    { platform: "tiktok", miaPoints: 50000 },
    { platform: "kick", miaPoints: 20 },
    { platform: "twitch", miaPoints: 10000 },
    { platform: "youtube", miaPoints: 1 }
  ];
  for (const gift of gifts) {
    const result = arena.ingestArenaActivity(fair, {
      platform: gift.platform,
      eventType: "GIFT",
      userLabel: gift.platform,
      miaPoints: gift.miaPoints,
      eventId: `fair-gift-${gift.platform}`
    });
    assert.equal(result.applied, true);
    fair = result.state;
  }

  assert.equal(fair.platforms.tiktok.miaPoints, arena.FAIR_PAID_SCORE_CAP);
  assert.equal(fair.platforms.kick.miaPoints, arena.FAIR_PAID_SCORE_CAP);
  assert.equal(fair.platforms.twitch.miaPoints, arena.FAIR_PAID_SCORE_CAP);
  assert.equal(fair.platforms.youtube.miaPoints, 1);
  assert.equal(fair.duel.energy.tiktok, arena.FAIR_PAID_ENERGY_GAIN);
  assert.ok(fair.duel.energy.tiktok < 100);

  let classic = arena.createArenaState();
  classic = arena.startArenaDuel(classic, { durationMs: 300000, skipPhases: true });
  classic = arena.ingestArenaActivity(classic, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "classic-whale"
  }).state;
  assert.ok(classic.platforms.tiktok.miaPoints >= 50000);
  assert.equal(classic.duel.energy.tiktok, 100);

  const comment = arena.ingestArenaActivity(fair, {
    platform: "youtube",
    eventType: "COMMENT",
    userLabel: "Chatter",
    miaPoints: 0,
    eventId: "fair-comment-yt"
  });
  assert.equal(comment.points, 2);
  assert.equal(comment.state.platforms.youtube.miaPoints, 3);
  assert.equal(comment.state.platforms.tiktok.miaPoints, arena.FAIR_PAID_SCORE_CAP);
});

function primeActiveDuel(mode, bank) {
  let state = arena.createArenaState({ scoringMode: mode });
  state = arena.startArenaDuel(state, { durationMs: 300000, skipPhases: true });
  for (const id of arena.PLATFORMS) {
    state.platforms[id].miaPoints = bank;
    state.duel.energy[id] = 100;
  }
  return state;
}

function pointsOf(state) {
  return Object.fromEntries(
    arena.PLATFORMS.map((id) => [id, state.platforms[id].miaPoints])
  );
}

function stolenFromOthers(before, after, attacker) {
  let total = 0;
  for (const id of arena.PLATFORMS) {
    if (id === attacker) continue;
    total += before[id] - after[id];
  }
  return total;
}

const UNEQUAL_GIFTS = [
  { platform: "youtube", miaPoints: 1 },
  { platform: "kick", miaPoints: 20 },
  { platform: "twitch", miaPoints: 10000 },
  { platform: "tiktok", miaPoints: 50000 }
];

test("FAIR active duel bounds battle damage for unequal gifts", () => {
  let state = primeActiveDuel("fair", 1000);
  assert.equal(state.duel.phase, "active");
  assert.equal(state.duel.durationMs, 300000);
  const powers = [];
  const swings = [];

  for (const gift of UNEQUAL_GIFTS) {
    const scored = arena.ingestArenaActivity(state, {
      platform: gift.platform,
      eventType: "GIFT",
      userLabel: gift.platform,
      miaPoints: gift.miaPoints,
      eventId: `fair-live-${gift.platform}`
    });
    assert.equal(scored.applied, true);
    assert.ok(scored.points <= arena.FAIR_PAID_SCORE_CAP);
    state = scored.state;
    state.duel.lastActionAt = 0;
    const before = pointsOf(state);
    const push = arena.pushPlatformBattleAction(state, {
      platform: gift.platform,
      eventType: "GIFT",
      userLabel: gift.platform,
      miaPoints: gift.miaPoints,
      item: { id: "box", label: "Box", role: "duel", power: 9000 },
      eventId: `fair-live-${gift.platform}`
    });
    assert.equal(push.reason, "ok", gift.platform);
    assert.equal(push.action.effect, "damage");
    assert.equal(push.action.targets.length, 3);
    assert.equal(push.action.power, arena.FAIR_BATTLE_POWER_PER_TARGET);
    const swing = stolenFromOthers(before, pointsOf(push.state), gift.platform);
    assert.equal(swing, push.action.power * push.action.targets.length);
    assert.equal(swing, arena.FAIR_BATTLE_TOTAL_SWING_CAP);
    powers.push(push.action.power);
    swings.push(swing);
    state = push.state;
  }

  assert.deepEqual(powers, [2, 2, 2, 2]);
  assert.deepEqual(swings, [6, 6, 6, 6]);
  assert.equal(arena.FAIR_BATTLE_POWER_PER_TARGET, 2);
  assert.equal(arena.FAIR_BATTLE_TOTAL_SWING_CAP, 6);
});

test("classic active duel still scales battle power from raw mia points", () => {
  let state = primeActiveDuel("classic", 100000);
  const powers = [];
  const swings = [];

  for (const gift of UNEQUAL_GIFTS) {
    state.duel.lastActionAt = 0;
    const before = pointsOf(state);
    const push = arena.pushPlatformBattleAction(state, {
      platform: gift.platform,
      eventType: "GIFT",
      userLabel: gift.platform,
      miaPoints: gift.miaPoints,
      eventId: `classic-live-${gift.platform}`
    });
    assert.equal(push.reason, "ok", gift.platform);
    const expected = Math.max(4, Math.round(gift.miaPoints * 0.12) || 8);
    assert.equal(push.action.power, expected);
    const swing = stolenFromOthers(before, pointsOf(push.state), gift.platform);
    assert.equal(swing, expected * 3);
    powers.push(push.action.power);
    swings.push(swing);
    state = push.state;
  }

  assert.deepEqual(powers, [8, 4, 1200, 6000]);
  assert.equal(swings[3], 18000);
  assert.ok(powers[3] > powers[2]);
  assert.ok(powers[2] > powers[1]);
  assert.ok(swings[3] > swings[0]);
});

test("duplicate event id does not score or battle twice in an active duel", () => {
  let state = primeActiveDuel("fair", 1000);
  const scored = arena.ingestArenaActivity(state, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "dup-whale"
  });
  assert.equal(scored.applied, true);
  state = scored.state;
  const battle = arena.pushPlatformBattleAction(state, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "dup-whale"
  });
  assert.equal(battle.reason, "ok");
  assert.equal(battle.action.power, arena.FAIR_BATTLE_POWER_PER_TARGET);
  const after = pointsOf(battle.state);
  const actions = battle.state.battle.actions.length;

  battle.state.duel.lastActionAt = 0;
  battle.state.duel.energy.tiktok = 100;
  const replayScore = arena.ingestArenaActivity(battle.state, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "dup-whale"
  });
  assert.equal(replayScore.applied, false);
  assert.equal(replayScore.reason, "duplicate_event");
  assert.deepEqual(pointsOf(replayScore.state), after);

  const replayBattle = arena.pushPlatformBattleAction(replayScore.state, {
    platform: "tiktok",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "dup-whale"
  });
  assert.equal(replayBattle.reason, "duplicate_event");
  assert.equal(replayBattle.action, null);
  assert.deepEqual(pointsOf(replayBattle.state), after);
  assert.equal(replayBattle.state.battle.actions.length, actions);
  assert.equal(replayBattle.state.duel.energy.tiktok, 100);
  assert.equal(replayBattle.state.platforms.kick.events, 0);
});

test("duplicate event id does not score twice", () => {
  let state = arena.createArenaState();
  const first = arena.ingestArenaActivity(state, {
    platform: "kick",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "same-event"
  });
  assert.equal(first.applied, true);
  const second = arena.ingestArenaActivity(first.state, {
    platform: "kick",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "same-event"
  });
  assert.equal(second.applied, false);
  assert.equal(second.reason, "duplicate_event");
  assert.equal(second.state.platforms.kick.miaPoints, first.state.platforms.kick.miaPoints);
  assert.equal(second.state.platforms.kick.events, 1);
  assert.equal(second.state.platforms.tiktok.miaPoints, 0);
});

test("FAIR arenaBoost score is zero while classic boost still scales", () => {
  const rewards = require("../scripts/MIA_CHAT_REWARD_ENGINE");
  const random = Math.random;
  Math.random = () => 0;
  try {
    const classic = rewards.evaluateChatReward({
      platform: "kick",
      eventType: "GIFT",
      message: "stack push",
      userLabel: "classic-boost",
      miaPoints: 50000
    });
    assert.equal(classic.hit, true);
    assert.equal(classic.reward.rewardId, "arena_boost");
    assert.equal(classic.arenaBoost, Math.max(5, Math.round(50000 * 0.15) || 8));
    assert.equal(classic.arenaBoost, 7500);
    assert.match(classic.line, /arény/i);

    const classicSmall = rewards.evaluateChatReward({
      platform: "kick",
      eventType: "GIFT",
      message: "stack push",
      userLabel: "classic-boost-small",
      miaPoints: 0
    });
    assert.equal(classicSmall.arenaBoost, 8);

    const fair = rewards.evaluateChatReward({
      platform: "kick",
      eventType: "GIFT",
      message: "stack push",
      userLabel: "fair-boost",
      miaPoints: 50000,
      scoringMode: "fair"
    });
    assert.equal(fair.hit, true);
    assert.equal(fair.reward.rewardId, "arena_boost");
    assert.equal(fair.arenaBoost, 0);
    assert.match(fair.line, /arény/i);
  } finally {
    Math.random = random;
  }
});

test("normal FAIR comments stay on the free-action table", () => {
  const state = arena.createArenaState({ scoringMode: "fair" });
  const comment = arena.ingestArenaActivity(state, {
    platform: "kick",
    eventType: "COMMENT",
    userLabel: "Chatter",
    miaPoints: 0,
    eventId: "fair-free-comment"
  });
  assert.equal(comment.applied, true);
  assert.equal(comment.points, 2);
  assert.equal(comment.state.platforms.kick.miaPoints, 2);
  assert.equal(comment.state.scoringMode, "fair");
});

test("duplicate event id still blocks after more than 200 newer events", () => {
  assert.ok(arena.SEEN_EVENT_HARD_CAP > 200);
  assert.ok(arena.SEEN_EVENT_TTL_MS >= arena.DEFAULT_TOURNAMENT_MS);

  let state = arena.createArenaState({ scoringMode: "fair" });
  const first = arena.ingestArenaActivity(state, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "durable-whale"
  });
  assert.equal(first.applied, true);
  assert.equal(first.state.platforms.kick.miaPoints, arena.FAIR_PAID_SCORE_CAP);
  state = first.state;

  for (let i = 0; i < 201; i += 1) {
    const newer = arena.ingestArenaActivity(state, {
      platform: "tiktok",
      eventType: "COMMENT",
      userLabel: "Crowd",
      eventId: `newer-score-${i}`
    });
    assert.equal(newer.applied, true);
    state = newer.state;
  }

  const replay = arena.ingestArenaActivity(state, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "durable-whale"
  });
  assert.equal(replay.applied, false);
  assert.equal(replay.reason, "duplicate_event");
  assert.equal(replay.state.platforms.kick.miaPoints, arena.FAIR_PAID_SCORE_CAP);

  const restored = arena.createArenaState(JSON.parse(JSON.stringify(replay.state)));
  const afterRestore = arena.ingestArenaActivity(restored, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "durable-whale"
  });
  assert.equal(afterRestore.applied, false);
  assert.equal(afterRestore.reason, "duplicate_event");
});

test("legacy string event ids stay duplicate-protected", () => {
  const state = arena.createArenaState({
    seenEventIds: ["legacy-id"]
  });
  const replay = arena.ingestArenaActivity(state, {
    platform: "youtube",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "legacy-id"
  });
  assert.equal(replay.applied, false);
  assert.equal(replay.reason, "duplicate_event");
  assert.equal(replay.state.platforms.youtube.miaPoints, 0);
});

test("event id older than the dedup window can score again", () => {
  let state = arena.createArenaState();
  state = arena.ingestArenaActivity(state, {
    platform: "twitch",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "expired-id"
  }).state;
  state.seenEventIds = state.seenEventIds.map((row) =>
    row.id === "expired-id"
      ? { id: row.id, at: Date.now() - arena.SEEN_EVENT_TTL_MS - 1000 }
      : row
  );
  const again = arena.ingestArenaActivity(state, {
    platform: "twitch",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "expired-id"
  });
  assert.equal(again.applied, true);
  assert.equal(again.points, 2);
  assert.equal(again.state.platforms.twitch.events, 2);
});

test("battle event id still blocks after more than 200 newer battles", () => {
  let state = primeActiveDuel("classic", 5000);
  const first = arena.pushPlatformBattleAction(state, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 80,
    eventId: "durable-battle"
  });
  assert.equal(first.reason, "ok");
  state = first.state;

  for (let i = 0; i < 201; i += 1) {
    state.duel.lastActionAt = 0;
    state.duel.energy.kick = 100;
    const newer = arena.pushPlatformBattleAction(state, {
      platform: "kick",
      eventType: "GIFT",
      userLabel: "Donor",
      miaPoints: 20,
      eventId: `newer-battle-${i}`
    });
    assert.equal(newer.reason, "ok", `newer-battle-${i}`);
    state = newer.state;
  }

  const before = pointsOf(state);
  state.duel.lastActionAt = 0;
  state.duel.energy.kick = 100;
  const replay = arena.pushPlatformBattleAction(state, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: "durable-battle"
  });
  assert.equal(replay.reason, "duplicate_event");
  assert.equal(replay.action, null);
  assert.deepEqual(pointsOf(replay.state), before);
  assert.equal(replay.state.duel.energy.kick, 100);
});

test("duplicate replay just before the 6h window still blocks", () => {
  let state = arena.ingestArenaActivity(arena.createArenaState(), {
    platform: "youtube",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "almost-expired"
  }).state;
  // One second inside the TTL. Equality with the TTL is still valid (`>`),
  // and a 1s margin stays inside even if the clock moves during the replay.
  const at = Date.now() - arena.SEEN_EVENT_TTL_MS + 1000;
  state.seenEventIds = state.seenEventIds.map((row) =>
    row.id === "almost-expired" ? { id: row.id, at } : row
  );
  const replay = arena.ingestArenaActivity(state, {
    platform: "youtube",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "almost-expired"
  });
  assert.equal(replay.applied, false);
  assert.equal(replay.reason, "duplicate_event");
  assert.equal(replay.state.platforms.youtube.miaPoints, 2);
  const kept = replay.state.seenEventIds.find((row) => row.id === "almost-expired");
  assert.ok(kept);
  assert.ok(Date.now() - kept.at <= arena.SEEN_EVENT_TTL_MS);
});

test("replay just after the 6h window can score again", () => {
  let state = arena.ingestArenaActivity(arena.createArenaState(), {
    platform: "twitch",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "just-expired"
  }).state;
  state.seenEventIds = state.seenEventIds.map((row) =>
    row.id === "just-expired"
      ? { id: row.id, at: Date.now() - arena.SEEN_EVENT_TTL_MS - 1 }
      : row
  );
  const again = arena.ingestArenaActivity(state, {
    platform: "twitch",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: "just-expired"
  });
  assert.equal(again.applied, true);
  assert.equal(again.points, 2);
  assert.equal(again.state.platforms.twitch.events, 2);
  assert.equal(again.state.platforms.twitch.miaPoints, 4);
});

test("persisted dedup state survives process restart", () => {
  const file = path.join(os.tmpdir(), `mia-arena-dedup-restart-${process.pid}.json`);
  try {
    let state = arena.ingestArenaActivity(arena.createArenaState(), {
      platform: "kick",
      eventType: "COMMENT",
      userLabel: "A",
      eventId: "persist-score"
    }).state;
    state = arena.startArenaDuel(state, { durationMs: 300000, skipPhases: true });
    for (const id of arena.PLATFORMS) {
      state.platforms[id].miaPoints = 5000;
      state.duel.energy[id] = 100;
    }
    state.duel.lastActionAt = 0;
    const battle = arena.pushPlatformBattleAction(state, {
      platform: "kick",
      eventType: "GIFT",
      userLabel: "Donor",
      miaPoints: 20,
      eventId: "persist-battle"
    });
    assert.equal(battle.reason, "ok");
    arena.saveArenaState(battle.state, file);

    const script = `
      const arena = require(${JSON.stringify(require.resolve("../scripts/MIA_PLATFORM_ARENA"))});
      const loaded = arena.loadArenaState(process.argv[1]);
      const score = arena.ingestArenaActivity(loaded, {
        platform: "kick",
        eventType: "COMMENT",
        userLabel: "A",
        eventId: "persist-score"
      });
      const battleState = score.state;
      battleState.duel.lastActionAt = 0;
      battleState.duel.energy.kick = 100;
      const battle = arena.pushPlatformBattleAction(battleState, {
        platform: "kick",
        eventType: "GIFT",
        userLabel: "Donor",
        miaPoints: 20,
        eventId: "persist-battle"
      });
      process.stdout.write(JSON.stringify({
        scoreApplied: score.applied,
        scoreReason: score.reason,
        scorePoints: score.state.platforms.kick.miaPoints,
        battleReason: battle.reason,
        battleAction: battle.action,
        battleEnergy: battle.state.duel.energy.kick
      }));
    `;
    const child = spawnSync(process.execPath, ["-e", script, file], {
      encoding: "utf8"
    });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const fresh = JSON.parse(child.stdout);
    assert.equal(fresh.scoreApplied, false);
    assert.equal(fresh.scoreReason, "duplicate_event");
    assert.equal(fresh.scorePoints, battle.state.platforms.kick.miaPoints);
    assert.equal(fresh.battleReason, "duplicate_event");
    assert.equal(fresh.battleAction, null);
    assert.equal(fresh.battleEnergy, 100);
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test("legacy string ids loaded from disk stay duplicate-protected", () => {
  const file = path.join(os.tmpdir(), `mia-arena-dedup-legacy-${process.pid}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify({
      seenEventIds: ["legacy-file-id"],
      seenBattleEventIds: ["legacy-file-battle"]
    }));
    const loaded = arena.loadArenaState(file);
    assert.ok(loaded.seenEventIds.some((row) => row.id === "legacy-file-id" && row.at > 0));
    assert.ok(loaded.seenBattleEventIds.some((row) => row.id === "legacy-file-battle" && row.at > 0));

    const replay = arena.ingestArenaActivity(loaded, {
      platform: "youtube",
      eventType: "COMMENT",
      userLabel: "A",
      eventId: "legacy-file-id"
    });
    assert.equal(replay.applied, false);
    assert.equal(replay.reason, "duplicate_event");
    assert.equal(replay.state.platforms.youtube.miaPoints, 0);

    let battleState = arena.startArenaDuel(loaded, { durationMs: 300000, skipPhases: true });
    for (const id of arena.PLATFORMS) {
      battleState.platforms[id].miaPoints = 1000;
      battleState.duel.energy[id] = 100;
    }
    battleState.duel.lastActionAt = 0;
    const battle = arena.pushPlatformBattleAction(battleState, {
      platform: "kick",
      eventType: "GIFT",
      userLabel: "Donor",
      miaPoints: 20,
      eventId: "legacy-file-battle"
    });
    assert.equal(battle.reason, "duplicate_event");
    assert.equal(battle.action, null);
    assert.equal(battle.state.duel.energy.kick, 100);
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test("more than 4000 unique score events inside 6h do not forget a still-valid id", () => {
  const originalId = "cap-score-original";
  let state = arena.createArenaState();
  const first = arena.ingestArenaActivity(state, {
    platform: "kick",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: originalId
  });
  assert.equal(first.applied, true);
  state = first.state;
  const originalAt = state.seenEventIds.find((row) => row.id === originalId).at;
  const flood = arena.SEEN_EVENT_HARD_CAP;
  for (let i = 0; i < flood; i += 1) {
    const newer = arena.ingestArenaActivity(state, {
      platform: "tiktok",
      eventType: "COMMENT",
      userLabel: "Crowd",
      eventId: `cap-score-${i}`
    });
    assert.equal(newer.applied, true, `cap-score-${i}`);
    state = newer.state;
  }
  const ageMs = Date.now() - originalAt;
  assert.ok(ageMs < arena.SEEN_EVENT_TTL_MS, `fixture left the 6h window: ageMs=${ageMs}`);
  const ids = [originalId];
  for (let i = 0; i < flood; i += 1) ids.push(`cap-score-${i}`);
  const storedIds = new Set(state.seenEventIds.map((row) => row.id));
  const missing = ids.filter((id) => !storedIds.has(id));
  const dropped = missing[0] || originalId;
  const beforePoints = state.platforms.kick.miaPoints;
  const replay = arena.ingestArenaActivity(state, {
    platform: "kick",
    eventType: "COMMENT",
    userLabel: "A",
    eventId: dropped
  });
  assert.equal(
    replay.reason,
    "duplicate_event",
    `cap accepted ${dropped} again after ${ids.length} unique in-window ids; missing=${missing.length}; ageMs=${ageMs}; ttlMs=${arena.SEEN_EVENT_TTL_MS}; stored=${state.seenEventIds.length}; applied=${replay.applied}; kickPoints=${replay.state.platforms.kick.miaPoints}; beforePoints=${beforePoints}`
  );
  assert.equal(replay.applied, false);
  assert.equal(replay.state.platforms.kick.miaPoints, beforePoints);
});

test("more than 4000 unique battle ids inside 6h do not forget a still-valid id", () => {
  const originalId = "cap-battle-original";
  let state = primeActiveDuel("classic", 100000);
  state.duel.endsAt = Date.now() + 60 * 60 * 1000;
  state.duel.lastActionAt = 0;
  const first = arena.pushPlatformBattleAction(state, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 20,
    eventId: originalId
  });
  assert.equal(first.reason, "ok");
  state = first.state;
  const originalAt = state.seenBattleEventIds.find((row) => row.id === originalId).at;
  const flood = arena.SEEN_EVENT_HARD_CAP;
  for (let i = 0; i < flood; i += 1) {
    state.duel.lastActionAt = 0;
    state.duel.energy.kick = 100;
    const newer = arena.pushPlatformBattleAction(state, {
      platform: "kick",
      eventType: "GIFT",
      userLabel: "Donor",
      miaPoints: 20,
      eventId: `cap-battle-${i}`
    });
    assert.equal(newer.reason, "ok", `cap-battle-${i}`);
    state = newer.state;
  }
  const ageMs = Date.now() - originalAt;
  assert.ok(ageMs < arena.SEEN_EVENT_TTL_MS, `fixture left the 6h window: ageMs=${ageMs}`);
  const ids = [originalId];
  for (let i = 0; i < flood; i += 1) ids.push(`cap-battle-${i}`);
  const storedIds = new Set(state.seenBattleEventIds.map((row) => row.id));
  const missing = ids.filter((id) => !storedIds.has(id));
  const dropped = missing[0] || originalId;
  const before = pointsOf(state);
  state.duel.lastActionAt = 0;
  state.duel.energy.kick = 100;
  const replay = arena.pushPlatformBattleAction(state, {
    platform: "kick",
    eventType: "GIFT",
    userLabel: "Donor",
    miaPoints: 50000,
    eventId: dropped
  });
  assert.equal(
    replay.reason,
    "duplicate_event",
    `cap accepted battle ${dropped} again after ${ids.length} unique in-window ids; missing=${missing.length}; ageMs=${ageMs}; ttlMs=${arena.SEEN_EVENT_TTL_MS}; stored=${state.seenBattleEventIds.length}; energy=${replay.state.duel.energy.kick}; points=${JSON.stringify(pointsOf(replay.state))}; before=${JSON.stringify(before)}`
  );
  assert.equal(replay.action, null);
  assert.deepEqual(pointsOf(replay.state), before);
  assert.equal(replay.state.duel.energy.kick, 100);
});

if (!process.exitCode) {
  console.log("platform_arena_contract: all passed");
}
