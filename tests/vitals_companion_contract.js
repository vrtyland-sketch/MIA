"use strict";

const assert = require("assert");
const vitalsCompanion = require("../scripts/MIA_KOJNOZROUT_VITALS_COMPANION");
const supportPolicy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
const actionBuilder = require("../shared/platform_runtime/action_builder");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const outputState = { vitalsCompanionCooldown: {} };

  const sleepyState = {
    mood: "sleepy",
    isSleeping: true,
    vitals: { sleepDepth: 72 },
    hunger: 40
  };

  assert.equal(vitalsCompanion.resolveVitalsSignal(sleepyState).key, "sleepy");
  assert.equal(
    vitalsCompanion.shouldMiaVitalsCompanion(sleepyState, outputState, {}),
    true
  );
  pass("sleepy vitals enable MIA companion signal");

  const line = vitalsCompanion.buildMiaVitalsCompanionText({
    vitalsCompanion: {
      enabled: true,
      bankKey: "mia_vitals_sleepy_gift",
      vitalsLine: "spí, ale slyší stream",
      giftName: "Rose"
    },
    event: { user: { nickname: "Petra" } }
  });
  assert.ok(line.includes("Petra") || line.includes("petra"));
  pass("companion text includes viewer name");

  vitalsCompanion.noteVitalsCompanionSpoken(outputState, "sleepy");
  assert.equal(
    vitalsCompanion.shouldMiaVitalsCompanion(sleepyState, outputState, {}),
    false
  );
  pass("cooldown prevents immediate repeat");

  const presentation = supportPolicy.resolveSupportPresentation(
    {
      route: "support",
      support: { tier: "T1", giftName: "Rose" },
      user: { nickname: "Karel" }
    },
    sleepyState,
    {
      route: "support",
      reason: "SUPPORT_RESOLVED",
      tier: "T1",
      resolvedSupport: { tier: "T1" }
    },
    { audience: { viewerCount: 20 } },
    { vitalsCompanionCooldown: {} }
  );

  // Default: dual voice OFF — vitals may be detected but companion TTS/overlay is gated.
  assert.equal(presentation.actorRoles.allowCompanion, false);
  pass("support presentation keeps companion off by default");

  const prev = process.env.MIA_DUAL_VOICE;
  process.env.MIA_DUAL_VOICE = "1";
  try {
    const dualPresentation = supportPolicy.resolveSupportPresentation(
      {
        route: "support",
        support: { tier: "T1", giftName: "Rose" },
        user: { nickname: "Karel" }
      },
      sleepyState,
      {
        route: "support",
        reason: "SUPPORT_RESOLVED",
        tier: "T1",
        resolvedSupport: { tier: "T1" }
      },
      { audience: { viewerCount: 20 } },
      { vitalsCompanionCooldown: {} }
    );
    assert.equal(dualPresentation.actorRoles.allowCompanion, true);
    assert.ok(dualPresentation.meta.vitalsCompanion?.enabled);

    const actionResult = actionBuilder.buildActionResult({
      decision: {
        route: "support",
        reason: "SUPPORT_RESOLVED",
        speaker: "kojnozout",
        tier: "T1",
        shouldPlayVideo: false,
        actorRoles: {
          primary: "kojnozout",
          companion: "mia",
          allowCompanion: true,
          companionReason: "MIA_VITALS_SLEEPY_COMPANION"
        },
        meta: dualPresentation.meta
      },
      event: {
        route: "support",
        support: { tier: "T1", giftName: "Rose" },
        user: { nickname: "Karel" }
      },
      kojnozoutState: sleepyState,
      outputState: { vitalsCompanionCooldown: {} }
    });

    assert.ok(actionResult.companionOverlayPayload);
    assert.ok(actionResult.companionOverlayPayload.text.length > 10);
    assert.equal(actionResult.companionOverlayPayload.owner, "mia");
    pass("MIA_DUAL_VOICE=1 emits vitals companion overlay");
  } finally {
    if (prev === undefined) delete process.env.MIA_DUAL_VOICE;
    else process.env.MIA_DUAL_VOICE = prev;
  }

  console.log("\n---- VITALS COMPANION CONTRACT ----");
  console.log("passed");
}

run();
