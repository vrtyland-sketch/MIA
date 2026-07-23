"use strict";

const assert = require("assert");
const orchestrator = require("../scripts/MIA_ECOSYSTEM_ORCHESTRATOR");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const registry = orchestrator.getAgentRegistry({});
  assert.equal(registry.core.id, "core");
  assert.equal(registry.mia.id, "mia");
  assert.equal(registry.kojnozout.id, "kojnozout");
  assert.equal(registry.assistant.id, "assistant");
  pass("agent registry exposes four ecosystem agents");

  const supportPlan = orchestrator.planEventRouting({
    event: { eventType: "GIFT", route: "support" },
    decisionResult: {
      speaker: "kojnozout",
      actorRoles: {
        primary: "kojnozout",
        companion: "mia",
        allowCompanion: true,
        companionReason: "FULL_BOWL"
      }
    },
    kojnozoutState: { bowlPercent: 96 },
    runtimeConfig: { ecosystem: { enabled: true } }
  });

  assert.equal(supportPlan.domain, "SUPPORT");
  assert.equal(supportPlan.primary, "kojnozout");
  assert.equal(supportPlan.preserveSupportPolicy, true);
  pass("support domain preserves existing gift lane policy");

  const hostPlan = orchestrator.planEventRouting({
    event: { eventType: "COMMENT", route: "community", message: "ahoj všichni" },
    decisionResult: { speaker: "kojnozout", actorRoles: {} },
    outputState: { worldMode: "nejsem_tu" },
    kojnozoutState: { bowlPercent: 20, hunger: 30 },
    runtimeConfig: { ecosystem: { enabled: true } }
  });

  assert.equal(hostPlan.domain, "STREAM_HOST");
  assert.equal(hostPlan.primary, "mia");
  assert.equal(hostPlan.hostMode, true);
  pass("SPINAK_NEJSEM_TU host mode routes community to MIA");

  const carePlan = orchestrator.planEventRouting({
    event: {
      eventType: "COMMENT",
      route: "community",
      message: "kojnožroute jsi nemocný?"
    },
    decisionResult: { speaker: "mia", actorRoles: {} },
    kojnozoutState: { affliction: "sick", hunger: 80 },
    runtimeConfig: { ecosystem: { enabled: true } }
  });

  assert.equal(carePlan.domain, "CARE");
  assert.equal(carePlan.primary, "kojnozout");
  pass("CARE domain prioritizes Kojnožrout on direct pet messages");

  const merged = orchestrator.applyOrchestrationToDecision(
    { speaker: "kojnozout", meta: {}, actorRoles: {} },
    hostPlan
  );

  assert.equal(merged.speaker, "mia");
  assert.equal(merged.meta.ecosystem.domain, "STREAM_HOST");
  pass("applyOrchestrationToDecision updates speaker outside support domain");

  const state = orchestrator.createEcosystemState();
  orchestrator.recordTurn(
    state,
    hostPlan,
    {
      overlayPayload: { owner: "mia" },
      companionOverlayPayload: { owner: "kojnozout" }
    }
  );

  assert.equal(state.stats.plans, 1);
  assert.equal(state.turnHistory.length, 1);
  assert.equal(state.turnHistory[0].companionSpoke, true);
  pass("recordTurn tracks multi-agent turn sequence");

  const snapshot = orchestrator.getEcosystemSnapshot(state, {
    ecosystem: { enabled: true, orchestratorLabel: "CORE" }
  });

  assert.equal(snapshot.agents.length, 4);
  assert.equal(snapshot.recentTurns.length, 1);
  pass("getEcosystemSnapshot exposes multi-agent diagnostics");

  console.log("\n---- ECOSYSTEM ORCHESTRATOR CONTRACT ----");
  console.log("passed");
}

run();
