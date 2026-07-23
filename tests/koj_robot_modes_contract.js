"use strict";

const assert = require("assert/strict");
const { createKojnozoutState } = require("../scripts/MIA_KOJNOZROUT_ENGINE");
const {
  KOJ_ROBOT_FORMS,
  TECH_FORMS,
  createRobotModesState,
  canActivateForm,
  previewActivateForm,
  deriveCombatPower,
  getRobotModesSnapshot,
  estimateFormCost
} = require("../scripts/MIA_KOJ_ROBOT_MODES");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("fresh koj state defaults to pet robot mode", () => {
  const state = createKojnozoutState({});
  assert.ok(state.robotModes);
  assert.equal(state.robotModes.activeForm, KOJ_ROBOT_FORMS.PET);
  assert.deepEqual(state.robotModes.unlockedForms, [KOJ_ROBOT_FORMS.PET]);
  assert.equal(state.robotModes.miaSync, 0);
});

test("tech forms enum is stable and excludes pet", () => {
  assert.ok(TECH_FORMS.includes(KOJ_ROBOT_FORMS.ASSISTANT));
  assert.ok(TECH_FORMS.includes(KOJ_ROBOT_FORMS.SHIELD));
  assert.ok(TECH_FORMS.includes(KOJ_ROBOT_FORMS.BATTLE_TOOL));
  assert.ok(TECH_FORMS.includes(KOJ_ROBOT_FORMS.SCANNER));
  assert.ok(TECH_FORMS.includes(KOJ_ROBOT_FORMS.PROJECTOR));
  assert.ok(!TECH_FORMS.includes(KOJ_ROBOT_FORMS.PET));
});

test("pet core lock blocks tech forms when hungry", () => {
  const state = createKojnozoutState({
    hunger: 90,
    energy: 80,
    robotModes: createRobotModesState({
      unlockedForms: [KOJ_ROBOT_FORMS.PET, KOJ_ROBOT_FORMS.SHIELD]
    })
  });
  const gate = canActivateForm(state, KOJ_ROBOT_FORMS.SHIELD, { miaPoints: 100 });
  assert.equal(gate.ok, false);
  assert.match(gate.reason, /pet_core_hungry/);
});

test("preview activate shield spends energy and keeps pet core fields", () => {
  const state = createKojnozoutState({
    hunger: 40,
    energy: 70,
    robotModes: createRobotModesState({
      unlockedForms: [KOJ_ROBOT_FORMS.PET, KOJ_ROBOT_FORMS.SHIELD]
    })
  });
  const cost = estimateFormCost(KOJ_ROBOT_FORMS.SHIELD);
  const result = previewActivateForm(state, KOJ_ROBOT_FORMS.SHIELD, {
    miaPoints: 20,
    now: 1_000_000
  });
  assert.equal(result.ok, true);
  assert.equal(result.state.robotModes.activeForm, KOJ_ROBOT_FORMS.SHIELD);
  assert.equal(result.state.energy, 70 - cost.energy);
  assert.equal(result.state.hunger, 40);
  assert.ok(result.state.robotModes.miaSync > 0);
});

test("combat power derives from bond energy and sync", () => {
  const state = createKojnozoutState({
    evolutionTier: "adult",
    energy: 80,
    bond: { careBond: 200, neglect: 0 },
    robotModes: createRobotModesState({ miaSync: 50 })
  });
  const power = deriveCombatPower(state);
  assert.ok(power >= 40 && power <= 100);
  const snap = getRobotModesSnapshot(state);
  assert.equal(snap.petCoreAlwaysOn, true);
  assert.equal(snap.activeForm, KOJ_ROBOT_FORMS.PET);
});
