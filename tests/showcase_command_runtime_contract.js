"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createShowcaseCommandRuntime } = require("../scripts/MIA_SHOWCASE_COMMAND_RUNTIME");

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
  await test("createShowcaseCommandRuntime exposes showcase command API", () => {
    const api = createShowcaseCommandRuntime({
      streamerShowcaseModule: {},
      streamerIdentityModule: {},
      runtimeConfig: {},
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Boss",
      writeLog: () => {},
      executeOverlay: async () => ({}),
      speakMiaShowcaseLine: async () => ({ ok: true }),
      overlayStateModule: {},
      getOverlayState: () => ({}),
      videoEngine: null,
      kojTestModeModule: {},
      kojnozoutVitalsModule: {},
      kojnozoutDuelModule: {},
      getKojnozoutState: () => ({}),
      setKojnozoutState: () => {},
      getDuelState: () => ({}),
      setDuelState: () => {},
      scheduleWorldSave: () => {},
      getEnv: () => ({})
    });

    assert.equal(typeof api.tryHandleKojStateShowcaseCommand, "function");
    assert.equal(typeof api.tryHandleStreamerShowcaseCommand, "function");
  });

  await test("tryHandleKojStateShowcaseCommand returns null when parse missing", async () => {
    const result = await createShowcaseCommandRuntime({
      streamerShowcaseModule: {},
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Boss",
      writeLog: () => {},
      executeOverlay: async () => ({}),
      speakMiaShowcaseLine: async () => ({ ok: true })
    }).tryHandleKojStateShowcaseCommand({ message: "koj stav" });

    assert.equal(result, null);
  });

  await test("tryHandleKojStateShowcaseCommand denies non-boss user", async () => {
    const overlays = [];
    const result = await createShowcaseCommandRuntime({
      streamerShowcaseModule: {
        parseKojStateShowcaseCommand: () => ({ ok: true }),
        buildRejectOverlay: () => ({ text: "reject" })
      },
      streamerIdentityModule: {
        verifyBoss: () => ({ ok: false, reason: "not_boss" })
      },
      runtimeConfig: {},
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Viewer",
      writeLog: () => {},
      executeOverlay: async (overlay) => {
        overlays.push(overlay);
      },
      speakMiaShowcaseLine: async () => ({ ok: true })
    }).tryHandleKojStateShowcaseCommand({ message: "koj stav" });

    assert.equal(result.handled, true);
    assert.equal(result.body.rejected, "streamer_only");
    assert.equal(overlays.length, 1);
  });

  await test("tryHandleStreamerShowcaseCommand queues showcase when idle", async () => {
    let queued = false;
    const result = await createShowcaseCommandRuntime({
      streamerShowcaseModule: {
        parseStreamerShowcaseCommand: () => ({ mode: "item", itemId: "sword" }),
        getShowcaseSnapshot: () => ({ active: false }),
        runShowcaseSequence: async () => {
          queued = true;
        }
      },
      streamerIdentityModule: {
        verifyBoss: () => ({ ok: true })
      },
      runtimeConfig: {},
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Boss",
      writeLog: () => {},
      executeOverlay: async () => ({}),
      overlayStateModule: {},
      getOverlayState: () => ({}),
      videoEngine: null,
      kojTestModeModule: {},
      kojnozoutVitalsModule: {},
      kojnozoutDuelModule: {},
      getKojnozoutState: () => ({}),
      setKojnozoutState: () => {},
      getDuelState: () => ({}),
      setDuelState: () => {},
      scheduleWorldSave: () => {},
      getEnv: () => ({})
    }).tryHandleStreamerShowcaseCommand({ message: "showcase sword" });

    assert.equal(result.handled, true);
    assert.equal(result.body.kind, "showcase");
    assert.equal(result.body.queued, true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(queued, true);
  });

  await test("index.js wires showcaseCommandRuntime with thin wrappers", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initShowcaseCommandRuntime/);
    assert.match(indexSrc, /MIA_SHOWCASE_COMMAND_RUNTIME/);
    assert.match(indexSrc, /MIA_SHOWCASE_COMMAND_CTX/);
    assert.doesNotMatch(indexSrc, /stage: "koj_state_showcase_denied"/);
    assert.doesNotMatch(indexSrc, /stage: "streamer_showcase_denied"/);
  });

  console.log("showcase_command_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
