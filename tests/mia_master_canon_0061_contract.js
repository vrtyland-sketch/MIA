"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const state = require("../shared/mia-state-core");
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
  const docPath = path.join(MASTER, "0061-state-manager.md");
  const alignPath = path.join(MASTER, "0061-alignment.md");

  assert.ok(fs.existsSync(docPath), "0061-state-manager.md exists");
  assert.ok(fs.existsSync(alignPath), "0061-alignment.md exists");
  pass("0061 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 20; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0061 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0061 kernel layer");
  assert.ok(doc.includes("0060"), "0061 links to 0060");
  assert.ok(doc.includes("0062"), "0061 points to 0062");
  pass("0061 structure (20 sections)");

  assert.equal(state.SM_COMPONENT_ORDER.length, 12);
  pass("state manager components");

  assert.ok(state.SM_STATE_KIND.SYSTEM);
  assert.ok(state.SM_STATE_KIND.SERVICE);
  assert.ok(state.SM_STATE_KIND.MODULE);
  assert.ok(state.SM_STATE_KIND.GAMEPLAY);
  assert.ok(state.SM_STATE_KIND.ENTITY);
  pass("state kinds");

  assert.equal(state.SM_EVENT.STATE_CHANGED, "StateChanged");
  assert.equal(state.SM_PUBLIC_API.length, 10);
  pass("public state api");

  assert.equal(state.assertDirectMutationForbidden("direct_state_write").ok, false);
  assert.equal(state.assertDirectMutationForbidden("ai_bypass_api").ok, false);
  assert.equal(state.assertDirectMutationForbidden("transition_api").ok, true);
  pass("direct mutation forbidden");

  const invalid = state.validateTransition(
    state.SM_DEFAULT_TRANSITIONS,
    state.SM_GENERIC.CREATED,
    state.SM_GENERIC.ACTIVE
  );
  assert.equal(invalid.ok, false);
  pass("transition validation");

  const events = [];
  const mgr = state.createStateManager({
    eventBus: {
      publish(event) {
        events.push(event);
        return { ok: true, event };
      }
    }
  });
  assert.equal(mgr.status().singleton, true);
  assert.equal(mgr.status().soleStateAuthority, true);
  pass("sole state authority");

  const dup = mgr.register({
    stateId: "state-kernel",
    owner: "kernel"
  });
  assert.equal(dup.ok, false);
  pass("unique state id");

  // invalid transition blocked
  const bad = mgr.transition("state-runtime", state.SM_GENERIC.CREATED, {
    actor: "kernel"
  });
  assert.equal(bad.ok, false);
  pass("invalid transitions blocked");

  const ok = mgr.transition("state-runtime", state.SM_GENERIC.ACTIVE, {
    actor: "kernel",
    reason: "go_active"
  });
  // runtime is READY after seed — ACTIVE is allowed from READY
  assert.equal(ok.ok, true);
  assert.equal(ok.eventPublished, true);
  assert.ok(events.some((e) => e.type === "StateChanged"));
  pass("event bus publish on change");

  const hist = mgr.history();
  assert.ok(hist.length >= 1);
  assert.ok(hist.some((h) => h.previousState && h.newState));
  pass("state history");

  const synced = mgr.getSyncedView("state-battle");
  assert.equal(synced.ok, true);
  assert.equal(synced.consistent, true);
  assert.equal(synced.view.version, mgr.get("state-battle").version);
  pass("synced consistent view");

  // AI subscribe only
  const aiEvents = [];
  mgr.subscribe((e) => aiEvents.push(e));
  mgr.transition("state-battle", state.SM_BATTLE.STARTING, {
    actor: "battle-engine",
    reason: "start"
  });
  assert.ok(aiEvents.some((e) => e.stateId === "state-battle"));
  const aiDirect = mgr.transition("state-battle", state.SM_BATTLE.ACTIVE, {
    actor: "ai",
    activity: "ai_bypass_api"
  });
  assert.equal(aiDirect.ok, false);
  pass("ai uses events not direct mutation");

  // battle validated path
  mgr.transition("state-battle", state.SM_BATTLE.ACTIVE, {
    actor: "battle-engine"
  });
  mgr.transition("state-battle", state.SM_BATTLE.FINISHED, {
    actor: "battle-engine"
  });
  assert.equal(mgr.get("state-battle").currentState, state.SM_BATTLE.FINISHED);
  pass("battle state machine");

  // restore durable, skip ephemeral battle
  const snap = mgr.snapshot();
  assert.ok(snap.durable.some((d) => d.stateId === "state-feature-flags"));
  assert.ok(!snap.durable.some((d) => d.stateId === "state-battle"));
  const fresh = state.createStateManager({ seedDefaults: false });
  fresh.register({
    stateId: "state-feature-flags",
    owner: "configuration",
    kind: state.SM_STATE_KIND.MODULE,
    currentState: state.SM_MODULE.UNLOADED,
    durable: true,
    machine: {
      [state.SM_MODULE.LOADED]: [state.SM_MODULE.UPDATING, state.SM_MODULE.UNLOADED],
      [state.SM_MODULE.UPDATING]: [state.SM_MODULE.LOADED],
      [state.SM_MODULE.UNLOADED]: [state.SM_MODULE.LOADED]
    }
  });
  const restored = fresh.restore(snap);
  assert.ok(restored.restored.includes("state-feature-flags"));
  assert.equal(restored.battleNotRestoredByDefault, true);
  pass("durable restore skips ephemeral battle");

  const unauthorized = mgr.transition("state-runtime", state.SM_GENERIC.PAUSED, {
    actor: "random_plugin"
  });
  assert.equal(unauthorized.ok, false);
  pass("unauthorized actors blocked");

  const trail = mgr.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  pass("immutable audit");

  const metrics = mgr.metrics();
  assert.ok(metrics.registered >= 3);
  assert.ok(metrics.invalidTransitions >= 1);
  pass("state metrics");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-state-core/stateManager.js"));
  pass("core system next doc 0071");

  for (const rel of state.SM_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0061"), "README 0061");
  assert.ok(readme.includes("State Manager"), "README State Manager");
  pass("README registry");

  console.log("\nMaster Canon 0061 contract: ALL PASS");
}

run();
