"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const lcm = require("../shared/mia-lifecycle-core");
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
  const docPath = path.join(MASTER, "0063-lifecycle-manager.md");
  const alignPath = path.join(MASTER, "0063-alignment.md");

  assert.ok(fs.existsSync(docPath), "0063-lifecycle-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0063-alignment.md exists");
  pass("0063 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0063 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0063 kernel layer");
  assert.ok(doc.includes("0062"), "0063 links to 0062");
  assert.ok(doc.includes("0064"), "0063 points to 0064");
  pass("0063 structure (21 sections)");

  assert.equal(lcm.LCM_COMPONENT_ORDER.length, 12);
  pass("lifecycle components");

  for (const type of [
    "service",
    "module",
    "plugin",
    "platform",
    "battle",
    "ai_agent",
    "kojnozrout",
    "overlay",
    "runtime"
  ]) {
    assert.ok(Object.values(lcm.LCM_OBJECT_TYPE).includes(type), `type ${type}`);
  }
  pass("object types");

  assert.deepEqual(
    [...lcm.LCM_DEFAULT_PHASES],
    [
      "created",
      "initialized",
      "ready",
      "active",
      "paused",
      "resumed",
      "stopping",
      "stopped",
      "destroyed",
      "failed"
    ]
  );
  pass("default phases");

  assert.equal(
    lcm.validateLifecycleTransition(
      lcm.LCM_DEFAULT_TRANSITIONS,
      lcm.LCM_PHASE.READY,
      lcm.LCM_PHASE.DESTROYED
    ).ok,
    false
  );
  assert.equal(
    lcm.validateLifecycleTransition(
      lcm.LCM_DEFAULT_TRANSITIONS,
      lcm.LCM_PHASE.ACTIVE,
      lcm.LCM_PHASE.PAUSED
    ).ok,
    true
  );
  assert.equal(
    lcm.validateLifecycleTransition(
      lcm.LCM_DEFAULT_TRANSITIONS,
      lcm.LCM_PHASE.PAUSED,
      lcm.LCM_PHASE.RESUMED
    ).ok,
    true
  );
  assert.equal(
    lcm.validateLifecycleTransition(
      lcm.LCM_DEFAULT_TRANSITIONS,
      lcm.LCM_PHASE.RESUMED,
      lcm.LCM_PHASE.ACTIVE
    ).ok,
    true
  );
  assert.equal(
    lcm.validateLifecycleTransition(
      lcm.LCM_DEFAULT_TRANSITIONS,
      lcm.LCM_PHASE.STOPPING,
      lcm.LCM_PHASE.STOPPED
    ).ok,
    true
  );
  assert.equal(
    lcm.validateLifecycleTransition(
      lcm.LCM_DEFAULT_TRANSITIONS,
      lcm.LCM_PHASE.STOPPED,
      lcm.LCM_PHASE.DESTROYED
    ).ok,
    true
  );
  assert.equal(
    lcm.validateLifecycleTransition(
      lcm.LCM_DEFAULT_TRANSITIONS,
      lcm.LCM_PHASE.FAILED,
      lcm.LCM_PHASE.READY
    ).ok,
    true
  );
  pass("strict default FSM");

  assert.equal(lcm.LCM_EVENT.LIFECYCLE_CHANGED, "LifecycleChanged");
  assert.equal(lcm.assertDirectPhaseMutationForbidden("runtime_bypass").ok, false);
  assert.equal(lcm.assertDirectPhaseMutationForbidden("runtime_bridge").ok, true);
  pass("lifecycle events and mutation guard");

  const events = [];
  lcm.clearLifecycleSingletonForTest();
  const mgr = lcm.createLifecycleManager({
    seedKernel: true,
    eventBus: {
      publish(event) {
        events.push(event);
        return { ok: true, event };
      }
    }
  });
  assert.equal(mgr.ok, true);
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleLifecycleAuthority, true);
  pass("central lifecycle manager singleton");

  const duplicateMgr = lcm.createLifecycleManager({ seedKernel: false });
  assert.equal(duplicateMgr.ok, false);
  assert.equal(duplicateMgr.error, "lifecycle_manager_already_active");
  pass("duplicate manager blocked");

  const built = lcm.createLifecycleDescriptor({
    objectId: "svc-battle",
    objectType: lcm.LCM_OBJECT_TYPE.SERVICE,
    owner: "kernel"
  });
  assert.equal(built.ok, true);
  assert.ok(built.descriptor.lifecycleId);
  assert.ok(Object.isFrozen(built.descriptor));
  for (const field of [
    "lifecycleId",
    "objectId",
    "objectType",
    "currentPhase",
    "previousPhase",
    "owner",
    "created",
    "updated",
    "destroyed"
  ]) {
    assert.ok(field in built.descriptor, `descriptor field ${field}`);
  }
  pass("lifecycle descriptor fields");

  const reg = mgr.register({
    objectId: "svc-obs",
    objectType: lcm.LCM_OBJECT_TYPE.SERVICE,
    owner: "kernel"
  });
  assert.equal(reg.ok, true);
  const lifecycleId = reg.lifecycle.lifecycleId;

  assert.equal(
    mgr.register({
      objectId: "svc-obs",
      objectType: lcm.LCM_OBJECT_TYPE.SERVICE,
      owner: "kernel"
    }).ok,
    false
  );
  pass("registration and duplicate blocking");

  const denied = mgr.transition(lifecycleId, lcm.LCM_PHASE.INITIALIZED, {
    actor: "unknown-plugin"
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "unauthorized_lifecycle_change");
  pass("authorization enforced");

  const kernel = mgr.findByObjectId("lifecycle-kernel");
  assert.ok(kernel);
  assert.equal(kernel.protected, true);
  assert.equal(
    mgr.transition(kernel.lifecycleId, lcm.LCM_PHASE.STOPPING, {
      actor: "unknown-plugin"
    }).ok,
    false
  );
  assert.equal(
    mgr.transition(kernel.lifecycleId, lcm.LCM_PHASE.STOPPING, {
      actor: "operator"
    }).ok,
    false
  );
  pass("protected kernel objects");

  const initFail = mgr.initialize(lifecycleId, {
    actor: "kernel",
    validationFailed: true
  });
  assert.equal(initFail.ok, false);
  assert.equal(mgr.get(lifecycleId).currentPhase, lcm.LCM_PHASE.FAILED);
  pass("initialize validation failure → FAILED");

  const recovered = mgr.recover(lifecycleId, {
    actor: "recovery-manager",
    reason: "contract_recovery"
  });
  assert.equal(recovered.ok, true);
  assert.equal(mgr.get(lifecycleId).currentPhase, lcm.LCM_PHASE.ACTIVE);
  pass("recover FAILED → READY → ACTIVE");

  const svc2 = mgr.register({
    objectId: "svc-memory",
    objectType: lcm.LCM_OBJECT_TYPE.SERVICE,
    owner: "kernel"
  });
  assert.equal(svc2.ok, true);
  assert.equal(
    mgr.initialize(svc2.lifecycle.lifecycleId, { actor: "kernel" }).ok,
    true
  );
  assert.equal(mgr.get(svc2.lifecycle.lifecycleId).currentPhase, lcm.LCM_PHASE.READY);
  assert.equal(
    mgr.activate(svc2.lifecycle.lifecycleId, { actor: "kernel" }).ok,
    true
  );
  pass("initialize flow to READY then ACTIVE");

  const paused = mgr.pause(svc2.lifecycle.lifecycleId, { actor: "operator" });
  assert.equal(paused.ok, true);
  assert.equal(mgr.get(svc2.lifecycle.lifecycleId).currentPhase, lcm.LCM_PHASE.PAUSED);
  const resumed = mgr.resume(svc2.lifecycle.lifecycleId, { actor: "operator" });
  assert.equal(resumed.ok, true);
  assert.equal(mgr.get(svc2.lifecycle.lifecycleId).currentPhase, lcm.LCM_PHASE.ACTIVE);
  pass("pause → resume → active");

  assert.equal(
    mgr.destroy(svc2.lifecycle.lifecycleId, { actor: "operator" }).ok,
    false
  );
  const stopped = mgr.shutdown(svc2.lifecycle.lifecycleId, { actor: "operator" });
  assert.equal(stopped.ok, true);
  assert.equal(mgr.get(svc2.lifecycle.lifecycleId).currentPhase, lcm.LCM_PHASE.STOPPED);
  assert.equal(mgr.get(svc2.lifecycle.lifecycleId).cleanedUp, true);

  const earlyStop = mgr.register({
    objectId: "svc-early",
    objectType: lcm.LCM_OBJECT_TYPE.MODULE,
    owner: "kernel"
  });
  mgr.initialize(earlyStop.lifecycle.lifecycleId, { actor: "kernel" });
  mgr.activate(earlyStop.lifecycle.lifecycleId, { actor: "kernel" });
  mgr.transition(earlyStop.lifecycle.lifecycleId, lcm.LCM_PHASE.STOPPING, {
    actor: "kernel"
  });
  assert.equal(
    mgr.transition(earlyStop.lifecycle.lifecycleId, lcm.LCM_PHASE.STOPPED, {
      actor: "kernel"
    }).ok,
    false
  );
  assert.equal(
    mgr.transition(earlyStop.lifecycle.lifecycleId, lcm.LCM_PHASE.STOPPED, {
      actor: "kernel",
      cleanupCompleted: true
    }).ok,
    true
  );
  pass("shutdown cleanup required before STOPPED");

  assert.equal(
    mgr.destroy(svc2.lifecycle.lifecycleId, { actor: "kernel" }).ok,
    true
  );
  assert.equal(mgr.get(svc2.lifecycle.lifecycleId).currentPhase, lcm.LCM_PHASE.DESTROYED);
  pass("destroy only after STOPPED");

  const failObj = mgr.register({
    objectId: "svc-fail-recover",
    objectType: lcm.LCM_OBJECT_TYPE.PLUGIN,
    owner: "kernel"
  });
  mgr.initialize(failObj.lifecycle.lifecycleId, {
    actor: "kernel",
    validationFailed: true
  });
  const safeDestroy = mgr.recover(failObj.lifecycle.lifecycleId, {
    actor: "recovery-manager",
    recoveryFailed: true
  });
  assert.equal(safeDestroy.ok, false);
  assert.equal(safeDestroy.destroyed, true);
  assert.equal(
    mgr.get(failObj.lifecycle.lifecycleId).currentPhase,
    lcm.LCM_PHASE.DESTROYED
  );
  assert.equal(mgr.get(failObj.lifecycle.lifecycleId).cleanedUp, true);
  const audit = mgr.auditTrail();
  assert.ok(audit.some((e) => e.action === "recovery_failed"));
  pass("failed recovery safe destroy path");

  const runtimeObj = mgr.register({
    objectId: "rt-session",
    objectType: lcm.LCM_OBJECT_TYPE.RUNTIME,
    owner: "runtime-manager"
  });
  mgr.initialize(runtimeObj.lifecycle.lifecycleId, { actor: "runtime-manager" });
  assert.equal(
    mgr.runtimeTransition(runtimeObj.lifecycle.lifecycleId, lcm.LCM_PHASE.ACTIVE, {
      actor: "runtime-manager",
      directMutation: true
    }).ok,
    false
  );
  assert.equal(
    mgr.runtimeTransition(runtimeObj.lifecycle.lifecycleId, lcm.LCM_PHASE.ACTIVE, {
      actor: "runtime-manager"
    }).ok,
    true
  );
  pass("runtimeTransition bridge");

  const battle = mgr.registerBattle({
    objectId: "battle-1",
    owner: "battle-engine"
  });
  assert.equal(battle.ok, true);
  const bid = battle.lifecycle.lifecycleId;
  for (const phase of [
    lcm.LCM_BATTLE_PHASE.MATCHMAKING,
    lcm.LCM_BATTLE_PHASE.READY,
    lcm.LCM_BATTLE_PHASE.ACTIVE,
    lcm.LCM_BATTLE_PHASE.FINISHED,
    lcm.LCM_BATTLE_PHASE.REWARD,
    lcm.LCM_BATTLE_PHASE.DESTROYED
  ]) {
    assert.equal(
      mgr.transition(bid, phase, { actor: "battle-engine" }).ok,
      true,
      `battle → ${phase}`
    );
  }
  pass("custom Battle FSM");

  const kojTik = mgr.registerKojnozrout({
    objectId: "koj-tiktok-1",
    owner: "tiktok",
    platformOwner: "tiktok"
  });
  const kojKick = mgr.registerKojnozrout({
    objectId: "koj-kick-1",
    owner: "kick",
    platformOwner: "kick"
  });
  assert.equal(kojTik.ok, true);
  assert.equal(kojKick.ok, true);
  const kid = kojTik.lifecycle.lifecycleId;
  assert.equal(
    mgr.transition(kid, lcm.LCM_KOJ_PHASE.SPAWNED, { actor: "kojnozrout-engine" }).ok,
    true
  );
  assert.equal(
    mgr.transition(kid, lcm.LCM_KOJ_PHASE.ACTIVE, { actor: "kojnozrout-engine" }).ok,
    true
  );
  assert.equal(
    mgr.transition(kid, lcm.LCM_KOJ_PHASE.SLEEPING, { actor: "kojnozrout-engine" }).ok,
    true
  );
  assert.equal(
    mgr.transition(kid, lcm.LCM_KOJ_PHASE.ACTIVE, { actor: "kojnozrout-engine" }).ok,
    true
  );
  assert.equal(
    mgr.transition(kid, lcm.LCM_KOJ_PHASE.REMOVED, { actor: "kojnozrout-engine" }).ok,
    true
  );
  pass("custom Kojnožrout FSM with multi-instance owners");

  assert.ok(events.some((e) => e.type === "LifecycleChanged"));
  assert.ok(mgr.history().every((h) => h.immutable === true));
  assert.ok(mgr.auditTrail().every((a) => a.immutable === true));
  pass("LifecycleChanged + immutable history/audit");

  const metrics = mgr.metrics();
  assert.ok(metrics.objects >= 1);
  assert.ok(typeof metrics.active === "number");
  assert.ok(typeof metrics.paused === "number");
  assert.ok(typeof metrics.completed === "number");
  assert.ok(typeof metrics.destroyed === "number");
  assert.ok(typeof metrics.failedTransitions === "number");
  assert.ok(typeof metrics.averageLifecycleDuration === "number");
  pass("lifecycle metrics");

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-lifecycle-core/lifecycleManager.js")
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0063-lifecycle-manager.md")
  );
  pass("core system next doc 0071");

  for (const rel of lcm.LCM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  assert.ok(pathExists("shared/mia-core-canon/lifecycleManager.js"));
  pass("runtime anchors including 0009");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0063"), "README 0063");
  assert.ok(readme.includes("Lifecycle Manager"), "README Lifecycle Manager");
  assert.ok(readme.includes("0065"), "README 0065 planned");
  pass("README registry");

  console.log("\nMaster Canon 0063 contract: ALL PASS");
}

run();
