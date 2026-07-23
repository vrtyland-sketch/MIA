"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createKojMomentsRuntime } = require("../scripts/MIA_KOJ_MOMENTS_RUNTIME");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  await test("createKojMomentsRuntime exposes koj moments API", () => {
    const api = createKojMomentsRuntime({
      upper: (v) => String(v || "").toUpperCase(),
      safeString: (v, d) => String(v ?? d ?? ""),
      getUserLabel: () => "Viewer",
      careQuestModule: {},
      careOpportunitiesModule: {},
      getKojnozoutState: () => ({}),
      setKojnozoutState: () => {},
      executeOverlay: async () => ({}),
      writeLog: () => {}
    });
    assert.equal(typeof api.applyCareQuestProgress, "function");
    assert.equal(typeof api.deliverQuestCompleteMoment, "function");
    assert.equal(typeof api.runDuelPeerSync, "function");
    assert.equal(typeof api.deliverEvolutionMoment, "function");
  });

  await test("applyCareQuestProgress skips unsupported event types", () => {
    const result = createKojMomentsRuntime({
      upper: (v) => String(v || "").toUpperCase(),
      getUserLabel: () => "Viewer"
    }).applyCareQuestProgress({ eventType: "JOIN" });
    assert.equal(result.questCompleted, false);
  });

  await test("applyCareQuestProgress updates koj state on quest progress", () => {
    let koj = { quests: 0 };
    const result = createKojMomentsRuntime({
      upper: (v) => String(v || "").toUpperCase(),
      getUserLabel: () => "Helper",
      careQuestModule: {
        progressCareQuest: (state) => ({
          state: { ...state, quests: state.quests + 1 },
          completed: true,
          questDef: { label: "Feed" }
        })
      },
      careOpportunitiesModule: {
        resolvePrimaryNeed: () => "hunger",
        syncCareContext: (state) => ({ state })
      },
      getKojnozoutState: () => koj,
      setKojnozoutState: (next) => {
        koj = next;
      },
      kojnozoutPersistenceModule: {
        scheduleSaveKojnozoutState: () => {}
      }
    }).applyCareQuestProgress({ eventType: "COMMENT" });

    assert.equal(result.questCompleted, true);
    assert.equal(koj.quests, 1);
  });

  await test("runDuelPeerSync returns null when duel disabled", async () => {
    const result = await createKojMomentsRuntime({
      safeString: (v) => String(v ?? ""),
      runtimeConfig: { duel: { enabled: false } },
      getDuelState: () => ({ active: true, peerUrl: "http://peer" })
    }).runDuelPeerSync();
    assert.equal(result, null);
  });

  await test("deliverEvolutionMoment returns null without evolution payload", async () => {
    const result = await createKojMomentsRuntime({
      kojnozoutEvolutionModule: {}
    }).deliverEvolutionMoment(null);
    assert.equal(result, null);
  });

  await test("index.js wires kojMomentsRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initKojMomentsRuntime/);
    assert.match(indexSrc, /MIA_KOJ_MOMENTS_RUNTIME/);
    assert.match(indexSrc, /MIA_KOJ_MOMENTS_CTX/);
    assert.doesNotMatch(indexSrc, /stage: "evolution_level_up"/);
    assert.doesNotMatch(indexSrc, /duelPeerSyncInFlight/);
  });

  console.log("koj_moments_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
