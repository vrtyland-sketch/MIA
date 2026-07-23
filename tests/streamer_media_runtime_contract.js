"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createStreamerMediaRuntime } = require("../scripts/MIA_STREAMER_MEDIA_RUNTIME");

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
  await test("createStreamerMediaRuntime exposes tryHandleStreamerMediaCommand", () => {
    const api = createStreamerMediaRuntime({
      streamerMediaCommandModule: {},
      streamerAccessModule: {},
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Boss",
      videoEngine: null,
      getOutputState: () => ({}),
      runtimeConfig: {},
      mediaCatalogModule: {},
      executeOverlay: async () => ({}),
      maybeDeliverMiaVoice: async () => ({}),
      ecosystemState: {},
      streamState: {},
      soloStreamModule: {},
      writeLog: () => {}
    });
    assert.equal(typeof api.tryHandleStreamerMediaCommand, "function");
  });

  await test("tryHandleStreamerMediaCommand returns null when parse missing", async () => {
    const result = await createStreamerMediaRuntime({
      streamerMediaCommandModule: {},
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Boss"
    }).tryHandleStreamerMediaCommand({ message: "video intro" });

    assert.equal(result, null);
  });

  await test("tryHandleStreamerMediaCommand rejects non-streamer", async () => {
    const overlays = [];
    const result = await createStreamerMediaRuntime({
      streamerMediaCommandModule: {
        parseStreamerMediaCommand: () => ({ kind: "intro" }),
        buildRejectOverlay: () => ({ text: "no" })
      },
      streamerAccessModule: {
        resolveStreamerAccess: () => ({ isStreamerBoss: false })
      },
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Viewer",
      videoEngine: { getSnapshot: () => ({}) },
      getOutputState: () => ({}),
      runtimeConfig: {},
      executeOverlay: async (overlay) => {
        overlays.push(overlay);
      }
    }).tryHandleStreamerMediaCommand({ message: "video intro" });

    assert.equal(result.body.rejected, "streamer_only");
    assert.equal(overlays.length, 1);
  });

  await test("tryHandleStreamerMediaCommand queues media for streamer boss", async () => {
    const result = await createStreamerMediaRuntime({
      streamerMediaCommandModule: {
        parseStreamerMediaCommand: () => ({ kind: "intro" }),
        canPlayNow: () => ({ ok: true }),
        pickRotatedMedia: () => ({
          abs: "/media/intro.mp4",
          rel: "intro.mp4",
          durationMs: 3000,
          contentKind: "video"
        }),
        buildAckOverlay: () => ({ text: "ok" }),
        executeStreamerMediaPlay: async () => ({ ok: true })
      },
      streamerAccessModule: {
        resolveStreamerAccess: () => ({ isStreamerBoss: true })
      },
      safeString: (v) => String(v ?? ""),
      getUserLabel: () => "Boss",
      videoEngine: { getSnapshot: () => ({}) },
      getOutputState: () => ({}),
      runtimeConfig: {},
      mediaCatalogModule: { loadCatalog: () => ({}) },
      executeOverlay: async () => ({}),
      maybeDeliverMiaVoice: async () => ({}),
      ecosystemState: {},
      streamState: {},
      soloStreamModule: {},
      writeLog: () => {}
    }).tryHandleStreamerMediaCommand({ message: "video intro" });

    assert.equal(result.handled, true);
    assert.equal(result.body.queued, true);
    assert.equal(result.body.kind, "intro");
  });

  await test("index.js wires streamerMediaRuntime with thin wrapper", () => {
    const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
    assert.match(indexSrc, /initStreamerMediaRuntime/);
    assert.match(indexSrc, /MIA_STREAMER_MEDIA_RUNTIME/);
    assert.match(indexSrc, /MIA_STREAMER_MEDIA_CTX/);
    assert.doesNotMatch(indexSrc, /source: "streamer_media_play_async"/);
  });

  console.log("streamer_media_runtime_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
