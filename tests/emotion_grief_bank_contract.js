"use strict";

const assert = require("assert/strict");
const { createOutputState } = require("../scripts/MIA_OUTPUT_STATE");
const responseEngine = require("../scripts/MIA_RESPONSE_ENGINE");
const { loadTextBank } = require("../scripts/MIA_TEXT_BANK_LOADER");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

const EMOTION_GRIEF_KEYS = [
  "sadness_report_mia",
  "sadness_report_kojnozout",
  "loss_report_mia",
  "loss_report_kojnozout",
  "pet_loss_report_mia",
  "pet_loss_kojnozout",
  "emotion_stress_mia_health",
  "emotion_stress_mia_school",
  "emotion_stress_mia_finance",
  "emotion_stress_mia_general",
  "emotion_frustration_mia_general",
  "emotion_joy_mia_general",
  "emotion_relief_mia_general",
  "emotion_stress_kojnozout_general",
  "emotion_frustration_kojnozout_general",
  "emotion_joy_kojnozout_general",
  "emotion_relief_kojnozout_general"
];

console.log("\n---- EMOTION GRIEF BANK CONTRACT ----\n");

test("emotion/grief packs are loaded in TEXT_BANK", () => {
  const { TEXT_BANK, stats } = loadTextBank();

  for (const key of EMOTION_GRIEF_KEYS) {
    assert.ok(Array.isArray(TEXT_BANK[key]), `missing bank key: ${key}`);
    assert.ok(TEXT_BANK[key].length >= 3, `${key} should have variants`);
    assert.ok(
      TEXT_BANK[key].some((line) => line.includes("{name}")),
      `${key} should use {name} placeholder`
    );
  }

  assert.ok(stats.keys >= 90, `expected expanded bank keys, got ${stats.keys}`);
});

test("pet loss grief uses bank text for MIA", () => {
  const outputState = createOutputState();
  const result = responseEngine.buildDirectChatResponse(outputState, {
    target: "mia",
    userLabel: "Katka",
    message: "mia mam smutek, můj pes umřel"
  });

  const text = result.speech_text || result.overlayPayload?.text || "";
  assert.match(text.toLowerCase(), /katka|líto|mrz/i);
  assert.doesNotMatch(text.toLowerCase(), /generic|fallback/i);
});

test("stress health emotion uses domain-specific bank", () => {
  const outputState = createOutputState();
  const result = responseEngine.buildDirectChatResponse(outputState, {
    target: "mia",
    userLabel: "Tom",
    message: "mia jsem ve stresu kvuli operaci v nemocnici"
  });

  const text = result.speech_text || result.overlayPayload?.text || "";
  assert.match(text.toLowerCase(), /tom|stres|zdrav/i);
});

console.log("\n---- EMOTION GRIEF BANK CONTRACT SUMMARY ----\n");

if (process.exitCode) {
  process.exit(process.exitCode);
}
