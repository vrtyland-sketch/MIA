"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const kde = require("../shared/mia-kernel-decision-core");
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
  const docPath = path.join(MASTER, "0085-decision-engine.md");
  const alignPath = path.join(MASTER, "0085-alignment.md");

  assert.ok(fs.existsSync(docPath), "0085-decision-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0085-alignment.md exists");
  pass("0085 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0085 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0085 kernel layer");
  assert.ok(doc.includes("0086"), "0085 points to 0086");
  assert.ok(/Orchestrator Engine/i.test(doc), "0085 → Orchestrator Engine");
  assert.ok(doc.includes("0087"), "0085 points to 0087");
  assert.ok(/Telemetry Manager/i.test(doc), "0085 → Telemetry Manager");
  assert.ok(/0028/i.test(doc), "0085 distinguishes 0028");
  pass("21 sections → 0086 Orchestrator / 0087 Telemetry Manager");

  assert.equal(kde.KDE_COMPONENT_ORDER.length, 12);
  pass("12 components");

  assert.equal(kde.KDE_FLAGS.soleDecisionAuthority, true);
  assert.equal(kde.KDE_FLAGS.executesCommands, false);
  assert.equal(kde.KDE_FLAGS.createsEvents, false);
  assert.equal(kde.KDE_FLAGS.executesBusinessLogic, false);
  assert.equal(kde.KDE_FLAGS.aiMayOnlySuggest, true);
  assert.equal(kde.KDE_FLAGS.deterministic, true);
  assert.equal(kde.KDE_FLAGS.distinctFromAiDecisionEngine0028, true);
  pass("flags");

  assert.deepEqual(
    [...kde.KDE_DESCRIPTOR_FIELDS],
    [
      "decisionId",
      "decisionType",
      "context",
      "priority",
      "source",
      "result",
      "timestamp",
      "correlationId"
    ]
  );
  const d1 = kde.createDecisionDescriptor({
    decisionType: "tier",
    priority: "HIGH",
    source: "rule_engine",
    result: "tier2",
    context: { coins: 150 }
  });
  assert.equal(d1.ok, true);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const f of kde.KDE_DESCRIPTOR_FIELDS) {
    assert.ok(f in d1.descriptor, f);
  }
  pass("descriptor 8 fields");

  assert.equal(kde.KDE_SOURCE.RULE, "rule_engine");
  assert.equal(kde.KDE_SOURCE.POLICY, "policy_engine");
  assert.equal(kde.KDE_SOURCE.AI, "ai");
  assert.equal(kde.KDE_PRIORITY.CRITICAL, "CRITICAL");
  assert.equal(kde.KDE_STRATEGY.FIRST_MATCH, "firstMatch");
  assert.equal(kde.KDE_STRATEGY.WEIGHTED, "weighted");
  pass("sources / priorities / strategies");

  kde.clearKernelDecisionSingletonForTest();
  const eng = kde.createKernelDecisionEngine({});
  assert.equal(eng.ok, true);
  assert.equal(eng.status().singleton, true);
  const dup = kde.createKernelDecisionEngine({});
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "decision_engine_already_active");
  pass("singleton");

  const auth = { source: "runtime", authorized: true, nowMs: 1000 };

  // conflict: Rule TRUE vs Policy DENY → DENY
  const conflict = eng.evaluate(
    {
      decisionType: "battle_gate",
      ruleResult: true,
      policyResult: { effect: "DENY" },
      context: { battle: "open" }
    },
    auth
  );
  assert.equal(conflict.ok, true);
  assert.equal(conflict.conflict, true);
  assert.equal(conflict.decision.result.effect || conflict.decision.result, "DENY");
  // result might be object {effect:DENY}
  const denyEffect =
    conflict.decision.result === "DENY" ||
    (conflict.decision.result && conflict.decision.result.effect === "DENY");
  assert.equal(denyEffect, true);
  pass("conflict resolution Policy DENY > Rule");

  // priority highest
  const pri = eng.evaluate(
    {
      decisionType: "action",
      strategy: "highestPriority",
      inputs: [
        {
          source: "runtime",
          priority: "LOW",
          result: "skip"
        },
        {
          source: "state_manager",
          priority: "CRITICAL",
          result: "play_tier2"
        }
      ],
      context: { bowl: 100 }
    },
    auth
  );
  assert.equal(pri.ok, true);
  assert.equal(pri.decision.result, "play_tier2");
  assert.equal(pri.decision.priority, "CRITICAL");
  pass("highest priority strategy");

  // majority
  const maj = eng.evaluate(
    {
      decisionType: "vote",
      strategy: "majority",
      inputs: [
        { source: "rule_engine", priority: "NORMAL", result: "A" },
        { source: "runtime", priority: "NORMAL", result: "A" },
        { source: "workflow", priority: "NORMAL", result: "B" }
      ],
      context: {}
    },
    auth
  );
  assert.equal(maj.decision.result, "A");
  pass("majority strategy");

  // weighted
  const w = eng.evaluate(
    {
      decisionType: "weighted",
      strategy: "weighted",
      inputs: [
        { source: "ai", priority: "LOW", result: "suggest_x", weight: 0.2 },
        { source: "rule_engine", priority: "HIGH", result: "do_y", weight: 0.9 }
      ],
      context: {}
    },
    auth
  );
  assert.equal(w.decision.result, "do_y");
  pass("weighted strategy");

  // custom
  const custom = eng.evaluate(
    {
      decisionType: "custom",
      strategy: "custom",
      inputs: [
        { source: "runtime", priority: "NORMAL", result: 1 },
        { source: "workflow", priority: "NORMAL", result: 2 }
      ],
      customResolver: (inputs) => ({
        ok: true,
        chosen: inputs.find((i) => i.result === 2)
      }),
      context: {}
    },
    auth
  );
  assert.equal(custom.decision.result, 2);
  pass("custom strategy");

  // AI alone rejected; AI suggestion ok
  const aiAlone = eng.evaluate(
    { decisionType: "x", aiSuggestion: "hello", aiDecidesAlone: true, context: {} },
    auth
  );
  assert.equal(aiAlone.ok, false);
  assert.ok(/ai_alone/.test(aiAlone.error));

  const aiSug = eng.evaluate(
    {
      decisionType: "mood",
      aiSuggestion: "happy",
      ruleResult: "keep",
      strategy: "highestPriority",
      rulePriority: "HIGH",
      aiPriority: "LOW",
      context: { mood: "neutral" }
    },
    auth
  );
  assert.equal(aiSug.ok, true);
  assert.equal(aiSug.decision.result, "keep");
  pass("AI only suggests");

  // determinism
  const ctx = { coins: 100, battle: false };
  const ctxCopy = JSON.stringify(ctx);
  const a = eng.evaluate(
    {
      decisionType: "tier",
      decisionId: "fixed-det-1",
      ruleResult: "tier1",
      context: ctx,
      correlationId: "c1"
    },
    { ...auth, nowMs: 5000 }
  );
  const b = eng.evaluate(
    {
      decisionType: "tier",
      decisionId: "fixed-det-1",
      ruleResult: "tier1",
      context: ctx,
      correlationId: "c1"
    },
    { ...auth, nowMs: 5000 }
  );
  assert.equal(a.decision.result, b.decision.result);
  assert.equal(a.decision.decisionId, b.decision.decisionId);
  assert.equal(JSON.stringify(ctx), ctxCopy);
  pass("determinism + context immutable");

  // compare + validate + get
  const cmp = eng.compare(
    { priority: "CRITICAL", result: "x" },
    { priority: "LOW", result: "y" },
    auth
  );
  assert.equal(cmp.higher, "a");
  assert.equal(eng.validate({ decisionType: "t" }).ok, false);
  assert.equal(eng.validate({
    decisionType: "t",
    priority: "NORMAL",
    source: "runtime",
    result: true
  }).ok, true);
  assert.equal(eng.getDecision(a.decision.decisionId).ok, true);

  for (const name of kde.KDE_PUBLIC_API) {
    assert.equal(typeof eng[name], "function", name);
  }
  assert.equal(eng.dispatchCommand().ok, false);
  assert.equal(eng.emitEvent().ok, false);
  pass("compare/validate/get/API; no commands/events");

  const forged = eng.evaluate(
    { decisionType: "x", ruleResult: true, context: {} },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);

  const m = eng.metrics();
  assert.ok(typeof m.decisionCount === "number");
  assert.ok(typeof m.conflictCount === "number");
  assert.ok(typeof m.averageEvaluationMs === "number");
  assert.ok(typeof m.strategyCount === "number");
  assert.ok(typeof m.denyCount === "number");
  assert.ok(typeof m.engineLoad === "number");

  const trail = eng.decisionAudit();
  assert.ok(trail.length >= 1);
  assert.ok("decisionId" in trail[0]);
  assert.ok("strategy" in trail[0]);
  assert.ok("finalDecision" in trail[0]);
  pass("forged blocked; metrics; audit");

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-policy-core/policyEngine.js")
  );
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-kernel-decision-core/decisionEngine.js"
    )
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0085-decision-engine.md")
  );
  const peIdx = coreSys.runtime.indexOf(
    "shared/mia-policy-core/policyEngine.js"
  );
  const kdeIdx = coreSys.runtime.indexOf(
    "shared/mia-kernel-decision-core/decisionEngine.js"
  );
  assert.ok(peIdx >= 0 && kdeIdx === peIdx + 1);
  pass("platformSystems nextDocId 0086; kernel DE after policy in CORE");

  for (const rel of kde.KDE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  // distinct from 0028
  assert.ok(pathExists("shared/mia-decision-core/decisionEngine.js"));
  pass("runtime anchors (kernel ≠ AI 0028)");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0085") && /Decision Engine/i.test(readme));
  assert.ok(readme.includes("0086") && /Orchestrator Engine/i.test(readme));
  assert.ok(readme.includes("0087") && /Telemetry Manager/i.test(readme));
  assert.ok(readme.includes("shared/mia-kernel-decision-core/"));
  assert.ok(readme.includes("mia_master_canon_0085_contract.js"));
  pass("README + anchors");

  const align85 = read("docs/master-canon/0085-alignment.md");
  assert.ok(align85.includes("**0086**") && /Orchestrator/i.test(align85));
  assert.ok(align85.includes("0087") && /Telemetry/i.test(align85));
  pass("0085-alignment marks 0086 done / 0087 Telemetry planned");

  assert.ok(align85.includes("🟡") || align85.includes("🟢"));
  assert.ok(/0028|wiring/i.test(align85));

  console.log("\nMaster Canon 0085 contract: ALL PASS");
}

run();
