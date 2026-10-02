"use strict";

/**
 * Synthetic four-platform ingest.
 * platform bridge payload → POST /ingest → normalize_event → event pipeline
 * → phase_enrich → applyWorldLayer → MIA_PLATFORM_ARENA
 *
 * No OBS connection and no real platform credentials.
 */

process.env.MIA_EVENT_LOG = "0";
process.env.MIA_VIEWER_MEMORY = "0";
process.env.MIA_VIEWER_INVENTORY = "0";
process.env.MIA_DIRECTOR = "0";
process.env.MIA_COMBO_MOMENTS = "0";
process.env.MIA_ARENA_SCORING = "classic";
process.env.MIA_PLATFORM_LIVE_SIGNALS = require("path").join(
  require("os").tmpdir(),
  `mia-live-signals-e2e-${process.pid}.json`
);

const assert = require("assert/strict");
const os = require("os");
const path = require("path");
const fs = require("fs");

const arena = require("../scripts/MIA_PLATFORM_ARENA");
const { createIngestHttpHandlers, normalizeIncomingEvent } = require("../scripts/MIA_INGEST_HTTP");
const { createIngestDeduper, hasIngestPayloadSignal } = require("../scripts/MIA_INGEST_GUARD");
const { createEventContext } = require("../scripts/MIA_EVENT_CONTEXT");
const { runEventPipeline, phaseSession, phaseEnrich } = require("../scripts/pipeline/run");
const { createWorldLayerRuntime } = require("../scripts/MIA_WORLD_LAYER_RUNTIME");
const normalizer = require("../shared/platform_normalizers/normalize_event");
const supportResolver = require("../scripts/MIA_SUPPORT_RESOLVER");
const runtimeState = require("../core/runtime-state");

const PLATFORMS = ["tiktok", "kick", "twitch", "youtube"];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback || "";
}

function upper(value) {
  return String(value || "").toUpperCase();
}

function bridgePayload(platform, kind, extra = {}) {
  const eventId = extra.eventId || `${platform}-${kind}-1`;
  const username = extra.username || `tester_${platform}`;
  const message = extra.message || `ahoj z ${platform}`;
  const base = {
    source:
      platform === "tiktok"
        ? "tikfinity"
        : platform === "kick"
          ? "kick_realtime"
          : platform === "twitch"
            ? "twitch_eventsub"
            : "youtube_live_chat",
    provider: platform,
    platform,
    eventType: kind,
    type: kind,
    eventId,
    username,
    nickname: username,
    userId: `uid-${platform}`,
    testMode: true
  };

  if (kind === "comment") {
    base.message = message;
    base.content = message;
    base.comment = message;
    base.text = message;
  } else {
    base.giftName = extra.giftName || "Rose";
    base.coins = extra.coins;
    base.repeatCount = 1;
    base.giftId = `${platform}-gift`;
    if (extra.message) {
      base.message = extra.message;
      base.comment = extra.message;
    }
  }

  if (platform === "tiktok") base.uniqueId = username;
  if (platform === "kick") base.chatroomId = "synthetic-chatroom";
  if (platform === "twitch") base.twitchEventType = "channel.chat.message";
  if (platform === "youtube") base.liveChatId = "synthetic-live-chat";
  return base;
}

function invokeIngest(handler, body) {
  const req = {
    method: "POST",
    body,
    query: {},
    headers: {},
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" }
  };
  let statusCode = 200;
  let jsonBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      jsonBody = payload;
      return this;
    }
  };
  return Promise.resolve(handler(req, res, "ingest_post")).then(() => ({
    status: statusCode,
    body: jsonBody
  }));
}

