"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const oe = require("../shared/mia-orchestrator-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0086-orchestrator-engine.md");
  const alignPath = path.join(MASTER, "0086-alignment.md");

  assert.ok(fs.existsSync(docPath));
  assert.ok(fs.existsSync(alignPath));
  pass("0086 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"));
  assert.ok(doc.includes("0087"));
  assert.ok(/Coordination Engine/i.test(doc));
  assert.ok(doc.includes("0088"));
  assert.ok(/Telemetry Manager/i.test(doc));
  assert.ok(/0029/i.test(doc));
  pass("21 sections → 0087 Coordination / 0088 Telemetry Manager");

  assert.equal(oe.OE_COMPONENT_ORDER.length, 12);
  pass("12 components");

  assert.equal(oe.OE_FLAGS.soleOrchestratorAuthority, true);
  assert.equal(oe.OE_FLAGS.definesWorkflow, false);
  assert.equal(oe.OE_FLAGS.handlesSagaTransactions, false);
  assert.equal(oe.OE_FLAGS.ownsServiceInternalLogic, false);
  assert.equal(oe.OE_FLAGS.coordinatesOnly, true);
  assert.equal(oe.OE_FLAGS.distinctFromActionOrchestrator0029, true);
  pass("flags");

  assert.deepEqual(
    [...oe.OE_DESCRIPTOR_FIELDS],
    [
      "orchestrationId",
      "type",
      "status",
      "services",
      "started",
      "updated",
      "priority",
      "correlationId"
    ]
  );
  const d1 = oe.createOrchestrationDescriptor({
    type: "gift_response",
    services: ["ai", "speech"]
  });
  assert.equal(d1.ok, true);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const f of oe.OE_DESCRIPTOR_FIELDS) assert.ok(f in d1.descriptor);
  pass("descriptor 8 fields");

  assert.equal(oe.validateStatusTransition("created", "running").ok, true);
  assert.equal(oe.validateStatusTransition("running", "waiting").ok, true);
  assert.equal(oe.validateStatusTransition("created", "completed").ok, false);
  pass("status FSM");

  oe.clearOrchestratorSingletonForTest();

  const invoked = [];
  const available = new Set([
    "ai",
    "speech",
    "overlay",
    "obs",
    "analytics",
    "inventory",
    "ai_fallback"
  ]);
  const serviceBridge = {
    isAvailable(id) {
      return available.has(id);
    },
    invoke({ serviceId }) {
      invoked.push(serviceId);
      if (serviceId === "ai" && failAiOnce) {
        failAiOnce = false;
        return { ok: false, error: "ai_down" };
      }
      return { ok: true, serviceId };
    }
  };
  let failAiOnce = false;

  const eng = oe.createOrchestratorEngine({ serviceBridge });
  assert.equal(eng.ok, true);
  assert.equal(eng.status().singleton, true);
  const dup = oe.createOrchestratorEngine({ serviceBridge });
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "orchestrator_engine_already_active");
  pass("singleton");

  const auth = { source: "runtime", authorized: true };

  // sequential dependencies
  invoked.length = 0;
  const seq = eng.start(
    {
      type: "response_chain",
      autoSync: true,
      services: ["ai", "speech", "overlay", "obs", "analytics"]
    },
    auth
  );
  assert.equal(seq.ok, true);
  assert.equal(seq.status, oe.OE_STATUS.COMPLETED);
  assert.deepEqual([...invoked], ["ai", "speech", "overlay", "obs", "analytics"]);
  pass("service coordination + dependencies");

  // parallel + sync
  invoked.length = 0;
  const par = eng.start(
    {
      type: "parallel_boot",
      plan: [
        { id: "ai", parallelGroup: "fan" },
        { id: "analytics", parallelGroup: "fan" },
        { id: "inventory", parallelGroup: "fan" },
        { id: "overlay", dependsOn: ["ai", "analytics", "inventory"] }
      ]
    },
    auth
  );
  assert.equal(par.waiting, true);
  assert.equal(par.status || par.orchestration.status, oe.OE_STATUS.WAITING);
  assert.ok(invoked.includes("ai"));
  assert.ok(invoked.includes("analytics"));
  assert.ok(invoked.includes("inventory"));
  assert.ok(!invoked.includes("overlay"));

  assert.equal(eng.synchronize(par.orchestration.orchestrationId, "ai", auth).waiting, true);
  assert.equal(
    eng.synchronize(par.orchestration.orchestrationId, "analytics", auth).waiting,
    true
  );
  invoked.length = 0;
  const synced = eng.synchronize(
    par.orchestration.orchestrationId,
    "inventory",
    auth
  );
  assert.equal(synced.status, oe.OE_STATUS.COMPLETED);
  assert.ok(invoked.includes("overlay"));
  pass("parallel + synchronization");

  // dynamic routing emergency
  invoked.length = 0;
  const emerg = eng.start(
    {
      type: "emergency",
      routingMode: "emergency",
      autoSync: true,
      services: ["ai", "obs", "overlay"]
    },
    auth
  );
  assert.equal(emerg.ok, true);
  assert.deepEqual([...invoked], ["obs", "overlay", "ai"]);
  pass("dynamic routing emergency");

  // failure recovery with alternative
  failAiOnce = true;
  invoked.length = 0;
  const rec = eng.start(
    {
      type: "recover",
      autoSync: true,
      plan: [
        { id: "ai", alternative: "ai_fallback" },
        { id: "speech", dependsOn: ["ai"] }
      ]
    },
    auth
  );
  assert.equal(rec.ok, true);
  assert.equal(rec.status, oe.OE_STATUS.COMPLETED);
  assert.ok(invoked.includes("ai_fallback"));
  assert.ok(invoked.includes("speech"));
  pass("failure recovery alternative");

  // abort without alternative
  const failBridge = {
    isAvailable: () => true,
    invoke({ serviceId }) {
      if (serviceId === "broken") return { ok: false, error: "down" };
      return { ok: true };
    }
  };
  oe.clearOrchestratorSingletonForTest();
  const eng2 = oe.createOrchestratorEngine({ serviceBridge: failBridge });
  const aborted = eng2.start(
    { type: "abort", autoSync: true, services: ["broken", "overlay"] },
    auth
  );
  assert.equal(aborted.status, oe.OE_STATUS.FAILED);
  pass("failure abort");

  // decision / workflow bridges; rejects
  oe.clearOrchestratorSingletonForTest();
  const eng3 = oe.createOrchestratorEngine({ serviceBridge });
  invoked.length = 0;
  const fromDec = eng3.fromDecision(
    {
      decisionType: "play",
      decisionId: "d1",
      services: ["overlay", "obs"],
      autoSync: true
    },
    { source: "decision_engine" }
  );
  assert.equal(fromDec.ok, true);
  assert.deepEqual([...invoked], ["overlay", "obs"]);

  const fromWf = eng3.fromWorkflow(
    { type: "wf", autoSync: true, services: ["analytics"] },
    { source: "workflow_engine" }
  );
  assert.equal(fromWf.ok, true);

  assert.equal(
    eng3.start({ type: "x", services: ["ai"] }, { ...auth, defineWorkflow: true }).ok,
    false
  );
  assert.equal(
    eng3.start({ type: "x", services: ["ai"] }, { ...auth, sagaTransaction: true }).ok,
    false
  );
  pass("decision/workflow bridges; role separation");

  for (const name of oe.OE_PUBLIC_API) {
    assert.equal(typeof eng3[name], "function", name);
  }

  const st = eng3.start(
    {
      type: "cancel_me",
      plan: [
        { id: "ai", parallelGroup: "g" },
        { id: "analytics", parallelGroup: "g" }
      ]
    },
    auth
  );
  assert.equal(st.waiting, true);
  const cancelled = eng3.cancel(st.orchestration.orchestrationId, auth);
  assert.equal(cancelled.status, oe.OE_STATUS.CANCELLED);

  const forged = eng3.start(
    { type: "x", services: ["ai"] },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);

  // unavailable service blocked
  const unavailable = eng3.start(
    { type: "x", services: ["missing_svc"] },
    auth
  );
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.error, "service_unavailable");
  pass("API cancel; forged; service manager availability");

  const m = eng3.metrics();
  assert.ok(typeof m.activeCount === "number");
  assert.ok(typeof m.serviceCount === "number");
  assert.ok(typeof m.parallelRunCount === "number");
  assert.ok(typeof m.errorCount === "number");
  assert.ok(typeof m.averageDurationMs === "number");
  assert.ok(typeof m.redirectCount === "number");

  const trail = eng3.orchestrationAudit();
  assert.ok(trail.length >= 1);
  assert.ok("orchestrationId" in trail[0]);
  assert.ok("correlationId" in trail[0] || trail[0].correlationId === null);
  pass("metrics + audit");

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-kernel-decision-core/decisionEngine.js"
    )
  );
  assert.ok(
    coreSys.runtime.includes("shared/mia-orchestrator-core/orchestratorEngine.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0086-orchestrator-engine.md")
  );
  const kdeIdx = coreSys.runtime.indexOf(
    "shared/mia-kernel-decision-core/decisionEngine.js"
  );
  const oeIdx = coreSys.runtime.indexOf(
    "shared/mia-orchestrator-core/orchestratorEngine.js"
  );
  assert.ok(kdeIdx >= 0 && oeIdx === kdeIdx + 1);
  pass("platformSystems nextDocId 0088; orchestrator after kernel DE");

  for (const rel of oe.OE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), rel);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0086") && /Orchestrator Engine/i.test(readme));
  assert.ok(readme.includes("0087") && /Coordination Engine/i.test(readme));
  assert.ok(readme.includes("0088") && /Telemetry Manager/i.test(readme));
  assert.ok(readme.includes("shared/mia-orchestrator-core/"));
  assert.ok(readme.includes("mia_master_canon_0086_contract.js"));
  pass("README + anchors");

  const align86done = read("docs/master-canon/0086-alignment.md");
  assert.ok(align86done.includes("**0087**") && /Coordination/i.test(align86done));
  assert.ok(align86done.includes("0088") && /Telemetry/i.test(align86done));
  pass("0086-alignment marks 0087 done / 0088 Telemetry planned");

  const align86 = read("docs/master-canon/0086-alignment.md");
  assert.ok(align86.includes("🟡") || align86.includes("🟢"));
  assert.ok(/wiring|0029/i.test(align86));

  console.log("\nMaster Canon 0086 contract: ALL PASS");
}

run();
