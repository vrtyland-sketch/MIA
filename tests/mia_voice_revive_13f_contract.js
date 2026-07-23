"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");

const ROOT = path.resolve(__dirname, "..");

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
  await test("catalog lists voice_revive as 13f", () => {
    const def = graphicsStudio.getCommand("voice_revive");
    assert.equal(def.phase, "13f");
    assert.equal(def.status, "implemented");
  });

  await test("voice overlay has autoplay unlock + retry", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-voice-overlay.html"),
      "utf8"
    );
    assert.match(src, /unlockAudio/);
    assert.match(src, /playWithRetry/);
    assert.match(src, /audioUnlocked/);
  });

  await test("obs revive-voice script + route + dashboard", () => {
    const script = fs.readFileSync(path.join(ROOT, "scripts", "obs_revive_voice.js"), "utf8");
    const routes = fs.readFileSync(path.join(ROOT, "routes", "obs.js"), "utf8");
    const dash = fs.readFileSync(
      path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
      "utf8"
    );
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    assert.match(script, /phase: "13g"/);
    assert.match(script, /MONITOR_AND_OUTPUT/);
    assert.match(script, /applyAntiEchoDesktopMute/);
    assert.match(routes, /\/obs\/revive-voice/);
    assert.match(dash, /btnReviveVoice/);
    assert.match(dash, /btnTestMiaVoice/);
    assert.match(dash, /btnTestKojVoice/);
    assert.match(pkg.scripts["obs:revive-voice"], /obs_revive_voice\.js/);
  });

  await test("anti-echo wired into OBS voice route", () => {
    const sync = fs.readFileSync(path.join(ROOT, "scripts", "MIA_OBS_OVERLAY_SYNC.js"), "utf8");
    assert.match(sync, /MIA_OBS_VOICE_ANTI_ECHO/);
    assert.match(sync, /applyAntiEchoDesktopMute/);
    const def = graphicsStudio.getCommand("voice_anti_echo");
    assert.equal(def.phase, "13g");
  });

  await test("MIA TTS default volume is audible", () => {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "MIA_TTS_ENGINE.js"), "utf8");
    assert.match(src, /EDGE_VOLUME_MIA.*, "\+0%"/);
    assert.match(src, /VOICE_PROFILE_VERSION = "v3"/);
  });

  console.log("mia_voice_revive_13f_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
