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

if (!process.exitCode) {
  console.log("platform_arena_contract: all passed");
}
