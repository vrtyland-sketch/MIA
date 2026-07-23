"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const awayLoop = require("../scripts/MIA_OBS_AWAY_LOOP");

test("resolveAwayLoopMode defaults to browser without MP4", () => {
  assert.equal(awayLoop.resolveAwayLoopMode({ MIA_AWAY_LOOP_MODE: "auto" }), "browser");
});

test("buildAwayLoopBrowserUrl points to away-loop-overlay", () => {
  assert.match(awayLoop.buildAwayLoopBrowserUrl(3000), /away-loop-overlay\.html/);
});

test("away-loop-overlay.html exists", () => {
  const html = path.join(__dirname, "..", "mia-output-overlay", "away-loop-overlay.html");
  assert.ok(fs.existsSync(html));
  const raw = fs.readFileSync(html, "utf8");
  assert.match(raw, /NEJSEM TU/);
});

test("ensureAwayLoopInScene creates browser loop", async () => {
  const calls = [];
  const sceneItems = [];

  async function obsCall(type, data = {}) {
    calls.push({ type, data });
    switch (type) {
      case "GetInputList":
        return { inputs: [] };
      case "CreateInput":
        sceneItems.push({
          sourceName: data.inputName,
          sceneItemId: sceneItems.length + 1,
          sceneItemEnabled: data.sceneItemEnabled === true
        });
        return { sceneItemId: sceneItems.length };
      case "GetSceneItemList":
        return {
          sceneItems: sceneItems.filter(() => data.sceneName === "SPINAK_NEJSEM_TU")
        };
      case "SetSceneItemIndex":
      case "SetInputSettings":
        return { ok: true };
      default:
        throw new Error(`unexpected ${type}`);
    }
  }

  const result = await awayLoop.ensureAwayLoopInScene(obsCall, "SPINAK_NEJSEM_TU", {
    port: 3000,
    env: { MIA_AWAY_LOOP_MODE: "browser" }
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "browser");
  assert.equal(result.inputName, "MIA_AWAY_LOOP");
  assert.ok(calls.some((row) => row.type === "CreateInput"));
});