function pointsOf(state) {
  return Object.fromEntries(PLATFORMS.map((id) => [id, state.platforms[id].miaPoints]));
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

function buildPipeline(initialState, options = {}) {
  let arenaState = initialState;
  const arenaFile = path.join(os.tmpdir(), `mia-arena-e2e-${process.pid}.json`);
  const seenNormalized = [];

  const world = createWorldLayerRuntime({
    upper,
    getUserLabel: (event) =>
      safeString(event?.user?.nickname || event?.user?.username, "divák"),
    extractSupportPayload: (event) => event?.support || {},
    safeString,
    kojnozoutModule: {},
    kojnozoutBackpackModule: {
      resolveItemFromEvent: () => null
    },
    getKojnozoutBackpackState: () => ({}),
    setKojnozoutBackpackState: () => {},
    getDuelState: () => ({ active: false }),
    setDuelState: () => {},
    kojnozoutDuelModule: {},
    platformArenaModule: {
      ...arena,
      saveArenaState(state) {
        return arena.saveArenaState(state, arenaFile);
      }
    },
    getArenaState: () => arenaState,
    setArenaState: (next) => {
      arenaState = next;
    },
    chatRewardModule: options.chatRewardModule || {},
    kojRosterModule: options.kojRosterModule || {},
    setOverlay: options.setOverlay || (() => ({})),
    invalidateOverlayStateCache: () => {},
    writeLog: () => {},
    scheduleWorldSave: () => {}
  });

  const deps = {
    normalizeIncomingEvent: (raw) =>
      normalizeIncomingEvent(
        {
          normalizer,
          runtimeConfig: {},
          languageModule: {},
          safeString,
          upper
        },
        raw
      ),
    upper,
    safeString,
    streamSessionModule: {},
    ingestDeduper: createIngestDeduper({ windowMs: 4500 }),
    writeLog: () => {},
    recordIngestSummary: () => {},
    supportResolver,
    enrichGiftEconomyContext: () => {},
    nowIso: () => new Date().toISOString(),
    giftUserLedgerModule: {},
    pushRecentParticipant: () => {},
    applyRuntimeStateImpact: () => null,
    applyWorldLayer: (normalized) => {
      seenNormalized.push({
        platform: normalized.platform,
        eventType: normalized.eventType,
        eventId: normalized.eventId,
        miaPoints: normalized.support?.miaPoints || 0
      });
      return world.applyWorldLayer(normalized);
    },
    streamAudienceModule: {},
    runtimeConfig: {
      phase2: { viewerMemory: { enabled: false }, comboMoments: { enabled: false } },
      director: { enabled: false }
    },
    getStreamSession: () => ({}),
    setStreamSession: () => {},
    getGiftSupporterProfile: () => ({}),
    setGiftSupporterProfile: () => {},
    getGiftUserLedger: () => ({}),
    setGiftUserLedger: () => {},
    getLastGiftMapping: () => null,
    setLastGiftMapping: () => {},
    getStreamState: () => ({}),
    setStreamState: () => {},
    getOutputState: () => ({}),
    getOverlayState: () => ({}),
    getKojnozoutState: () => ({}),
    getEcosystemState: () => ({})
  };

  const http = createIngestHttpHandlers({
    normalizer,
    runtimeConfig: { ingest: { fastAck: false } },
    languageModule: {},
    safeString,
    upper,
    writeLog: () => {},
    ingestGuardModule: { hasIngestPayloadSignal },
    processEvent: async (raw) => {
      const ctx = createEventContext(raw, deps);
      return runEventPipeline(ctx, deps, [phaseSession, phaseEnrich]);
    }
  });

  return {
    handleIngest: http.handleIngest,
    seenNormalized,
    arenaFile,
    getArenaState: () => arenaState,
    setArenaState: (next) => {
      arenaState = next;
    },
    applyWorldLayer: (normalized) => world.applyWorldLayer(normalized)
  };
}

async function run() {
  const tmpRuntime = path.join(os.tmpdir(), `mia-runtime-e2e-${process.pid}.json`);
  runtimeState.saveRuntimeState({ koj: {}, streamState: {} }, { filePath: tmpRuntime });

  const pipeline = buildPipeline(arena.createArenaState());

  await test("four platform comments share one ingest pipeline and one arena row each", async () => {
    const before = { tiktok: 0, kick: 0, twitch: 0, youtube: 0 };

    for (const platform of PLATFORMS) {
      const payload = bridgePayload(platform, "comment", {
        eventId: `${platform}-comment-e2e`,
        message: `ahoj z ${platform}`
      });
      const response = await invokeIngest(pipeline.handleIngest, payload);
      assert.equal(response.status, 200, platform);
      assert.equal(response.body.ok, true, platform);
      assert.equal(response.body.normalizedEvent.platform, platform);
      assert.equal(response.body.normalizedEvent.eventType, "COMMENT");
      assert.equal(response.body.deduped, undefined);

      const scores = pointsOf(pipeline.getArenaState());
      assert.equal(scores[platform], before[platform] + 2, platform);
      for (const other of PLATFORMS) {
        if (other === platform) continue;
        assert.equal(scores[other], before[other], `${platform} contaminated ${other}`);
      }
      before[platform] = scores[platform];
      assert.equal(pipeline.getArenaState().platforms[platform].events, 1);
    }

    assert.deepEqual(pointsOf(pipeline.getArenaState()), {
      tiktok: 2,
      kick: 2,
      twitch: 2,
      youtube: 2
    });
    assert.equal(pipeline.seenNormalized.length, 4);
    assert.deepEqual(
      pipeline.seenNormalized.map((row) => row.platform),
      PLATFORMS
    );
  });

  await test("replaying the same comment does not score again", async () => {
    const before = pointsOf(pipeline.getArenaState());
    const response = await invokeIngest(
      pipeline.handleIngest,
      bridgePayload("tiktok", "comment", {
        eventId: "tiktok-comment-e2e",
        message: "ahoj z tiktok"
      })
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.deduped, true);
    assert.deepEqual(pointsOf(pipeline.getArenaState()), before);
    assert.equal(pipeline.getArenaState().platforms.tiktok.events, 1);
    assert.equal(pipeline.seenNormalized.length, 4);
  });

  await test("FAIR gifts keep unequal monetization off the other platform rows", async () => {
    pipeline.setArenaState(arena.createArenaState({ scoringMode: "fair" }));
    const coins = { tiktok: 50000, kick: 20, twitch: 10000, youtube: 1 };
    const rawPoints = {};

    for (const platform of PLATFORMS) {
      const before = pointsOf(pipeline.getArenaState());
      const response = await invokeIngest(
        pipeline.handleIngest,
        bridgePayload(platform, "gift", {
          eventId: `${platform}-gift-e2e`,
          coins: coins[platform],
          giftName: platform === "twitch" ? "Bits" : platform === "youtube" ? "SuperChat" : "Rose"
        })
      );
      assert.equal(response.status, 200, platform);
      assert.equal(response.body.ok, true, platform);
      assert.equal(response.body.normalizedEvent.platform, platform);
      assert.equal(response.body.normalizedEvent.eventType, "GIFT");
      rawPoints[platform] = response.body.normalizedEvent.support.miaPoints;

      const scores = pointsOf(pipeline.getArenaState());
      const gained = scores[platform] - before[platform];
      assert.ok(gained >= 1 && gained <= arena.FAIR_PAID_SCORE_CAP, `${platform} gained ${gained}`);
      for (const other of PLATFORMS) {
        if (other === platform) continue;
        assert.equal(scores[other], before[other], `${platform} gift contaminated ${other}`);
      }
      assert.equal(pipeline.getArenaState().platforms[platform].gifts, 1);
    }

    assert.ok(rawPoints.tiktok > arena.FAIR_PAID_SCORE_CAP);
    assert.ok(rawPoints.tiktok > rawPoints.youtube);
    assert.equal(pipeline.getArenaState().platforms.tiktok.miaPoints, arena.FAIR_PAID_SCORE_CAP);
    assert.ok(pipeline.getArenaState().platforms.youtube.miaPoints <= arena.FAIR_PAID_SCORE_CAP);
    assert.equal(pipeline.getArenaState().scoringMode, "fair");

    const replay = await invokeIngest(
      pipeline.handleIngest,
      bridgePayload("kick", "gift", {
        eventId: "kick-gift-e2e",
        coins: 20,
        giftName: "Rose"
      })
    );
    assert.equal(replay.body.deduped, true);
    assert.equal(pipeline.getArenaState().platforms.kick.gifts, 1);
  });

  function primeDuel(target, mode, bank) {
    let state = arena.createArenaState({ scoringMode: mode });
    state = arena.startArenaDuel(state, { durationMs: 300000, skipPhases: true });
    for (const id of PLATFORMS) {
      state.platforms[id].miaPoints = bank;
      state.duel.energy[id] = 100;
    }
    target.setArenaState(state);
  }

  function swingAgainst(before, after, attacker) {
    let total = 0;
    for (const id of PLATFORMS) {
      if (id === attacker) continue;
      total += before[id] - after[id];
    }
    return total;
  }

  const duelGifts = [
    { platform: "youtube", coins: 1 },
    { platform: "kick", coins: 20 },
    { platform: "twitch", coins: 10000 },
    { platform: "tiktok", coins: 50000 }
  ];

  async function runDuelGifts(target, label) {
    const powers = [];
    const swings = [];
    const rawPoints = [];
    for (const gift of duelGifts) {
      const ready = target.getArenaState();
      ready.duel.lastActionAt = 0;
      target.setArenaState(ready);
      const before = pointsOf(target.getArenaState());
      const response = await invokeIngest(
        target.handleIngest,
        bridgePayload(gift.platform, "gift", {
          eventId: `${label}-${gift.platform}-duel`,
          coins: gift.coins,
          giftName: gift.platform === "twitch" ? "Bits" : "Rose"
        })
      );
      assert.equal(response.status, 200, gift.platform);
      assert.equal(response.body && response.body.ok, true, gift.platform);
      assert.equal(response.body.deduped, undefined, gift.platform);
      assert.equal(response.body.normalizedEvent.eventType, "GIFT");
      const raw = response.body.normalizedEvent.support.miaPoints;
      const afterState = target.getArenaState();
      const action = afterState.battle.actions[0];
      assert.ok(action, gift.platform);
      assert.equal(action.attacker, gift.platform);
      assert.equal(action.effect, "damage");
      assert.equal(action.targets.length, 3);
      const swing = swingAgainst(before, pointsOf(afterState), gift.platform);
      powers.push(action.power);
      swings.push(swing);
      rawPoints.push(raw);
    }
    return { powers, swings, rawPoints };
  }

  await test("FAIR active duel keeps battle damage bounded across unequal gifts", async () => {
    const duel = buildPipeline(arena.createArenaState({ scoringMode: "fair" }));
    primeDuel(duel, "fair", 1000);
    assert.equal(duel.getArenaState().duel.phase, "active");
    assert.equal(duel.getArenaState().duel.durationMs, 300000);
    const { powers, swings, rawPoints } = await runDuelGifts(duel, "fair");
    assert.ok(rawPoints[3] > rawPoints[2]);
    assert.ok(rawPoints[2] > rawPoints[1]);
    assert.ok(rawPoints[1] > rawPoints[0]);
    assert.deepEqual(powers, [
      arena.FAIR_BATTLE_POWER_PER_TARGET,
      arena.FAIR_BATTLE_POWER_PER_TARGET,
      arena.FAIR_BATTLE_POWER_PER_TARGET,
      arena.FAIR_BATTLE_POWER_PER_TARGET
    ]);
    assert.deepEqual(swings, [
      arena.FAIR_BATTLE_TOTAL_SWING_CAP,
      arena.FAIR_BATTLE_TOTAL_SWING_CAP,
      arena.FAIR_BATTLE_TOTAL_SWING_CAP,
      arena.FAIR_BATTLE_TOTAL_SWING_CAP
    ]);

    const before = pointsOf(duel.getArenaState());
    const actions = duel.getArenaState().battle.actions.length;
    const replay = await invokeIngest(
      duel.handleIngest,
      bridgePayload("tiktok", "gift", {
        eventId: "fair-tiktok-duel",
        coins: 50000,
        giftName: "Rose"
      })
    );
    assert.equal(replay.body.deduped, true);
    assert.deepEqual(pointsOf(duel.getArenaState()), before);
    assert.equal(duel.getArenaState().battle.actions.length, actions);
    assert.equal(duel.getArenaState().platforms.tiktok.gifts, 1);
    if (fs.existsSync(duel.arenaFile)) fs.unlinkSync(duel.arenaFile);
  });

  await test("classic active duel still scales battle damage with gift value", async () => {
    const duel = buildPipeline(arena.createArenaState());
    primeDuel(duel, "classic", 1000000);
    const { powers, swings, rawPoints } = await runDuelGifts(duel, "classic");
    assert.deepEqual(
      powers,
      rawPoints.map((points) => Math.max(4, Math.round(points * 0.12) || 8))
    );
    assert.deepEqual(
      swings,
      powers.map((power) => power * 3)
    );
    assert.ok(rawPoints[3] > rawPoints[0]);
    assert.ok(powers[3] > powers[2]);
    assert.ok(powers[2] > arena.FAIR_BATTLE_TOTAL_SWING_CAP);
    assert.ok(swings[3] > swings[0]);
    if (fs.existsSync(duel.arenaFile)) fs.unlinkSync(duel.arenaFile);
  });

  const chatReward = require("../scripts/MIA_CHAT_REWARD_ENGINE");

  function sumPoints(state) {
    return PLATFORMS.reduce((total, id) => total + state.platforms[id].miaPoints, 0);
  }

  await test("FAIR Kick gift arena_boost stays inside the paid score budget", async () => {
    const overlays = [];
    const duel = buildPipeline(arena.createArenaState({ scoringMode: "fair" }), {
      chatRewardModule: chatReward,
      setOverlay: (payload) => {
        overlays.push(payload);
        return {};
      }
    });
    primeDuel(duel, "fair", 1000);
    const random = Math.random;
    Math.random = () => 0;
    try {
      const beforeSum = sumPoints(duel.getArenaState());
      const beforePoints = pointsOf(duel.getArenaState());
      const response = await invokeIngest(
        duel.handleIngest,
        bridgePayload("kick", "gift", {
          eventId: "fair-kick-stack-push",
          coins: 50000,
          giftName: "Rose",
          message: "stack push",
          username: "fair_boost_kick"
        })
      );
      assert.equal(response.status, 200);
      assert.equal(response.body.ok, true);
      assert.equal(response.body.deduped, undefined);
      assert.equal(response.body.normalizedEvent.platform, "kick");
      assert.equal(response.body.normalizedEvent.eventType, "GIFT");
      assert.ok(response.body.normalizedEvent.support.miaPoints > arena.FAIR_PAID_SCORE_CAP);
      assert.match(String(response.body.normalizedEvent.message || ""), /stack push/);

      const state = duel.getArenaState();
      const action = state.battle.actions[0];
      assert.ok(action);
      assert.equal(action.attacker, "kick");
      assert.equal(action.effect, "damage");
      assert.equal(action.power, arena.FAIR_BATTLE_POWER_PER_TARGET);
      assert.equal(action.targets.length, 3);
      const swing = swingAgainst(beforePoints, pointsOf(state), "kick");
      assert.equal(swing, arena.FAIR_BATTLE_TOTAL_SWING_CAP);
      assert.equal(sumPoints(state) - beforeSum, arena.FAIR_PAID_SCORE_CAP);
      assert.ok(overlays.some((row) => /arény/i.test(String(row && row.text))));

      const scored = pointsOf(state);
      const actions = state.battle.actions.length;
      const gifts = state.platforms.kick.gifts;
      duel.applyWorldLayer(response.body.normalizedEvent);
      assert.deepEqual(pointsOf(duel.getArenaState()), scored);
      assert.equal(duel.getArenaState().battle.actions.length, actions);
      assert.equal(duel.getArenaState().platforms.kick.gifts, gifts);
      assert.equal(sumPoints(duel.getArenaState()) - beforeSum, arena.FAIR_PAID_SCORE_CAP);
    } finally {
      Math.random = random;
      if (fs.existsSync(duel.arenaFile)) fs.unlinkSync(duel.arenaFile);
    }
  });

  await test("classic arenaBoost still scales and the same eventId cannot score twice", async () => {
    const duel = buildPipeline(arena.createArenaState(), {
      chatRewardModule: chatReward
    });
    const random = Math.random;
    Math.random = () => 0;
    try {
      const response = await invokeIngest(
        duel.handleIngest,
        bridgePayload("kick", "gift", {
          eventId: "classic-kick-stack-push",
          coins: 50000,
          giftName: "Rose",
          message: "stack push",
          username: "classic_boost_kick"
        })
      );
      assert.equal(response.body.ok, true);
      assert.equal(response.body.deduped, undefined);
      const raw = response.body.normalizedEvent.support.miaPoints;
      const boost = Math.max(5, Math.round(raw * 0.15) || 8);
      const boostScore = Math.max(2, boost);
      assert.ok(raw > 1000);
      assert.equal(duel.getArenaState().platforms.kick.miaPoints, raw + boostScore);
      assert.equal(duel.getArenaState().platforms.tiktok.miaPoints, 0);
      const boostEventId = `${response.body.normalizedEvent.eventId}:arena_boost`;
      assert.ok(
        duel.getArenaState().seenEventIds.some((row) => (row && row.id) === boostEventId)
      );

      const before = pointsOf(duel.getArenaState());
      duel.applyWorldLayer(response.body.normalizedEvent);
      assert.deepEqual(pointsOf(duel.getArenaState()), before);
      const direct = arena.ingestArenaActivity(duel.getArenaState(), {
        platform: "kick",
        eventType: "COMMENT",
        userLabel: "classic_boost_kick",
        miaPoints: boostScore,
        eventId: boostEventId
      });
      assert.equal(direct.applied, false);
      assert.equal(direct.reason, "duplicate_event");
      assert.equal(direct.state.platforms.kick.miaPoints, before.kick);
    } finally {
      Math.random = random;
      if (fs.existsSync(duel.arenaFile)) fs.unlinkSync(duel.arenaFile);
    }
  });

  if (fs.existsSync(pipeline.arenaFile)) fs.unlinkSync(pipeline.arenaFile);
  if (fs.existsSync(tmpRuntime)) fs.unlinkSync(tmpRuntime);
  if (process.env.MIA_PLATFORM_LIVE_SIGNALS) {
    fs.rmSync(process.env.MIA_PLATFORM_LIVE_SIGNALS, { force: true });
  }

  if (!process.exitCode) {
    console.log("platform_arena_e2e_contract: all passed");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
