"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const plugin = require("../shared/mia-module-core");
const creature = require("../shared/mia-creature-core");
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
  const docPath = path.join(MASTER, "0049-plugin-module-engine.md");
  const alignPath = path.join(MASTER, "0049-alignment.md");

  assert.ok(fs.existsSync(docPath), "0049-plugin-module-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0049-alignment.md exists");
  pass("0049 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 11; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0049 section ${i}`);
  }
  assert.ok(doc.includes("Module Core"), "0049 critical priority");
  assert.ok(doc.includes("0048"), "0049 links to 0048");
  assert.ok(doc.includes("0050"), "0049 points to 0050");
  pass("0049 structure (11 sections)");

  assert.equal(plugin.PME_COMPONENT_ORDER.length, 12);
  pass("plugin module components");

  const manifest = plugin.createModuleManifest({
    moduleId: "puzzle",
    name: "Puzzle Module",
    version: "0.2.0",
    verified: true,
    publishes: ["PUZZLE_SOLVED"],
    subscribes: ["QUEST_STARTED"],
    dependencies: ["inventory_engine"]
  });
  assert.equal(manifest.verified, true);
  assert.equal(manifest.idempotent, true);
  pass("module manifest contract");

  const invalid = plugin.validateManifest({ moduleId: "x" });
  assert.equal(invalid.ok, false);
  pass("manifest validator");

  const registry = { inventory_engine: { moduleId: "inventory_engine" } };
  const deps = plugin.resolveDependencies(manifest, registry);
  assert.equal(deps.ok, true);
  pass("dependency resolver");

  const lifecycle = plugin.transitionModuleState(plugin.PME_STATE.CREATED, plugin.PME_STATE.INITIALIZED);
  assert.equal(lifecycle.to, plugin.PME_STATE.INITIALIZED);
  const blocked = plugin.transitionModuleState(plugin.PME_STATE.CREATED, plugin.PME_STATE.RUNNING);
  assert.equal(blocked.ok, false);
  pass("lifecycle state machine");

  const events = [];
  const eventBus = { publish: (e) => events.push(e) };
  const published = plugin.publishModuleEvent(
    plugin.PME_SYSTEM_EVENT.STARTED,
    { moduleId: "puzzle", correlationId: "corr-test" },
    { eventBus }
  );
  assert.equal(published.viaEventBus, true);
  assert.equal(events[0].correlationId, "corr-test");
  pass("event bus adapter");

  const blockedBus = plugin.publishModuleEvent(plugin.PME_SYSTEM_EVENT.STARTED, { bypassEventBus: true });
  assert.equal(blockedBus.ok, false);
  pass("reject event bus bypass");

  const config = plugin.validateModuleConfig({ configVersion: "1.0" });
  assert.equal(config.ok, true);
  const badConfig = plugin.validateModuleConfig({ secretsInRepo: true });
  assert.equal(badConfig.ok, false);
  pass("config manager");

  const gate = plugin.assertProductionGate({ moduleId: "x", verified: false }, "production");
  assert.equal(gate.ok, false);
  const allowed = plugin.assertProductionGate({ moduleId: "x", verified: true }, "production");
  assert.equal(allowed.ok, true);
  pass("production security gate");

  const reloadBlocked = plugin.canHotReload({ battleActive: true });
  assert.equal(reloadBlocked.ok, false);
  const reloadOk = plugin.canHotReload({});
  assert.equal(reloadOk.ok, true);
  pass("hot reload guard");

  const err = plugin.recordModuleError({
    componentId: "fishing",
    message: "timeout",
    correlationId: "corr-err"
  });
  assert.ok(err.errorId);
  assert.equal(err.recoveryStep, "retry_or_disable_module");
  pass("error recovery record");

  const engine = plugin.createPluginModuleEngine();
  const registered = engine.registerModule({
    moduleId: "racing",
    name: "Racing Module",
    version: "0.1.0",
    verified: true,
    dependencies: []
  });
  assert.equal(registered.ok, true);
  pass("plugin registry");

  const installed = engine.installModule("battle", { eventBus });
  assert.equal(installed.ok, true);
  assert.equal(installed.state, plugin.PME_STATE.READY);
  pass("install module pipeline");

  const started = engine.startModule("battle", { eventBus });
  assert.equal(started.ok, true);
  assert.equal(started.bypassesDecisionEngine, false);
  pass("start module");

  const updateBlocked = engine.updateModule("battle", {
    context: { economyTransactionActive: true },
    manifest: { version: "1.0.1" }
  });
  assert.equal(updateBlocked.ok, false);
  pass("hot reload blocks economy transaction");

  const updated = engine.updateModule(
    "battle",
    { context: {}, manifest: { version: "1.0.1" } },
    { eventBus }
  );
  assert.equal(updated.ok, true);
  assert.equal(updated.requiresCoreRestart, false);
  pass("update module without core restart");

  const failed = engine.failModule("fishing", { message: "load_error" }, { eventBus });
  assert.equal(failed.platformContinues, true);
  pass("module failure does not stop platform");

  const creatureEngine = creature.createCreatureEvolutionEngine();
  const creatureModules = creatureEngine.listModules();
  assert.ok(creatureModules.length >= 10);
  pass("creature evolution game modules bridge");

  assert.equal(plugin.assertPluginForbiddenActivity("bypass_event_bus").ok, false);
  assert.equal(plugin.assertPluginForbiddenActivity("run_unverified_in_production").ok, false);
  pass("forbidden activities");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  assert.ok(gameSys.runtime.includes("shared/mia-module-core/pluginModuleEngine.js"));
  pass("game system next doc 0051");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  pass("core system next doc 0051");

  const intSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.INTEGRATION);
  assert.equal(intSys.nextDocId, "0088");
  assert.ok(intSys.runtime.includes("shared/mia-module-core/pluginModuleEngine.js"));
  pass("integration system next doc 0051");

  for (const rel of plugin.PME_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0049"), "README 0049");
  pass("README registry");

  console.log("\nMaster Canon 0049 contract: ALL PASS");
}

run();
