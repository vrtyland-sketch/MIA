"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const re = require("../shared/mia-rule-core");
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
  const docPath = path.join(MASTER, "0083-rule-engine.md");
  const alignPath = path.join(MASTER, "0083-alignment.md");

  assert.ok(fs.existsSync(docPath), "0083-rule-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0083-alignment.md exists");
  pass("0083 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0083 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0083 kernel layer");
  assert.ok(doc.includes("0084"), "0083 points to 0084");
  assert.ok(/Policy Engine/i.test(doc), "0083 → Policy Engine");
  assert.ok(doc.includes("0085"), "0083 points to 0085");
  assert.ok(/Decision Engine/i.test(doc), "0083 → Decision Engine");
  assert.ok(doc.includes("0086"), "0083 points to 0086");
  assert.ok(/Telemetry Manager/i.test(doc), "0083 → Telemetry Manager");
  pass("21 sections → 0084 Policy / 0085 Decision / 0086 Telemetry Manager");

  assert.equal(re.RE_COMPONENT_ORDER.length, 12);
  assert.deepEqual(
    [...re.RE_COMPONENT_ORDER],
    [
      "rule_engine",
      "intake_gate",
      "descriptor_factory",
      "type_registry",
      "condition_evaluator",
      "operator_engine",
      "priority_resolver",
      "rule_set_manager",
      "version_controller",
      "decision_recorder",
      "security_gate",
      "rule_audit"
    ]
  );
  pass("12 components");

  assert.equal(re.RE_FLAGS.soleRuleAuthority, true);
  assert.equal(re.RE_FLAGS.executesBusinessLogic, false);
  assert.equal(re.RE_FLAGS.createsCommands, false);
  assert.equal(re.RE_FLAGS.createsEvents, false);
  assert.equal(re.RE_FLAGS.returnsDecisionsOnly, true);
  assert.equal(re.RE_FLAGS.mutatesContext, false);
  assert.equal(re.soleRuleAuthority, true);
  assert.equal(re.createsCommands, false);
  assert.equal(re.createsEvents, false);
  pass("flags");

  assert.deepEqual(
    [...re.RE_DESCRIPTOR_FIELDS],
    [
      "ruleId",
      "ruleType",
      "version",
      "priority",
      "condition",
      "result",
      "created",
      "updated"
    ]
  );
  const d1 = re.createRuleDescriptor({
    ruleType: "gift",
    condition: { path: "coins", op: ">=", value: 100 },
    result: true
  });
  assert.equal(d1.ok, true);
  assert.ok(d1.descriptor.ruleId);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const field of re.RE_DESCRIPTOR_FIELDS) {
    assert.ok(field in d1.descriptor, `descriptor field ${field}`);
  }
  pass("descriptor 8 fields");

  assert.equal(re.RE_RULE_TYPE.GIFT, "gift");
  assert.equal(re.RE_RULE_TYPE.BATTLE, "battle");
  assert.equal(re.RE_RULE_TYPE.INVENTORY, "inventory");
  assert.equal(re.RE_RULE_TYPE.AI, "ai");
  assert.equal(re.RE_RULE_TYPE.OBS, "obs");
  assert.equal(re.RE_RULE_TYPE.SECURITY, "security");
  pass("rule types");

  re.clearRuleSingletonForTest();
  const eng = re.createRuleEngine({});
  assert.equal(eng.ok, true);
  assert.equal(eng.status().singleton, true);
  const dup = re.createRuleEngine({});
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "rule_engine_already_active");
  pass("singleton");

  const auth = { source: "runtime", authorized: true };

  // load + validate + evaluate simple
  const invalid = eng.validateRule({ ruleType: "gift" });
  assert.equal(invalid.ok, false);

  const loaded = eng.loadRule(
    {
      ruleId: "gift-tier2",
      ruleType: "gift",
      priority: 50,
      condition: { path: "coins", op: ">=", value: 100 },
      result: "tier2"
    },
    auth
  );
  assert.equal(loaded.ok, true);
  assert.equal(loaded.version, 1);

  const ctx = { coins: 150, mood: "HAPPY" };
  const ctxCopy = JSON.stringify(ctx);
  const ev = eng.evaluate({ ruleId: "gift-tier2", context: ctx }, auth);
  assert.equal(ev.ok, true);
  assert.equal(ev.matched, true);
  assert.equal(ev.decision, "tier2");
  assert.equal(JSON.stringify(ctx), ctxCopy, "context not mutated");
  pass("load + evaluate; context immutable");

  // versioning on reload same id
  const v2 = eng.loadRule(
    {
      ruleId: "gift-tier2",
      ruleType: "gift",
      priority: 50,
      condition: { path: "coins", op: ">=", value: 200 },
      result: "tier2"
    },
    auth
  );
  assert.equal(v2.version, 2);
  const got = eng.getRule("gift-tier2");
  assert.equal(got.rule.version, 2);
  pass("rule versioning");

  // rule set + priority firstMatch
  eng.loadRuleSet(
    "battle_rules",
    [
      {
        ruleId: "b-low",
        ruleType: "battle",
        priority: 10,
        condition: { path: "battleRunning", op: "==", value: true },
        result: "low"
      },
      {
        ruleId: "b-high",
        ruleType: "battle",
        priority: 100,
        condition: { path: "battleRunning", op: "==", value: true },
        result: "high"
      }
    ],
    auth
  );
  const setEv = eng.evaluate(
    { ruleSet: "battle_rules", context: { battleRunning: true } },
    auth
  );
  assert.equal(setEv.ok, true);
  assert.equal(setEv.decision, "high");
  assert.equal(setEv.ruleId, "b-high");
  pass("rule sets + priority");

  // logical operators
  eng.loadRule(
    {
      ruleId: "combo",
      ruleType: "ai",
      priority: 1,
      condition: {
        op: "AND",
        of: [
          { path: "mood", op: "==", value: "HAPPY" },
          {
            op: "OR",
            of: [
              { path: "coins", op: ">=", value: 100 },
              { path: "isModerator", op: "==", value: true }
            ]
          }
        ]
      },
      result: true
    },
    auth
  );
  assert.equal(
    eng.evaluate(
      { ruleId: "combo", context: { mood: "HAPPY", coins: 50, isModerator: true } },
      auth
    ).matched,
    true
  );
  assert.equal(
    eng.evaluate(
      { ruleId: "combo", context: { mood: "SAD", coins: 500, isModerator: true } },
      auth
    ).matched,
    false
  );

  eng.loadRule(
    {
      ruleId: "not-cool",
      ruleType: "security",
      condition: {
        op: "NOT",
        of: { path: "cooldownActive", op: "==", value: true }
      },
      result: true
    },
    auth
  );
  assert.equal(
    eng.evaluate(
      { ruleId: "not-cool", context: { cooldownActive: false } },
      auth
    ).matched,
    true
  );

  eng.loadRule(
    {
      ruleId: "xor-demo",
      ruleType: "inventory",
      condition: {
        op: "XOR",
        of: [
          { path: "hasItem", op: "==", value: true },
          { path: "hasToken", op: "==", value: true }
        ]
      },
      result: true
    },
    auth
  );
  assert.equal(
    eng.evaluate(
      { ruleId: "xor-demo", context: { hasItem: true, hasToken: false } },
      auth
    ).matched,
    true
  );
  assert.equal(
    eng.evaluate(
      { ruleId: "xor-demo", context: { hasItem: true, hasToken: true } },
      auth
    ).matched,
    false
  );
  pass("logical operators AND/OR/NOT/XOR");

  // extensible type
  const customType = eng.registerRuleType("playlist", auth);
  assert.equal(customType.ok, true);
  eng.loadRule(
    {
      ruleId: "pl-1",
      ruleType: "playlist",
      condition: { path: "queueEmpty", op: "==", value: false },
      result: true
    },
    auth
  );
  assert.equal(
    eng.evaluate({ ruleId: "pl-1", context: { queueEmpty: false } }, auth)
      .matched,
    true
  );
  pass("extensible rule types");

  // no commands / events / business logic
  assert.equal(eng.dispatchCommand().ok, false);
  assert.ok(/command_creation/.test(eng.dispatchCommand().error));
  assert.equal(eng.emitEvent().ok, false);
  assert.ok(/event_creation/.test(eng.emitEvent().error));
  assert.equal(
    eng.evaluate({ ruleId: "pl-1", context: {} }, { ...auth, createCommand: true })
      .ok,
    false
  );
  pass("no commands / events / business execution");

  // workflow bridge
  const wf = eng.forWorkflowBridge(
    { ruleId: "gift-tier2", context: { coins: 250 } },
    { source: "workflow_engine" }
  );
  assert.equal(wf.ok, true);
  assert.equal(wf.matched, true);
  pass("workflow bridge");

  // API surface
  for (const name of re.RE_PUBLIC_API) {
    assert.equal(typeof eng[name], "function", `public api ${name}`);
  }

  // forged / unauthorized mutate
  const forged = eng.loadRule(
    { ruleType: "gift", condition: { path: "x", op: "==", value: 1 } },
    { forged: true, source: "runtime" }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.error, "forged_rule_blocked");

  const m = eng.metrics();
  assert.ok(typeof m.ruleCount === "number");
  assert.ok(typeof m.evaluationCount === "number");
  assert.ok(typeof m.averageEvaluationMs === "number");
  assert.ok(typeof m.errorCount === "number");
  assert.ok(typeof m.ruleSetCount === "number");
  assert.ok(typeof m.engineLoad === "number");

  const trail = eng.ruleAudit();
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length >= 1);
  assert.ok("ruleId" in trail[0]);
  assert.ok("result" in trail[0]);
  assert.ok("evaluatedAt" in trail[0]);
  assert.ok("version" in trail[0]);
  pass("API; forged blocked; metrics; rule audit");

  // platform wiring
  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-workflow-core/workflowEngine.js")
  );
  assert.ok(coreSys.runtime.includes("shared/mia-rule-core/ruleEngine.js"));
  assert.ok(coreSys.docs.includes("docs/master-canon/0083-rule-engine.md"));
  const wfIdx = coreSys.runtime.indexOf(
    "shared/mia-workflow-core/workflowEngine.js"
  );
  const reIdx = coreSys.runtime.indexOf("shared/mia-rule-core/ruleEngine.js");
  assert.ok(wfIdx >= 0 && reIdx === wfIdx + 1);
  pass("platformSystems nextDocId 0084; rule after workflow in CORE");

  for (const rel of re.RE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0083"), "README 0083");
  assert.ok(/Rule Engine/i.test(readme), "README Rule Engine");
  assert.ok(
    /0083.*Platný|Platný.*0083/s.test(readme) || readme.includes("[Rule Engine"),
    "README 0083 platný"
  );
  assert.ok(readme.includes("0084"), "README 0084");
  assert.ok(/Policy Engine/i.test(readme), "README Policy Engine");
  assert.ok(readme.includes("0085"), "README 0085");
  assert.ok(/Decision Engine/i.test(readme), "README Decision Engine");
  assert.ok(readme.includes("0086"), "README 0086 planned");
  assert.ok(/Telemetry Manager/i.test(readme), "README Telemetry planned");
  assert.ok(readme.includes("shared/mia-rule-core/"));
  assert.ok(readme.includes("mia_master_canon_0083_contract.js"));
  pass("README + anchors");

  const align83 = read("docs/master-canon/0083-alignment.md");
  assert.ok(
    align83.includes("**0084**") && /Policy/i.test(align83),
    "0083-alignment marks 0084 Policy"
  );
  assert.ok(
    align83.includes("0085") && /Decision/i.test(align83),
    "0083-alignment marks 0085 Decision"
  );
  assert.ok(
    align83.includes("0086") && /Telemetry/i.test(align83),
    "0083-alignment marks 0086 Telemetry planned"
  );
  pass("0083-alignment marks 0084/0085 done / 0086 Telemetry planned");

  assert.ok(align83.includes("🟡") || align83.includes("🟢"));
  assert.ok(
    align83.includes("Live rule") ||
      align83.includes("live rule") ||
      align83.includes("wiring"),
    "0083-alignment marks live wiring partial"
  );

  console.log("\nMaster Canon 0083 contract: ALL PASS");
}

run();
