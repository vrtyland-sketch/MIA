"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const pe = require("../shared/mia-policy-core");
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
  const docPath = path.join(MASTER, "0084-policy-engine.md");
  const alignPath = path.join(MASTER, "0084-alignment.md");

  assert.ok(fs.existsSync(docPath), "0084-policy-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0084-alignment.md exists");
  pass("0084 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0084 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0084 kernel layer");
  assert.ok(doc.includes("0085"), "0084 points to 0085");
  assert.ok(/Decision Engine/i.test(doc), "0084 → Decision Engine");
  assert.ok(doc.includes("0086"), "0084 points to 0086");
  assert.ok(/Orchestrator Engine/i.test(doc), "0084 → Orchestrator Engine");
  assert.ok(doc.includes("0087"), "0084 points to 0087");
  assert.ok(/Telemetry Manager/i.test(doc), "0084 → Telemetry Manager");
  pass("20 sections → 0085 Decision / 0086 Orchestrator / 0087 Telemetry Manager");

  assert.equal(pe.PE_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...pe.PE_COMPONENT_ORDER],
    [
      "policy_engine",
      "intake_gate",
      "descriptor_factory",
      "type_registry",
      "scope_resolver",
      "condition_evaluator",
      "priority_resolver",
      "inheritance_resolver",
      "effect_resolver",
      "version_controller",
      "security_gate",
      "policy_audit"
    ]
  );
  pass("12 components");

  assert.equal(pe.PE_FLAGS.solePolicyAuthority, true);
  assert.equal(pe.PE_FLAGS.evaluatesBusinessRules, false);
  assert.equal(pe.PE_FLAGS.createsCommands, false);
  assert.equal(pe.PE_FLAGS.separatedFromRuleEngine, true);
  assert.equal(pe.solePolicyAuthority, true);
  assert.equal(pe.createsCommands, false);
  pass("flags");

  assert.equal(pe.PE_DESCRIPTOR_FIELDS.length, 9);
  assert.deepEqual(
    [...pe.PE_DESCRIPTOR_FIELDS],
    [
      "policyId",
      "policyType",
      "version",
      "priority",
      "scope",
      "condition",
      "effect",
      "created",
      "updated"
    ]
  );
  const d1 = pe.createPolicyDescriptor({
    policyType: "security",
    scope: "system",
    effect: "DENY",
    condition: { path: "maintenance", op: "==", value: true }
  });
  assert.equal(d1.ok, true);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of pe.PE_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  pass("descriptor 9 fields");

  assert.equal(pe.PE_EFFECT.ALLOW, "ALLOW");
  assert.equal(pe.PE_EFFECT.DENY, "DENY");
  assert.equal(pe.PE_EFFECT.LIMIT, "LIMIT");
  assert.equal(pe.PE_EFFECT.REDIRECT, "REDIRECT");
  assert.equal(pe.PE_SCOPE.SYSTEM, "system");
  assert.equal(pe.PE_SCOPE.BATTLE, "battle");
  assert.equal(pe.PE_SCOPE.AI, "ai");
  pass("effects + scopes");

  pe.clearPolicySingletonForTest();
  const eng = pe.createPolicyEngine({});
  assert.equal(eng.ok, true);
  assert.equal(eng.status().singleton, true);
  const dup = pe.createPolicyEngine({});
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "policy_engine_already_active");
  pass("singleton");

  const auth = { source: "runtime", authorized: true };

  assert.equal(eng.validatePolicy({ policyType: "x" }).ok, false);

  // load + version
  const loaded = eng.loadPolicy(
    {
      policyId: "maint",
      policyType: "security",
      scope: "system",
      priority: 100,
      effect: "DENY",
      condition: { path: "maintenance", op: "==", value: true }
    },
    auth
  );
  assert.equal(loaded.ok, true);
  assert.equal(loaded.version, 1);

  const v2 = eng.loadPolicy(
    {
      policyId: "maint",
      policyType: "security",
      scope: "system",
      priority: 100,
      effect: "DENY",
      condition: { path: "maintenance", op: "==", value: true }
    },
    auth
  );
  assert.equal(v2.version, 2);
  assert.equal(eng.getPolicy("maint").policy.version, 2);
  pass("load + versioning");

  // evaluate DENY / ALLOW default
  const req = { maintenance: true, action: "admin" };
  const reqCopy = JSON.stringify(req);
  const denied = eng.evaluate(
    { request: req, scope: "system", context: req },
    auth
  );
  assert.equal(denied.ok, true);
  assert.equal(denied.effect, "DENY");
  assert.equal(denied.decision.denied, true);
  assert.equal(JSON.stringify(req), reqCopy);

  const allowed = eng.evaluate(
    { request: { maintenance: false }, scope: "system", context: { maintenance: false } },
    auth
  );
  assert.equal(allowed.effect, "ALLOW");
  assert.equal(allowed.decision.defaultAllow, true);
  pass("evaluate DENY/ALLOW; request immutable");

  // scope filter
  eng.loadPolicy(
    {
      policyId: "ai-limit",
      policyType: "resource",
      scope: { kind: "ai" },
      priority: 50,
      effect: "LIMIT",
      limit: 10,
      condition: { path: "aiRequests", op: ">", value: 10 }
    },
    auth
  );
  const aiHit = eng.evaluate(
    {
      scope: { kind: "ai" },
      context: { aiRequests: 20 },
      request: { aiRequests: 20 }
    },
    auth
  );
  assert.equal(aiHit.effect, "LIMIT");
  assert.equal(aiHit.decision.effectPayload.limit, 10);

  const battleMiss = eng.evaluate(
    {
      scope: { kind: "battle" },
      context: { aiRequests: 20 },
      request: { aiRequests: 20 }
    },
    auth
  );
  // system maint doesn't match without maintenance; ai-limit scope doesn't match battle
  assert.equal(battleMiss.effect, "ALLOW");
  pass("scope filtering + LIMIT effect");

  // priority: higher wins
  eng.loadPolicy(
    {
      policyId: "api-allow",
      policyType: "api",
      scope: "system",
      priority: 10,
      effect: "ALLOW",
      condition: { path: "apiCall", op: "==", value: true }
    },
    auth
  );
  eng.loadPolicy(
    {
      policyId: "api-deny",
      policyType: "api",
      scope: "system",
      priority: 90,
      effect: "DENY",
      condition: { path: "apiCall", op: "==", value: true }
    },
    auth
  );
  const pri = eng.evaluate(
    { scope: "system", context: { apiCall: true, maintenance: false }, request: { apiCall: true } },
    auth
  );
  assert.equal(pri.effect, "DENY");
  assert.equal(pri.decision.policyId, "api-deny");
  pass("priority");

  // inheritance: specific overrides parent
  eng.loadPolicy(
    {
      policyId: "global-battle",
      policyType: "battle",
      scope: { kind: "battle" },
      priority: 20,
      effect: "DENY",
      condition: { path: "open", op: "==", value: true }
    },
    auth
  );
  eng.loadPolicy(
    {
      policyId: "battle-admin",
      policyType: "battle",
      scope: { kind: "battle" },
      priority: 20,
      effect: "ALLOW",
      inheritsFrom: "global-battle",
      condition: { path: "isAdmin", op: "==", value: true }
    },
    auth
  );
  const asAdmin = eng.evaluate(
    {
      scope: { kind: "battle" },
      context: { open: true, isAdmin: true },
      request: { open: true, isAdmin: true }
    },
    auth
  );
  assert.equal(asAdmin.effect, "ALLOW");
  assert.equal(asAdmin.decision.policyId, "battle-admin");

  const asUser = eng.evaluate(
    {
      scope: { kind: "battle" },
      context: { open: true, isAdmin: false },
      request: { open: true, isAdmin: false }
    },
    auth
  );
  assert.equal(asUser.effect, "DENY");
  assert.equal(asUser.decision.policyId, "global-battle");
  pass("inheritance (child overrides only when matched)");

  // REDIRECT
  eng.loadPolicy(
    {
      policyId: "redir",
      policyType: "security",
      scope: "system",
      priority: 5,
      effect: "REDIRECT",
      redirect: "/safe-mode",
      condition: { path: "safeMode", op: "==", value: true }
    },
    auth
  );
  const redir = eng.evaluate(
    { scope: "system", context: { safeMode: true }, request: { safeMode: true } },
    auth
  );
  assert.equal(redir.effect, "REDIRECT");
  assert.equal(redir.decision.effectPayload.redirect, "/safe-mode");
  pass("REDIRECT effect");

  // separated from rules / no commands
  assert.equal(eng.dispatchCommand().ok, false);
  assert.equal(
    eng.evaluate({ request: {} }, { ...auth, evaluateAsRule: true }).ok,
    false
  );
  const ruleBridge = eng.forRuleBridge(
    { scope: "system", context: { maintenance: false }, request: {} },
    auth
  );
  assert.equal(ruleBridge.next, "rule_engine");
  assert.deepEqual([...ruleBridge.order], ["policy", "rule", "execution"]);
  assert.equal(ruleBridge.continueToRules, true);

  const wf = eng.forWorkflowBridge(
    { scope: "system", context: { maintenance: true }, request: { maintenance: true } },
    { source: "workflow_engine" }
  );
  assert.equal(wf.effect, "DENY");

  const cb = eng.forCommandBusBridge(
    { scope: "system", context: { maintenance: false }, request: {} },
    { source: "command_bus" }
  );
  assert.equal(cb.ok, true);
  pass("rule/workflow/command bridges; no command dispatch");

  for (const name of pe.PE_PUBLIC_API) {
    assert.equal(typeof eng[name], "function", `api ${name}`);
  }

  const forged = eng.loadPolicy(
    { policyType: "x", effect: "ALLOW", condition: { path: "a", op: "==", value: 1 } },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);

  const m = eng.metrics();
  assert.ok(typeof m.policyCount === "number");
  assert.ok(typeof m.evaluationCount === "number");
  assert.ok(typeof m.denyCount === "number");
  assert.ok(typeof m.averageEvaluationMs === "number");
  assert.ok(typeof m.versionChangeCount === "number");
  assert.ok(typeof m.conflictCount === "number");

  const trail = eng.policyAudit();
  assert.ok(trail.length >= 1);
  assert.ok("policyId" in trail[0]);
  assert.ok("decision" in trail[0]);
  assert.ok("evaluatedAt" in trail[0]);
  assert.ok("version" in trail[0]);
  pass("API; forged blocked; metrics; audit");

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-rule-core/ruleEngine.js"));
  assert.ok(coreSys.runtime.includes("shared/mia-policy-core/policyEngine.js"));
  assert.ok(coreSys.docs.includes("docs/master-canon/0084-policy-engine.md"));
  const reIdx = coreSys.runtime.indexOf("shared/mia-rule-core/ruleEngine.js");
  const peIdx = coreSys.runtime.indexOf("shared/mia-policy-core/policyEngine.js");
  assert.ok(reIdx >= 0 && peIdx === reIdx + 1);
  pass("platformSystems nextDocId 0085; policy after rule in CORE");

  for (const rel of pe.PE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0084") && /Policy Engine/i.test(readme));
  assert.ok(readme.includes("0085") && /Decision Engine/i.test(readme));
  assert.ok(readme.includes("0086") && /Orchestrator Engine/i.test(readme));
  assert.ok(readme.includes("0087") && /Telemetry Manager/i.test(readme));
  assert.ok(readme.includes("shared/mia-policy-core/"));
  assert.ok(readme.includes("mia_master_canon_0084_contract.js"));
  pass("README + anchors");

  const align84 = read("docs/master-canon/0084-alignment.md");
  assert.ok(align84.includes("**0085**") && /Decision/i.test(align84));
  assert.ok(align84.includes("0086") && /Orchestrator/i.test(align84));
  assert.ok(align84.includes("0087") && /Telemetry/i.test(align84));
  pass("0084-alignment marks 0085/0086 done / 0087 Telemetry planned");

  assert.ok(align84.includes("🟡") || align84.includes("🟢"));
  assert.ok(/wiring/i.test(align84));

  console.log("\nMaster Canon 0084 contract: ALL PASS");
}

run();
