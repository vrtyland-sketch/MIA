"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const config = require("../shared/mia-configuration-core");
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
  const docPath = path.join(MASTER, "0055-configuration-manager.md");
  const alignPath = path.join(MASTER, "0055-alignment.md");

  assert.ok(fs.existsSync(docPath), "0055-configuration-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0055-alignment.md exists");
  pass("0055 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0055 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0055 kernel layer");
  assert.ok(doc.includes("0054"), "0055 links to 0054");
  assert.ok(doc.includes("0056"), "0055 points to 0056");
  pass("0055 structure (20 sections)");

  assert.equal(config.CM_COMPONENT_ORDER.length, 12);
  pass("configuration manager components");

  assert.equal(config.CM_LAYER_ORDER.length, 6);
  assert.equal(config.CM_LAYER_ORDER[0], config.CM_LAYER.SYSTEM_DEFAULTS);
  assert.equal(config.CM_LAYER_ORDER[5], config.CM_LAYER.SESSION_OVERRIDES);
  pass("config layers 1-6");

  assert.ok(config.CM_CATEGORY.CORE);
  assert.ok(config.CM_CATEGORY.PLATFORM);
  assert.ok(config.CM_CATEGORY.GAMEPLAY);
  assert.ok(config.CM_CATEGORY.AI);
  pass("config categories");

  assert.equal(Object.keys(config.CM_VALUE_TYPE).length, 10);
  pass("value types");

  assert.equal(config.CM_PUBLIC_API.length, 11);
  pass("public configuration api");

  const badType = config.validateConfigValue(config.CM_VALUE_TYPE.INTEGER, "x");
  assert.equal(badType.ok, false);
  const okEnum = config.validateConfigValue(config.CM_VALUE_TYPE.ENUM, "normal", {
    allowed: ["easy", "normal", "hard"]
  });
  assert.equal(okEnum.ok, true);
  const badMin = config.validateConfigValue(config.CM_VALUE_TYPE.INTEGER, 5, { min: 10 });
  assert.equal(badMin.ok, false);
  pass("validation rules");

  assert.equal(config.assertDirectFileReadForbidden("read_config_file_directly").ok, false);
  assert.equal(config.assertDirectFileReadForbidden("via_manager").ok, true);
  pass("direct file read forbidden");

  const mgr = config.createConfigurationManager();
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleAuthority, true);
  assert.equal(mgr.status().directFileReadAllowed, false);
  assert.ok(mgr.metrics().items >= 10);
  pass("seeded configuration manager");

  const runtime = mgr.getRuntimeConfiguration();
  assert.equal(runtime.readOnly, true);
  assert.equal(runtime.unified, true);
  assert.equal(runtime.get("presentation.volume"), 80);
  pass("runtime configuration read-only");

  const denied = mgr.set("presentation.volume", 50, { actor: "nobody" });
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "unauthorized_write");
  pass("unauthorized write blocked");

  const hot = mgr.set("presentation.volume", 55, {
    actor: "operator",
    permissions: ["config.write"],
    hotReload: true,
    reason: "volume_adjust"
  });
  assert.equal(hot.ok, true);
  assert.equal(hot.hotReloadApplied, true);
  assert.equal(mgr.get("presentation.volume").value, 55);
  pass("hot reload allowed keys");

  const kernelHot = mgr.set("kernel.mode", "development", {
    actor: "operator",
    permissions: ["config.admin"],
    hotReload: true,
    type: config.CM_VALUE_TYPE.ENUM,
    rules: { allowed: ["production", "development", "test"] }
  });
  assert.equal(kernelHot.ok, false);
  assert.equal(kernelHot.error, "hot_reload_not_allowed");
  pass("kernel hot reload requires restart path");

  const kernelSet = mgr.set("kernel.mode", "development", {
    actor: "operator",
    permissions: ["config.admin"],
    type: config.CM_VALUE_TYPE.ENUM,
    rules: { allowed: ["production", "development", "test"] },
    reason: "dev_switch"
  });
  assert.equal(kernelSet.ok, true);
  assert.equal(kernelSet.requiresRestart, true);
  pass("kernel change requires restart");

  const flag = mgr.setFeatureFlag("ExperimentalOverlay", true, { actor: "ops" });
  assert.equal(flag.ok, true);
  assert.equal(mgr.getFeatureFlag("ExperimentalOverlay").enabled, true);
  pass("feature flags");

  const secretInConfig = mgr.set("api.key", "secret", {
    actor: "ops",
    permissions: ["config.write"]
  });
  assert.equal(secretInConfig.ok, true);
  const secret = mgr.setSecret("obs.password", "pw", {
    actor: "ops",
    permissions: ["config.admin"]
  });
  assert.equal(secret.ok, true);
  assert.equal(secret.separated, true);
  assert.equal(mgr.getSecret("obs.password").ok, false);
  assert.equal(mgr.getSecret("obs.password", { allowSecrets: true }).value, "pw");
  pass("secrets separated");

  const versions = mgr.listVersions("presentation.volume");
  assert.ok(versions.length >= 1);
  const restored = mgr.restoreVersion("presentation.volume", versions[0].version, {
    actor: "ops",
    permissions: ["config.admin"]
  });
  assert.equal(restored.ok, true);
  pass("version restore");

  const trail = mgr.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  pass("immutable audit");

  const metrics = mgr.metrics();
  assert.ok(metrics.changes >= 1);
  assert.ok(metrics.runtimeChanges >= 1);
  assert.ok(metrics.activeFeatureFlags >= 1);
  pass("configuration metrics");

  const layered = config.createConfigurationManager({ seedDefaults: false });
  layered.load({
    [config.CM_LAYER.SYSTEM_DEFAULTS]: { "demo.x": 1 },
    [config.CM_LAYER.USER]: { "demo.x": 2 },
    [config.CM_LAYER.RUNTIME_OVERRIDES]: { "demo.x": 3 }
  });
  assert.equal(layered.getRuntimeConfiguration().get("demo.x"), 3);
  pass("layer merge order");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-configuration-core/configurationManager.js"));
  pass("core system next doc 0056");

  for (const rel of config.CM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0055"), "README 0055");
  assert.ok(readme.includes("Configuration Manager"), "README Configuration Manager");
  pass("README registry");

  console.log("\nMaster Canon 0055 contract: ALL PASS");
}

run();
