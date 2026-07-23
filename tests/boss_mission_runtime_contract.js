"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createBossMissionRuntime } = require("../scripts/MIA_BOSS_MISSION_RUNTIME");

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
  await test("createBossMissionRuntime exposes tryAutoBossMissionFromGift", () => {
    const api = createBossMissionRuntime({
      runtimeConfig: {},
      bossMissionModule: {},
      getOverlayState: () => ({}),
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Viewer",
      videoEngine: null,
      writeLog: () => {}
    });
    assert.equal(typeof api.tryAutoBossMissionFromGift, "function");
  });

  await test("tryAutoBossMissionFromGift skips when giftAutoApply off", async () => {
    const result = await createBossMissionRuntime({
      runtimeConfig: { bossMission: { giftAutoApply: false } },
      bossMissionModule: { applyBossMission: () => ({ ok: true }) },
      getOverlayState: () => ({}),
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Viewer",
      videoEngine: null,
      writeLog: () => {}
    }).tryAutoBossMissionFromGift({
      support: { giftContext: { streamTier: "T5" } }
    });

    assert.equal(result, null);
  });

  await test("tryAutoBossMissionFromGift skips non T5/T6 tiers", async () => {
    let called = false;
    const result = await createBossMissionRuntime({
      runtimeConfig: { bossMission: { giftAutoApply: true } },
      bossMissionModule: {
        applyBossMission: () => {
          called = true;
          return { ok: true };
        }
      },
      getOverlayState: () => ({}),
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Viewer",
      videoEngine: null,
      writeLog: () => {}
    }).tryAutoBossMissionFromGift({
      support: { giftContext: { streamTier: "T3" } }
    });

    assert.equal(result, null);
    assert.equal(called, false);
  });

  await test("tryAutoBossMissionFromGift applies for T5 gift", async () => {
    const events = [];
    const result = await createBossMissionRuntime({
      runtimeConfig: { bossMission: { giftAutoApply: true } },
      bossMissionModule: {
        applyBossMission: (_overlay, ctx) => ({
          ok: true,
          plan: { arcId: "arc-1" },
          playHint: null,
          ctx
        })
      },
      getOverlayState: () => ({ miaOverlay: null }),
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Donor",
      videoEngine: null,
      writeLog: (_prefix, payload) => events.push(payload)
    }).tryAutoBossMissionFromGift({
      support: { giftContext: { streamTier: "T5" } }
    });

    assert.equal(result.ok, true);
    assert.equal(result.plan.arcId, "arc-1");
    assert.equal(events[0]?.stage, "boss_mission_auto_gift");
    assert.equal(events[0]?.tier, "T5");
  });

  await test("index.js wires bossMissionRuntime with thin wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initBossMissionRuntime/);
    assert.match(indexSrc, /MIA_BOSS_MISSION_RUNTIME/);
    assert.match(indexSrc, /MIA_BOSS_MISSION_CTX/);
    assert.match(
      indexSrc,
      /async function tryAutoBossMissionFromGift\(normalized = \{\}\) \{\s*return bossMissionRuntime\(\)\.tryAutoBossMissionFromGift\(normalized\);/
    );
    assert.doesNotMatch(indexSrc, /stage: "boss_mission_auto_gift"/);
  });

  console.log("boss_mission_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
