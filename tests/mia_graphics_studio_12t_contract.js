"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  resolveHandsBodySyncMode,
  withHandsBodySyncUrls
} = require("../scripts/MIA_OBS_BODY_SYNC");
const { buildHeadline, formatHumanReport } = require("../scripts/obs_stream_ready");
const graphicsStudio = require("../shared/mia-graphics-studio");

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

(async () => {
  await test("resolveHandsBodySyncMode defaults to hybrid", () => {
    assert.equal(resolveHandsBodySyncMode({}, {}), "hybrid");
    assert.equal(resolveHandsBodySyncMode({}, { MIA_OBS_BODY_SYNC: "off" }), "none");
    assert.equal(resolveHandsBodySyncMode({ bodySync: "graphics" }, {}), "graphics");
  });

  await test("withHandsBodySyncUrls injects hybrid body URLs", () => {
    const { urls, bodySyncMode } = withHandsBodySyncUrls(
      { speech: "http://127.0.0.1:3000/speech-overlay.html" },
      "http://127.0.0.1:3000",
      {},
      {}
    );
    assert.equal(bodySyncMode, "hybrid");
    assert.match(urls.miaHead, /sync=hybrid/);
    assert.match(urls.speech, /speech-overlay/);
  });

  await test("stream-ready fix path uses hands body sync", () => {
    const verifySrc = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "obs_verify_stream_ready.js"),
      "utf8"
    );
    const overlaySrc = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "MIA_OBS_OVERLAY_SYNC.js"),
      "utf8"
    );
    assert.match(verifySrc, /resolveHandsBodySyncMode/);
    assert.match(verifySrc, /bodySync:\s*bodySyncMode/);
    assert.match(overlaySrc, /withHandsBodySyncUrls/);
  });

  await test("stream-ready headline and human report include graphics body", () => {
    const headline = buildHeadline(
      { online: true, readinessPercent: 100, streamReadyLabel: "Připravena streamovat" },
      { ok: true, summary: { browserOverlays: "13/13", graphicsBody: "5/5" } },
      { enabled: false }
    );
    assert.match(headline, /body 5\/5/);

    const human = formatHumanReport({
      ok: true,
      headline,
      mia: { readinessPercent: 100, streamReadyLabel: "Připravena streamovat" },
      obs: {
        summary: { passed: 60, failed: 0, browserOverlays: "13/13", graphicsBody: "5/5" }
      },
      fixes: []
    });
    assert.match(human, /body 5\/5/);
  });

  await test("graphics body phase 12t stream-ready features", () => {
    const { resolveHandsBodySyncMode } = require("../scripts/MIA_OBS_BODY_SYNC");
    assert.equal(resolveHandsBodySyncMode({}, {}), "hybrid");
  });

  console.log("mia_graphics_studio_12t_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
