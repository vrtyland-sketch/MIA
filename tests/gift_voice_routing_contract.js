"use strict";

const assert = require("assert/strict");
const { enrichNormalizedSupport } = require("../scripts/MIA_SUPPORT_RESOLVER");
const giftEconomy = require("../scripts/MIA_GIFT_ECONOMY");
const presentation = require("../scripts/MIA_GIFT_PRESENTATION");
const responseEngine = require("../scripts/MIA_RESPONSE_ENGINE");
const { createOutputState } = require("../scripts/MIA_OUTPUT_STATE");
const { TEXT_BANK } = require("../scripts/MIA_TEXT_BANK");
const policy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
const { buildActionResult } = require("../shared/platform_runtime/action_builder");
const { decide } = require("../shared/platform_runtime_rules/decision_engine");
const { resolveVoiceDeliveryPlan } = require("../scripts/MIA_SPEAKER_ROUTING");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

function roseSupport() {
  const support = enrichNormalizedSupport(
    {
      platform: "tiktok",
      user: { nickname: "Tomino" },
      support: { giftName: "Rose", coins: 1, repeatCount: 1 }
    },
    {}
  ).support;
  support.giftContext = giftEconomy.buildResolvedGiftContext({
    support,
    giftProfile: support.giftProfile
  });
  return support;
}

function roseAction() {
  const event = {
    eventType: "GIFT",
    route: "support",
    user: { username: "Tomino", nickname: "Tomino" },
    support: { giftName: "Rose", tier: "T1", coins: 1, repeatCount: 1, giftKey: "ROSE" }
  };
  const decision = policy.applySupportPresentation(
    decide({
      event,
      streamState: { audience: { viewerCount: 18 } },
      kojnozoutState: { bowlPercent: 8 }
    }),
    event,
    { bowlPercent: 8 },
    { audience: { viewerCount: 18 } },
    {}
  );
  return buildActionResult({
    decision,
    event,
    streamState: { audience: { viewerCount: 18 } },
    outputState: createOutputState(),
    kojnozoutState: { bowlPercent: 8 }
  });
}

test("Rose without gift memory keeps the catalog bubble and speaks the bank line", () => {
  const action = roseAction();
  const bankText = action.response.text;
  const bank = TEXT_BANK.support_small_kojnozout || [];
  assert.ok(bankText);
  assert.ok(bank.includes(bankText), `expected support_small_kojnozout line, got ${bankText}`);
  assert.equal(action.overlayPayload.text, bankText);

  const prepared = presentation.prepareGiftPresentation(
    { user: { nickname: "Tomino" }, support: roseSupport() },
    action
  );
  const overlayText = prepared.actionResult.overlayPayload.text;
  assert.equal(overlayText, "Tomino poslal Rose");

  const plan = resolveVoiceDeliveryPlan(prepared.actionResult);
  assert.equal(plan.shouldSpeak, true);
  assert.equal(plan.voiceSpeaker, "kojnozout");
  assert.equal(plan.text, bankText);
  assert.notEqual(plan.text, overlayText);
  assert.doesNotMatch(plan.text, /poslal Rose/);
});

test("gift memory still speaks and shows the memory line", () => {
  const outputState = createOutputState();
  const built = responseEngine.buildSupportResponse(outputState, {
    speaker: "kojnozout",
    userLabel: "Tomino",
    giftName: "Rose",
    giftKey: "ROSE",
    tier: "T1",
    supportAckMode: "full",
    giftMemory: {
      totalGifts: 5,
      favoriteGift: "ROSE",
      currentGiftKey: "ROSE"
    },
    decision: {
      recommendedAction: {
        type: "support",
        bankKey: "support_small",
        speaker: "kojnozout"
      }
    }
  });
  const memoryText = built.speech_text;
  assert.match(memoryText, /Tomino/);
  assert.match(memoryText, /klasika/);
  assert.equal(built.meta.giftMemoryApplied, true);

  const prepared = presentation.prepareGiftPresentation(
    { user: { nickname: "Tomino" }, support: roseSupport() },
    built
  );
  assert.equal(prepared.actionResult.overlayPayload.text, memoryText);
  assert.notEqual(prepared.actionResult.overlayPayload.text, "Tomino poslal Rose");

  const plan = resolveVoiceDeliveryPlan(prepared.actionResult);
  assert.equal(plan.shouldSpeak, true);
  assert.equal(plan.text, memoryText);
  assert.equal(plan.text, prepared.actionResult.overlayPayload.text);
});

test("non-gift voice routing still prefers the overlay line", () => {
  const kojChat = resolveVoiceDeliveryPlan({
    route: "community",
    overlayPayload: { owner: "kojnozout", text: "Ham ham." },
    response: { text: "catalog should not win" },
    speech_text: "bank should not win"
  });
  assert.equal(kojChat.voiceSpeaker, "kojnozout");
  assert.equal(kojChat.text, "Ham ham.");

  const miaHello = resolveVoiceDeliveryPlan({
    route: "community",
    overlayPayload: { owner: "mia", text: "Ahoj, vítej." },
    response: { text: "Tomino poslal Rose" },
    speech_text: "Jo, něco přistálo. To beru."
  });
  assert.equal(miaHello.voiceSpeaker, "mia");
  assert.equal(miaHello.text, "Ahoj, vítej.");
  assert.equal(miaHello.shouldSpeak, true);
});

if (process.exitCode) process.exit(process.exitCode);
console.log("");
console.log("---- GIFT VOICE ROUTING CONTRACT ----");
console.log("passed");
