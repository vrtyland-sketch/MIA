"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const ce = require("../shared/mia-coordination-core");
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
  const docPath = path.join(MASTER, "0087-coordination-engine.md");
  const alignPath = path.join(MASTER, "0087-alignment.md");
  assert.ok(fs.existsSync(docPath));
  assert.ok(fs.existsSync(alignPath));
  pass("0087 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"));
  assert.ok(doc.includes("0088"));
  assert.ok(/Telemetry Manager/i.test(doc));
  pass("21 sections → 0088 Telemetry Manager");

  assert.equal(ce.CE_COMPONENT_ORDER.length, 12);
  pass("12 components");

  assert.equal(ce.CE_FLAGS.soleCoordinationAuthority, true);
  assert.equal(ce.CE_FLAGS.selectsServices, false);
  assert.equal(ce.CE_FLAGS.synchronizesOnly, true);
  assert.equal(ce.CE_FLAGS.preventsDeadlocks, true);
  assert.equal(ce.CE_FLAGS.preventsRaceConditions, true);
  pass("flags");

  assert.equal(ce.CE_DESCRIPTOR_FIELDS.length, 7);
  assert.deepEqual(
    [...ce.CE_DESCRIPTOR_FIELDS],
    [
      "coordinationId",
      "type",
      "processes",
      "synchronizationPoints",
      "priority",
      "status",
      "correlationId"
    ]
  );
  const d1 = ce.createCoordinationDescriptor({
    type: "battle_sync",
    processes: ["ai", "overlay"]
  });
  assert.equal(d1.ok, true);
  assert.ok(Object.isFrozen(d1.descriptor));
  for (const f of ce.CE_DESCRIPTOR_FIELDS) assert.ok(f in d1.descriptor);
  pass("descriptor 7 fields");

  ce.clearCoordinationSingletonForTest();
  const eng = ce.createCoordinationEngine({ defaultLockTimeoutMs: 100 });
  assert.equal(eng.ok, true);
  assert.equal(eng.status().singleton, true);
  const dup = ce.createCoordinationEngine({});
  assert.equal(dup.ok, false);
  assert.equal(dup.error, "coordination_engine_already_active");
  pass("singleton");

  const auth = { source: "runtime", authorized: true, nowMs: 1000 };

  // lock / unlock
  const l1 = eng.lock("inventory", "procA", auth);
  assert.equal(l1.ok, true);
  assert.equal(l1.locked, true);
  const l2 = eng.lock("inventory", "procB", auth);
  assert.equal(l2.ok, false);
  assert.equal(l2.waiting, true);
  const u1 = eng.unlock("inventory", "procA", auth);
  assert.equal(u1.ok, true);
  assert.equal(u1.handedTo, "procB");
  pass("lock / unlock / mutex handoff");

  // deadlock prevention: lock order
  eng.unlock("inventory", "procB", auth);
  const a1 = eng.lock("inventory", "procX", auth);
  assert.equal(a1.ok, true);
  const a2 = eng.lock("bowl_state", "procX", auth);
  assert.equal(a2.ok, false);
  assert.ok(/deadlock_prevented_lock_order/.test(a2.error));
  eng.unlock("inventory", "procX", auth);
  pass("deadlock prevention lock order");

  // semaphore
  eng.createSemaphore("ai_workers", 2, auth);
  assert.equal(eng.acquireSemaphore("ai_workers", "w1", auth).ok, true);
  assert.equal(eng.acquireSemaphore("ai_workers", "w2", auth).ok, true);
  assert.equal(eng.acquireSemaphore("ai_workers", "w3", auth).waiting, true);
  const rel = eng.releaseSemaphore("ai_workers", "w1", auth);
  assert.equal(rel.ok, true);
  assert.equal(rel.woken, "w3");
  pass("semaphore");

  // barrier
  const b1 = eng.barrier("obs_ready", "ai", 3, auth);
  assert.equal(b1.waiting, true);
  const b2 = eng.barrier("obs_ready", "overlay", 3, auth);
  assert.equal(b2.waiting, true);
  const b3 = eng.barrier("obs_ready", "obs", 3, auth);
  assert.equal(b3.released, true);
  pass("barrier");

  // wait / signal
  const w = eng.wait("tts_done", "overlay", auth);
  assert.equal(w.waiting, true);
  const s = eng.signal("tts_done", auth);
  assert.equal(s.woken, "overlay");
  pass("wait / signal");

  // race prevention
  assert.equal(eng.tryMutateWithoutLock().ok, false);
  let mutated = 0;
  const safe = eng.withStateLock(
    "battle_state",
    "procS",
    () => {
      mutated += 1;
      return mutated;
    },
    auth
  );
  assert.equal(safe.ok, true);
  assert.equal(safe.result, 1);
  assert.equal(safe.racePrevented, true);
  pass("race condition prevention");

  // coordinate + orchestrator bridge
  const coord = eng.coordinate(
    {
      type: "gift_flow",
      processes: ["ai", "overlay"],
      resources: ["bowl_state", "inventory"],
      synchronizationPoints: ["after_ai"]
    },
    auth
  );
  assert.equal(coord.ok, true);
  assert.deepEqual([...coord.acquired], ["bowl_state", "inventory"]);
  eng.unlock("bowl_state", "ai", auth);
  eng.unlock("inventory", "ai", auth);

  const orch = eng.forOrchestrator(
    { type: "orch_sync", processes: ["obs"], resources: ["obs_queue"] },
    { source: "orchestrator_engine" }
  );
  assert.equal(orch.ok, true);
  eng.unlock("obs_queue", "obs", auth);
  pass("coordinate + orchestrator bridge");

  for (const name of ce.CE_PUBLIC_API) {
    assert.equal(typeof eng[name], "function", name);
  }

  const forged = eng.lock("inventory", "x", { forged: true, source: "runtime" });
  assert.equal(forged.ok, false);

  assert.equal(
    eng.lock("x", "y", { ...auth, selectService: true }).ok,
    false
  );

  const m = eng.metrics();
  assert.ok(typeof m.syncCount === "number");
  assert.ok(typeof m.lockCount === "number");
  assert.ok(typeof m.semaphoreCount === "number");
  assert.ok(typeof m.barrierCount === "number");
  assert.ok(typeof m.conflictCount === "number");
  assert.ok(typeof m.deadlockCount === "number");
  assert.ok(typeof m.averageWaitMs === "number");

  const trail = eng.coordinationAudit();
  assert.ok(trail.length >= 1);
  assert.ok("syncObject" in trail[0]);
  assert.ok("result" in trail[0]);
  pass("API; forged; metrics; audit");

  const coreSys = architecture.getPlatformSystem(
    architecture.PLATFORM_SYSTEM_ID.CORE
  );
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(
    coreSys.runtime.includes("shared/mia-orchestrator-core/orchestratorEngine.js")
  );
  assert.ok(
    coreSys.runtime.includes(
      "shared/mia-coordination-core/coordinationEngine.js"
    )
  );
  assert.ok(
    coreSys.docs.includes("docs/master-canon/0087-coordination-engine.md")
  );
  const oeIdx = coreSys.runtime.indexOf(
    "shared/mia-orchestrator-core/orchestratorEngine.js"
  );
  const ceIdx = coreSys.runtime.indexOf(
    "shared/mia-coordination-core/coordinationEngine.js"
  );
  assert.ok(oeIdx >= 0 && ceIdx === oeIdx + 1);
  pass("platformSystems nextDocId 0088; coordination after orchestrator");

  for (const rel of ce.CE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), rel);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0087") && /Coordination Engine/i.test(readme));
  assert.ok(readme.includes("0088") && /Telemetry Manager/i.test(readme));
  assert.ok(readme.includes("shared/mia-coordination-core/"));
  assert.ok(readme.includes("mia_master_canon_0087_contract.js"));
  pass("README + anchors");

  const align86 = read("docs/master-canon/0086-alignment.md");
  assert.ok(align86.includes("**0087**") && /Coordination/i.test(align86));
  assert.ok(align86.includes("0088") && /Telemetry/i.test(align86));
  pass("0086-alignment marks 0087 done / 0088 Telemetry planned");

  const align87 = read("docs/master-canon/0087-alignment.md");
  assert.ok(align87.includes("🟡") || align87.includes("🟢"));
  assert.ok(/wiring/i.test(align87));

  console.log("\nMaster Canon 0087 contract: ALL PASS");
}

run();
