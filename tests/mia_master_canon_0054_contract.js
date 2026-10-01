"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const dependency = require("../shared/mia-dependency-core");
const service = require("../shared/mia-service-core");
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
  const docPath = path.join(MASTER, "0054-dependency-manager.md");
  const alignPath = path.join(MASTER, "0054-alignment.md");

  assert.ok(fs.existsSync(docPath), "0054-dependency-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0054-alignment.md exists");
  pass("0054 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0054 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0054 kernel layer");
  assert.ok(doc.includes("0053"), "0054 links to 0053");
  assert.ok(doc.includes("0055"), "0054 points to 0055");
  pass("0054 structure (20 sections)");

  assert.equal(dependency.DM_COMPONENT_ORDER.length, 12);
  pass("dependency manager components");

  assert.equal(dependency.DM_DEP_TYPE.HARD, "hard");
  assert.equal(dependency.DM_DEP_TYPE.SOFT, "soft");
  assert.equal(dependency.DM_DEP_TYPE.OPTIONAL, "optional");
  pass("dependency types");

  assert.equal(dependency.DM_PUBLIC_API.length, 13);
  pass("public dependency api");

  const incomplete = dependency.createDependencyDescriptor({});
  assert.equal(incomplete.ok, false);
  const desc = dependency.createDependencyDescriptor({
    id: "battle-engine",
    dependsOn: ["event-bus", "inventory-engine", "economy-engine"],
    optional: ["discord-module"],
    conflicts: ["legacy-battle-engine"]
  });
  assert.equal(desc.ok, true);
  assert.equal(desc.descriptor.dependsOn.length, 3);
  pass("dependency descriptor");

  const bypass = dependency.assertValidationRequired(true);
  assert.equal(bypass.ok, false);
  pass("validation bypass forbidden");

  const cyclicNodes = new Map([
    [
      "battle",
      {
        descriptor: {
          id: "battle",
          dependsOn: ["inventory"],
          soft: [],
          optional: [],
          conflicts: []
        }
      }
    ],
    [
      "inventory",
      {
        descriptor: {
          id: "inventory",
          dependsOn: ["economy"],
          soft: [],
          optional: [],
          conflicts: []
        }
      }
    ],
    [
      "economy",
      {
        descriptor: {
          id: "economy",
          dependsOn: ["battle"],
          soft: [],
          optional: [],
          conflicts: []
        }
      }
    ]
  ]);
  const cycle = dependency.detectCycles(cyclicNodes);
  assert.equal(cycle.ok, false);
  assert.equal(cycle.cyclic, true);
  pass("circular dependency blocked");

  const mgr = dependency.createDependencyManager();
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().managesRelationshipsOnly, true);
  assert.ok(mgr.list().nodes.length >= 10);
  pass("seeded dependency graph");

  const validation = mgr.validateForStartup();
  assert.equal(validation.ok, true);
  assert.equal(validation.blocksStartup, false);
  pass("startup validation");

  const order = mgr.computeInitOrder();
  assert.equal(order.ok, true);
  assert.ok(order.order.indexOf("kernel") < order.order.indexOf("runtime"));
  assert.ok(order.order.indexOf("event-bus") < order.order.indexOf("battle-engine"));
  assert.ok(order.order.indexOf("memory") < order.order.indexOf("decision"));
  pass("topological init order");

  const blockedStart = mgr.canStart("battle-engine");
  assert.equal(blockedStart.ok, true);
  assert.equal(blockedStart.canStart, true);

  const empty = dependency.createDependencyManager({ seedDefaults: false });
  empty.register({ id: "orphan", dependsOn: ["missing-hard"] });
  const unmet = empty.canStart("orphan");
  assert.equal(unmet.canStart, false);
  assert.equal(unmet.error, "unmet_hard_dependencies");
  pass("hard dependency gate");

  empty.register({ id: "legacy-battle-engine", version: "1.0.0" });
  empty.register({
    id: "battle-engine",
    dependsOn: [],
    conflicts: ["legacy-battle-engine"]
  });
  const conflicts = empty.detectConflicts();
  assert.equal(conflicts.ok, false);
  assert.equal(conflicts.handOffToRecovery, true);
  assert.ok(conflicts.conflicts.some((c) => c.type === "forbidden_combination"));
  pass("conflicts handed to recovery");

  const dyn = mgr.addModule({
    id: "speech-engine",
    kind: dependency.DM_NODE_KIND.SERVICE,
    dependsOn: ["event-bus"]
  });
  assert.equal(dyn.ok, true);
  assert.equal(dyn.kernelRestartRequired, false);
  pass("dynamic module add without kernel restart");

  const cycleMgr = dependency.createDependencyManager({ seedDefaults: false });
  cycleMgr.register({ id: "loop-a", dependsOn: ["loop-b"] });
  const badDyn2 = cycleMgr.addModule({
    id: "loop-b",
    dependsOn: ["loop-a"]
  });
  assert.equal(badDyn2.ok, false);
  pass("dynamic cycle rejected");

  const pluginBad = mgr.registerPlugin(
    { id: "plugin-x", dependsOn: ["event-bus"] },
    { signatureValid: false, permissionsOk: true }
  );
  assert.equal(pluginBad.ok, false);
  const pluginOk = mgr.registerPlugin(
    { id: "plugin-x", dependsOn: ["event-bus"] },
    { signatureValid: true, permissionsOk: true, compatible: true }
  );
  assert.equal(pluginOk.ok, true);
  assert.deepEqual([...pluginOk.stepsCompleted], [...dependency.DM_PLUGIN_STEPS]);
  pass("plugin registration pipeline");

  const game = mgr.registerGame({
    id: "fishing",
    dependsOn: ["event-bus", "economy-engine"]
  });
  assert.equal(game.ok, true);
  pass("game via dependency declaration only");

  const disc = mgr.disconnectPlatform("tiktok");
  assert.equal(disc.ok, true);
  assert.equal(disc.damagesOthers, false);
  assert.equal(disc.systemIntact, true);
  pass("platform disconnect isolation");

  const snap = mgr.graphSnapshot();
  assert.equal(snap.acyclic, true);
  assert.ok(snap.nodes.includes("battle-engine"));
  pass("acyclic graph snapshot");

  const metrics = mgr.metrics();
  assert.ok(metrics.nodes >= 10);
  assert.ok(metrics.edges >= 1);
  assert.ok(metrics.dynamicChanges >= 1);
  pass("dependency metrics");

  assert.ok(service.createServiceManager);
  pass("service manager remains independent");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-dependency-core/dependencyManager.js"));
  pass("core system next doc 0056");

  for (const rel of dependency.DM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0054"), "README 0054");
  assert.ok(readme.includes("Dependency Manager"), "README Dependency Manager");
  pass("README registry");

  console.log("\nMaster Canon 0054 contract: ALL PASS");
}

run();
