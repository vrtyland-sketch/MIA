"use strict";

const assert = require("assert/strict");
const {
  createVoiceControlLayer
} = require("../scripts/MIA_VOICE_CONTROL_LAYER");

const results = {
  passed: 0,
  failed: 0
};

async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

function createLayer() {
  return createVoiceControlLayer({
    appendJsonLog: () => {},
    nowTs: () => 1234567890
  });
}

(async () => {
  await test("rejects empty voice command", async () => {
    const layer = createLayer();

    const result = layer.resolveVoiceCommand({
      text: "",
      trusted: true,
      source: "streamer_voice"
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "empty_command");
  });

  await test("rejects untrusted voice command", async () => {
    const layer = createLayer();

    const result = layer.resolveVoiceCommand({
      text: "MIA shrň stav",
      trusted: false,
      source: "random_input"
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "untrusted_voice_source");
  });

  await test("routes pet command to Kojnozout", async () => {
    const layer = createLayer();

    const result = layer.resolveVoiceCommand({
      text: "Kojnožroute sedni",
      trusted: true,
      source: "streamer_voice",
      kojnozoutState: {
        bowlPercent: 42,
        mood: "calm",
        stage: "idle"
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.domain, "kojnozout");
    assert.equal(result.target, "kojnozout");
    assert.equal(result.type, "pet_command");
    assert.equal(result.command, "sit");
    assert.equal(result.execution.kind, "entity_behavior");
    assert.equal(result.execution.entity, "kojnozout");
    assert.equal(result.execution.obsSceneSwitchAllowed, false);
    assert.equal(result.response.speaker, "kojnozout");
  });

  await test("routes bowl question to Kojnozout info layer", async () => {
    const layer = createLayer();

    const result = layer.resolveVoiceCommand({
      text: "Kojnožroute jak je na tom miska",
      trusted: true,
      source: "streamer_voice",
      kojnozoutState: {
        bowlPercent: 77,
        mood: "happy",
        stage: "rest"
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.domain, "kojnozout");
    assert.equal(result.type, "status_command");
    assert.equal(result.command, "bowl");
    assert.equal(result.execution.kind, "status_read");
    assert.equal(result.execution.obsSceneSwitchAllowed, false);
  });

  await test("routes summary request to MIA", async () => {
    const layer = createLayer();

    const result = layer.resolveVoiceCommand({
      text: "MIA shrň stav světa",
      trusted: true,
      source: "streamer_voice",
      runtimeState: {
        worldMode: "main"
      },
      kojnozoutState: {
        bowlPercent: 55,
        mood: "idle"
      },
      streamState: {
        support: { totalCoins: 100, totalMiaPoints: 42, totalGiftEvents: 3 },
        chat: { totalMessages: 12 }
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.domain, "mia");
    assert.equal(result.target, "mia");
    assert.equal(result.command, "summary");
    assert.equal(result.response.speaker, "mia");
    assert.equal(result.execution.obsSceneSwitchAllowed, false);
    assert.match(String(result.response.text || ""), /MIA body/i);
    assert.doesNotMatch(String(result.response.text || ""), /coin/i);
  });

  await test("status and points voice copy never says coins", async () => {
    const layer = createLayer();

    const status = layer.resolveVoiceCommand({
      text: "Kojnožroute jaký máš status",
      trusted: true,
      source: "streamer_voice",
      kojnozoutState: {
        bowlPercent: 33,
        mood: "happy",
        stage: "idle",
        hunger: 40,
        energy: 70,
        totalFeedEvents: 5,
        totalFedCoins: 999
      },
      streamState: {
        support: { totalCoins: 999, totalMiaPoints: 20, totalGiftEvents: 2 },
        chat: { totalMessages: 4 }
      }
    });

    assert.equal(status.ok, true);
    const statusText = String(status.response?.text || "");
    assert.doesNotMatch(statusText, /coin/i);
    assert.match(statusText, /nakrmení|miska/i);

    const points = layer.resolveVoiceCommand({
      text: "Kojnožroute kolik máme bodů",
      trusted: true,
      source: "streamer_voice",
      streamState: {
        support: { totalCoins: 500, totalMiaPoints: 77, totalGiftEvents: 8 },
        chat: { totalMessages: 3 }
      }
    });

    assert.equal(points.ok, true);
    const pointsText = String(points.response?.text || "");
    assert.doesNotMatch(pointsText, /coin/i);
    assert.match(pointsText, /MIA bod/i);
  });

  await test("resolves world mode command without OBS scene switch", async () => {
    const layer = createLayer();

    const result = layer.resolveVoiceCommand({
      text: "zapni nejsem tu",
      trusted: true,
      source: "streamer_voice"
    });

    assert.equal(result.ok, true);
    assert.equal(result.domain, "system");
    assert.equal(result.type, "world_mode");
    assert.equal(result.intent.type, "world_mode");
    assert.equal(result.intent.worldMode, "nejsem_tu");
    assert.equal(result.execution.kind, "world_mode_only");
    assert.equal(result.execution.sceneMode, "nejsem_tu");
    assert.equal(result.execution.obsSceneSwitchAllowed, false);
    assert.equal(result.response.speaker, "mia");
  });

  await test("falls back to MIA conversation for generic text", async () => {
    const layer = createLayer();

    const result = layer.resolveVoiceCommand({
      text: "MIA pojď se mnou řešit plán",
      trusted: true,
      source: "streamer_voice"
    });

    assert.equal(result.ok, true);
    assert.equal(result.domain, "mia");
    assert.equal(result.command, "conversation");
    assert.equal(result.execution.kind, "conversation_only");
    assert.equal(result.execution.obsSceneSwitchAllowed, false);
  });

  console.log("");
  console.log("---- VOICE CONTROL LAYER SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ voice control layer smoke runner crashed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});