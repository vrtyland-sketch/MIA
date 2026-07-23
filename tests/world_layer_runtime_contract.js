"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createWorldLayerRuntime } = require("../scripts/MIA_WORLD_LAYER_RUNTIME");

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
  await test("createWorldLayerRuntime exposes applyWorldLayer", () => {
    const api = createWorldLayerRuntime({
      upper: (v) => String(v || "").toUpperCase(),
      getUserLabel: () => "Viewer",
      extractSupportPayload: (n) => n.support || n,
      safeString: (v, d) => String(v ?? d ?? ""),
      kojnozoutModule: {},
      kojnozoutBackpackModule: {},
      getKojnozoutBackpackState: () => ({}),
      setKojnozoutBackpackState: () => {},
      getDuelState: () => ({}),
      setDuelState: () => {},
      kojnozoutDuelModule: {},
      platformArenaModule: {},
      getArenaState: () => null,
      setArenaState: () => {},
      chatRewardModule: {},
      kojRosterModule: {},
      setOverlay: () => ({}),
      invalidateOverlayStateCache: () => {},
      writeLog: () => {},
      scheduleWorldSave: () => {}
    });
    assert.equal(typeof api.applyWorldLayer, "function");
  });

  await test("applyWorldLayer adds gift item to backpack and grants on normalized", () => {
    let backpack = { items: [] };
    let saved = false;
    const normalized = {
      eventType: "GIFT",
      support: { miaPoints: 10, giftKey: "rose" }
    };

    createWorldLayerRuntime({
      upper: (v) => String(v || "").toUpperCase(),
      getUserLabel: () => "Donor",
      extractSupportPayload: (n) => n.support,
      safeString: (v, d) => String(v ?? d ?? ""),
      kojnozoutModule: { getEffectiveFeedValue: (s) => s.miaPoints },
      kojnozoutBackpackModule: {
        resolveItemFromEvent: () => ({
          id: "item-1",
          label: "Rose",
          giftKey: "rose",
          source: "gift",
          power: 2
        }),
        addItemToBackpack: (state, user, item) => ({
          ...state,
          items: [...(state.items || []), { user, item }]
        })
      },
      getKojnozoutBackpackState: () => backpack,
      setKojnozoutBackpackState: (next) => {
        backpack = next;
      },
      getDuelState: () => ({ active: false }),
      setDuelState: () => {},
      kojnozoutDuelModule: { tickDuel: (s) => s },
      platformArenaModule: {},
      getArenaState: () => null,
      setArenaState: () => {},
      chatRewardModule: {},
      kojRosterModule: {},
      setOverlay: () => ({}),
      invalidateOverlayStateCache: () => {},
      writeLog: () => {},
      scheduleWorldSave: () => {
        saved = true;
      }
    }).applyWorldLayer(normalized);

    assert.equal(backpack.items.length, 1);
    assert.equal(normalized.support.grantedItem.id, "item-1");
    assert.equal(saved, true);
  });

  await test("applyWorldLayer ingests duel contribution when duel active", () => {
    let duel = { active: true, score: 0 };
    createWorldLayerRuntime({
      upper: (v) => String(v || "").toUpperCase(),
      getUserLabel: () => "Fighter",
      extractSupportPayload: (n) => n.support || {},
      safeString: (v, d) => String(v ?? d ?? ""),
      kojnozoutModule: { getEffectiveFeedValue: () => 5 },
      kojnozoutBackpackModule: {
        resolveItemFromEvent: () => null
      },
      getKojnozoutBackpackState: () => ({}),
      setKojnozoutBackpackState: () => {},
      getDuelState: () => duel,
      setDuelState: (next) => {
        duel = next;
      },
      kojnozoutDuelModule: {
        ingestDuelContribution: (state, ctx) => ({
          state: { ...state, score: state.score + ctx.miaPoints }
        })
      },
      platformArenaModule: {},
      getArenaState: () => null,
      setArenaState: () => {},
      chatRewardModule: {},
      kojRosterModule: {},
      setOverlay: () => ({}),
      invalidateOverlayStateCache: () => {},
      writeLog: () => {},
      scheduleWorldSave: () => {}
    }).applyWorldLayer({ eventType: "GIFT", support: { miaPoints: 5 } });

    assert.equal(duel.score, 5);
  });

  await test("index.js wires worldLayerRuntime with thin wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initWorldLayerRuntime/);
    assert.match(indexSrc, /MIA_WORLD_LAYER_RUNTIME/);
    assert.match(indexSrc, /MIA_WORLD_LAYER_CTX/);
    assert.match(
      indexSrc,
      /function applyWorldLayer\(normalized = \{\}\) \{\s*return worldLayerRuntime\(\)\.applyWorldLayer\(normalized\);/
    );
    assert.doesNotMatch(indexSrc, /stage: "chat_reward"/);
  });

  console.log("world_layer_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
