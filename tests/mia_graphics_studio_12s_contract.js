"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const graphicsStudio = require("../shared/mia-graphics-studio");
const liveSmoke = require("../scripts/mia_live_audit");

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
  await test("evaluateBodyStatePayload accepts canon body state", () => {
    const evalResult = graphicsStudio.evaluateBodyStatePayload({
      ok: true,
      mood: "idle",
      parts: { head: false, eyes: false, hands: false, torso: false, feet: false }
    });
    assert.equal(evalResult.ok, true);
    assert.match(evalResult.detail, /mood=idle/);
  });

  await test("evaluateOverlayPublicSanitized rejects coins", () => {
    const evalResult = graphicsStudio.evaluateOverlayPublicSanitized({
      giftEconomy: { coins: 100, miaPoints: 750 }
    });
    assert.equal(evalResult.ok, false);
    assert.ok(evalResult.hits.some((hit) => hit.includes("coins")));
  });

  await test("live audit exports graphics body evaluators", () => {
    assert.equal(typeof liveSmoke.evaluateGraphicsBodyStatePayload, "function");
    assert.equal(typeof liveSmoke.evaluateOverlayPublicCoinSanitized, "function");
  });

  await test("mia_live_audit checks graphics body state endpoint", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "mia_live_audit.js"),
      "utf8"
    );
    assert.match(src, /graphics_body_state/);
    assert.match(src, /overlay_state_no_coins/);
    assert.match(src, /\/mia\/graphics\/body\/state/);
  });

  await test("graphics body phase 12s live audit features", () => {
    assert.equal(typeof graphicsStudio.evaluateBodyStatePayload, "function");
    assert.equal(typeof liveSmoke.evaluateGraphicsBodyStatePayload, "function");
  });

  console.log("mia_graphics_studio_12s_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
