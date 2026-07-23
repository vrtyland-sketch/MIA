"use strict";

const assert = require("assert/strict");

const statusSnapshot = require("../scripts/MIA_STATUS_SNAPSHOT");
const proactiveHost = require("../scripts/MIA_PROACTIVE_HOST");
const supportPolicy = require("../scripts/MIA_SUPPORT_REACTION_POLICY");
const soloStream = require("../scripts/MIA_SOLO_STREAM");
const { createOutputState } = require("../scripts/MIA_OUTPUT_STATE");

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

console.log("\n---- STATUS SNAPSHOT CONTRACT ----\n");

test("summarizeShadowPipelineResult keeps warnings and decision meta", () => {
  const summary = statusSnapshot.summarizeShadowPipelineResult({
    ok: true,
    decisionResult: {
      reason: "COMMUNITY_DIRECT_PING",
      speaker: "mia",
      route: "community",
      meta: { supportAckMode: "full", primarySpeakerPolicy: "MIA_DIRECT" }
    },
    debug: {
      runtimePath: "legacy_runtime",
      warnings: [{ code: "NORMALIZED_EVENT_INVALID", details: { errors: ["x"] } }],
      shareBridge: { skipped: true, reason: "not_share_event" }
    }
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.warningCount, 1);
  assert.equal(summary.decision.reason, "COMMUNITY_DIRECT_PING");
  assert.equal(summary.decision.supportAckMode, "full");
  assert.equal(summary.shareBridge.reason, "not_share_event");
});

test("buildSupportAckStatus exposes cooldown and giftsSinceAck", () => {
  const outputState = createOutputState();
  outputState.supportAckState = {
    lastPublicAckAt: Date.now() - 2000,
    lastWaveAckAt: 0,
    giftsSinceAck: 3
  };

  const ack = statusSnapshot.buildSupportAckStatus({
    outputState,
    streamState: { audience: { viewerCount: 280 } },
    supportPolicyModule: supportPolicy
  });

  assert.equal(ack.audienceBand, "large");
  assert.ok(ack.cooldownMs > 0);
  assert.equal(typeof ack.inCooldown, "boolean");
  assert.equal(ack.state.giftsSinceAck, 3);
});

test("buildProactiveHostStatus reports quiet chat block on active stream", () => {
  const now = Date.now();
  const proactive = statusSnapshot.buildProactiveHostStatus({
    outputState: createOutputState(),
    streamState: {
      audience: { viewerCount: 18 },
      chat: { lastMessageAt: now - 3000 }
    },
    overlayState: {},
    serverStartedAt: now - 120000,
    runtimeConfig: {},
    proactiveHostModule: proactiveHost,
    supportPolicyModule: supportPolicy
  });

  assert.equal(proactive.enabled, true);
  assert.equal(proactive.wouldSpeak, false);
  assert.equal(proactive.blockReason, "chat_not_quiet_enough");
  assert.ok(proactive.quietThresholdMs > 0);
});

test("buildMiaRuntimeDiagnostics merges proactive, supportAck and shadow sections", () => {
  const diagnostics = statusSnapshot.buildMiaRuntimeDiagnostics({
    outputState: createOutputState(),
    streamState: { audience: { viewerCount: 40 } },
    overlayState: {},
    serverStartedAt: Date.now(),
    runtimeConfig: {},
    lastShadowPipelineSummary: statusSnapshot.summarizeShadowPipelineResult({
      ok: true,
      debug: { warnings: [], runtimePath: "legacy_runtime" }
    }),
    proactiveHostModule: proactiveHost,
    supportPolicyModule: supportPolicy,
    soloStreamModule: soloStream
  });

  assert.ok(diagnostics.proactiveHost);
  assert.ok(diagnostics.soloStream);
  assert.ok(diagnostics.supportAck);
  assert.ok(diagnostics.shadowPipeline);
  assert.equal(diagnostics.shadowPipeline.hasWarnings, false);
  assert.equal(diagnostics.supportAck.audienceBand, "small");
});

console.log("\n---- STATUS SNAPSHOT CONTRACT SUMMARY ----\n");

if (process.exitCode) {
  process.exit(process.exitCode);
}
