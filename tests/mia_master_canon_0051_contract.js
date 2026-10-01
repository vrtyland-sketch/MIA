"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const boot = require("../shared/mia-boot-core");
const kernel = require("../shared/mia-kernel-core");
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
  const docPath = path.join(MASTER, "0051-boot-manager.md");
  const alignPath = path.join(MASTER, "0051-alignment.md");

  assert.ok(fs.existsSync(docPath), "0051-boot-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0051-alignment.md exists");
  pass("0051 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0051 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0051 kernel layer");
  assert.ok(doc.includes("0050"), "0051 links to 0050");
  assert.ok(doc.includes("0052"), "0051 points to 0052");
  pass("0051 structure (21 sections)");

  assert.equal(boot.BM_COMPONENT_ORDER.length, 12);
  pass("boot components");

  assert.equal(boot.BM_PIPELINE.length, 9);
  assert.equal(boot.BM_PIPELINE[0], "BOOT-00");
  assert.equal(boot.BM_PIPELINE[8], "BOOT-08");
  assert.equal(boot.BM_PIPELINE_LABEL["BOOT-03"], "initialize_runtime_context");
  pass("boot pipeline BOOT-00..08");

  assert.equal(boot.BM_PUBLIC_API.length, 7);
  assert.ok(boot.BM_PUBLIC_API.includes("safeBoot"));
  pass("public boot api");

  const env = boot.verifyEnvironment({ minNodeMajor: 18 });
  assert.equal(env.ok, true);
  assert.ok(env.nodeVersion);
  pass("environment validation");

  const badEnv = boot.verifyEnvironment({ supportedOs: ["__never__"] });
  assert.equal(badEnv.ok, false);
  assert.equal(badEnv.fatalCount > 0, true);
  pass("fatal environment failure");

  const config = boot.loadConfiguration({
    default: { a: 1 },
    environment: { b: 2 },
    user: { a: 9 },
    runtime_overrides: { c: 3 }
  });
  assert.equal(config.ok, true);
  assert.equal(config.config.a, 9);
  assert.equal(config.config.c, 3);
  assert.ok(config.configurationHash);
  pass("configuration layer merge");

  const secrets = boot.loadConfiguration({ secretsInRepo: true, default: {} });
  assert.equal(secrets.ok, false);
  pass("reject secrets in repo");

  const ctx = boot.createBootRuntimeContext({
    configurationHash: config.configurationHash,
    loadedServices: []
  });
  assert.equal(ctx.readOnly, true);
  pass("runtime context read-only");

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mia-boot-"));
  const fsCheck = boot.checkFilesystemStructure(tmpRoot, { allowCreate: true, autoCreate: true });
  assert.equal(fsCheck.ok, true);
  assert.equal(boot.BM_REQUIRED_DIRS.length, 9);
  pass("filesystem structure");

  const registries = boot.initializeRegistries();
  assert.equal(registries.locked, true);
  assert.equal(registries.kinds.length, 7);
  pass("registry initialization locked");

  const services = boot.initializeKernelServices();
  assert.equal(services.higherLayersRunning, false);
  assert.ok(services.services.some((s) => s.serviceId === "logger"));
  pass("kernel services only");

  const cyclic = boot.validateDependencies([
    { id: "a", dependencies: ["b"] },
    { id: "b", dependencies: ["a"] }
  ]);
  assert.equal(cyclic.ok, false);
  pass("reject cyclic dependencies");

  const acyclic = boot.validateDependencies([
    { id: "kernel", dependencies: [] },
    { id: "logger", dependencies: ["kernel"] },
    { id: "configuration", dependencies: ["logger"] }
  ]);
  assert.equal(acyclic.ok, true);
  pass("dependency validation");

  const fatal = boot.classifyError({ code: "corrupted_configuration" });
  assert.equal(fatal.blocksBoot, true);
  const recoverable = boot.classifyError({ code: "experimental_plugin_missing" });
  assert.equal(recoverable.ok, true);
  pass("fatal vs recoverable errors");

  const recovery = boot.runRecovery({ maxAttempts: 2, recoverOnAttempt: 1 });
  assert.equal(recovery.ok, true);
  assert.equal(recovery.pipeline[0], "detect");
  pass("recovery pipeline");

  assert.equal(boot.BM_DEFAULT_TIMEOUTS_MS.environment_validation, 5000);
  assert.equal(boot.BM_DEFAULT_TIMEOUTS_MS.runtime_initialization, 15000);
  pass("default timeouts");

  assert.equal(boot.assertBootForbiddenActivity("ai_decision").ok, false);
  assert.equal(boot.assertBootForbiddenActivity("battle_control").ok, false);
  pass("forbidden activities");

  const manager = boot.createBootManager({
    rootDir: tmpRoot,
    timeouts: { health_verification: 8000 }
  });
  assert.equal(manager.getTimeouts().health_verification, 8000);
  manager.setTimeouts({ configuration_load: 12000 });
  assert.equal(manager.getTimeouts().configuration_load, 12000);
  pass("configurable timeouts");

  const booted = manager.boot({
    allowCreateDirs: true,
    disabledModules: ["experimental_overlay"],
    experimentalPluginMissing: true,
    version: "1.0.0"
  });
  assert.equal(booted.ok, true);
  assert.equal(booted.mutatesDomain, false);
  assert.equal(booted.handedOffToStartupSequence, true);
  assert.equal(booted.context.readOnly, true);
  assert.ok(booted.report.bootId);
  assert.ok(booted.report.startedServices.includes("logger"));
  assert.ok(booted.warnings.some((w) => w.code === "module_disabled"));
  pass("full boot pipeline");

  const pipelineOrder = booted.pipeline.pipeline.map((p) => p.step);
  assert.deepEqual(pipelineOrder, [...boot.BM_PIPELINE]);
  pass("immutable boot order");

  const report = manager.generateBootReport();
  assert.equal(report.logged, true);
  pass("boot report");

  const status = manager.status();
  assert.equal(status.singleton, true);
  assert.equal(status.state, boot.BM_STATE.READY);
  pass("singleton status");

  const safe = boot.createBootManager({ rootDir: tmpRoot }).safeBoot({ allowCreateDirs: true });
  assert.equal(safe.ok, true);
  assert.equal(safe.state, boot.BM_STATE.SAFE_BOOT);
  pass("safe boot");

  const failedBoot = boot.createBootManager({ rootDir: tmpRoot }).boot({
    allowCreateDirs: true,
    environment: { supportedOs: ["__never__"] }
  });
  assert.equal(failedBoot.ok, false);
  assert.equal(failedBoot.severity, boot.BM_ERROR_SEVERITY.FATAL);
  pass("critical error stops boot");

  const recovered = manager.recoverFromError({ code: "optional_overlay_missing" });
  assert.equal(recovered.continuesBoot, true);
  pass("recoverable error continues");

  const k = kernel.createCoreKernel();
  const kBoot = k.boot();
  assert.equal(kBoot.ok, true);
  pass("kernel remains independent domain-free");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-boot-core/bootManager.js"));
  pass("core system next doc 0052");

  for (const rel of boot.BM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0051"), "README 0051");
  pass("README registry");

  console.log("\nMaster Canon 0051 contract: ALL PASS");
}

run();
