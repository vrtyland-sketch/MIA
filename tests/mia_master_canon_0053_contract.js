"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const service = require("../shared/mia-service-core");
const startup = require("../shared/mia-startup-core");
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
  const docPath = path.join(MASTER, "0053-service-manager.md");
  const alignPath = path.join(MASTER, "0053-alignment.md");

  assert.ok(fs.existsSync(docPath), "0053-service-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0053-alignment.md exists");
  pass("0053 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0053 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0053 kernel layer");
  assert.ok(doc.includes("0052"), "0053 links to 0052");
  assert.ok(doc.includes("0054"), "0053 points to 0054");
  pass("0053 structure (21 sections)");

  assert.equal(service.SVM_COMPONENT_ORDER.length, 12);
  pass("service manager components");

  assert.equal(service.SVM_REQUIRED_METHODS.length, 8);
  assert.ok(service.SVM_REQUIRED_METHODS.includes("dispose"));
  pass("required service interface");

  assert.equal(service.SVM_PUBLIC_API.length, 11);
  pass("public service api");

  const skip = service.transitionServiceState(
    service.SVM_STATE.CREATED,
    service.SVM_STATE.RUNNING
  );
  assert.equal(skip.ok, false);
  pass("lifecycle skip forbidden");

  const incomplete = service.createServiceDescriptor({ id: "x" });
  assert.equal(incomplete.ok, false);
  const desc = service.createServiceDescriptor({
    id: "battle-engine",
    name: "Battle Engine",
    version: "4.2.0",
    priority: service.SVM_PRIORITY.HIGH,
    dependencies: ["event-bus", "inventory", "economy"],
    permissions: ["memory.read", "overlay.write"],
    restartPolicy: service.SVM_RESTART_POLICY.IMMEDIATE
  });
  assert.equal(desc.ok, true);
  pass("service descriptor");

  const iface = service.validateServiceInterface(["initialize", "start"]);
  assert.equal(iface.ok, false);
  assert.ok(iface.missing.includes("stop"));
  pass("interface validation");

  const direct = service.assertCommunicationAllowed("internal_method");
  assert.equal(direct.ok, false);
  assert.equal(service.assertCommunicationAllowed(service.SVM_COMMUNICATION.EVENT_BUS).ok, true);
  pass("communication gate");

  assert.equal(service.assertServiceForbiddenActivity("run_outside_manager").ok, false);
  assert.equal(service.assertServiceForbiddenActivity("direct_internal_call").ok, false);
  pass("forbidden activities");

  const never = service.evaluateRestartPolicy(service.SVM_RESTART_POLICY.NEVER);
  assert.equal(never.restart, false);
  const exp = service.evaluateRestartPolicy(service.SVM_RESTART_POLICY.EXPONENTIAL, 3, 1000);
  assert.equal(exp.delayMs, 4000);
  const confirm = service.evaluateRestartPolicy(service.SVM_RESTART_POLICY.RECOVERY_CONFIRM);
  assert.equal(confirm.requiresRecoveryConfirm, true);
  pass("restart policies");

  const mgr = service.createServiceManager();
  assert.equal(mgr.status().singleton, true);
  assert.ok(mgr.list().services.length >= 10);
  pass("seeded registry");

  const dup = mgr.register({
    id: "logger",
    name: "Logger",
    version: "2.0.0"
  });
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "duplicate_service_id");
  pass("block duplicate service id");

  const custom = mgr.register({
    id: "chat-overlay",
    name: "Chat Overlay",
    version: "1.0.0",
    category: service.SVM_CATEGORY.PRESENTATION,
    priority: service.SVM_PRIORITY.LOW,
    autoStart: service.SVM_AUTOSTART.MANUAL
  });
  assert.equal(custom.ok, true);
  pass("register service");

  mgr.start("runtime");
  mgr.start("event-bus");
  mgr.start("inventory");
  mgr.start("economy");
  const battle = mgr.start("battle-engine");
  assert.equal(battle.ok, true);
  assert.equal(mgr.getState("battle-engine"), service.SVM_STATE.RUNNING);
  pass("start with dependencies");

  const blockedDep = service.createServiceManager({ seedDefaults: false });
  blockedDep.register({
    id: "child",
    name: "Child",
    version: "1.0.0",
    dependencies: ["missing-dep"]
  });
  const noDep = blockedDep.start("child");
  assert.equal(noDep.ok, false);
  pass("block start without dependencies");

  const paused = mgr.pause("battle-engine");
  assert.equal(paused.ok, true);
  assert.equal(mgr.health("battle-engine").health, service.SVM_HEALTH.DEGRADED);
  const resumed = mgr.resume("battle-engine");
  assert.equal(resumed.ok, true);
  pass("pause resume health");

  const restarted = mgr.restart("battle-engine");
  assert.equal(restarted.ok, true);
  assert.equal(restarted.attempt, 1);
  pass("restart policy apply");

  const speech = mgr.register({
    id: "speech-engine",
    name: "Speech Engine",
    version: "1.0.0",
    category: service.SVM_CATEGORY.AI,
    priority: service.SVM_PRIORITY.NORMAL,
    restartPolicy: service.SVM_RESTART_POLICY.NEVER
  });
  assert.equal(speech.ok, true);
  mgr.start("speech-engine");
  const speechFail = mgr.fail("speech-engine", "tts_crash");
  assert.equal(speechFail.stopsRuntime, false);
  assert.equal(speechFail.isolatesOthers, true);
  assert.equal(mgr.getState("battle-engine"), service.SVM_STATE.RUNNING);
  pass("noncritical failure isolation");

  const kernelFail = mgr.fail("recovery", "kernel_panic");
  assert.equal(kernelFail.stopsRuntime, true);
  pass("critical kernel can stop runtime");

  const pluginBad = mgr.registerPluginService(
    { id: "plugin-svc", name: "Plugin", version: "0.1.0", category: service.SVM_CATEGORY.PLUGIN },
    { validated: false, permissionsOk: true }
  );
  assert.equal(pluginBad.ok, false);
  const pluginOk = mgr.registerPluginService(
    { id: "plugin-svc", name: "Plugin", version: "0.1.0", category: service.SVM_CATEGORY.PLUGIN },
    { validated: true, permissionsOk: true }
  );
  assert.equal(pluginOk.ok, true);
  pass("plugin registration via manager");

  const unregKernel = mgr.unregister("logger");
  assert.equal(unregKernel.ok, false);
  pass("protect kernel services");

  const unverified = service.createServiceManager({ seedDefaults: false, environment: "production" });
  const blocked = unverified.register({
    id: "shadow",
    name: "Shadow",
    version: "1.0.0",
    verified: false
  });
  assert.equal(blocked.ok, false);
  pass("block unverified in production");

  const metrics = mgr.metrics();
  assert.ok(metrics.total >= 10);
  assert.ok(metrics.active >= 1);
  pass("service metrics");

  const trail = mgr.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  pass("immutable audit log");

  const ssm = startup.createStartupSequenceManager({ bootCompleted: true });
  const sequenced = ssm.start({ obsUnavailable: true });
  assert.equal(sequenced.ok, true);
  pass("startup sequence remains independent");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-service-core/serviceManager.js"));
  pass("core system next doc 0056");

  for (const rel of service.SVM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0053"), "README 0053");
  pass("README registry");

  console.log("\nMaster Canon 0053 contract: ALL PASS");
}

run();
