"use strict";

const assert = require("assert");
const itemCmd = require("../scripts/MIA_KOJNOZROUT_ITEM_COMMAND");
const itemFx = require("../scripts/MIA_KOJNOZROUT_ITEM_EFFECT");
const care = require("../scripts/MIA_KOJNOZROUT_CARE");
const {
  createBackpackState,
  addItemToBackpack
} = require("../scripts/MIA_KOJNOZROUT_BACKPACK");
const { createDuelState, ingestDuelContribution } = require("../scripts/MIA_KOJNOZROUT_DUEL");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.equal(itemCmd.parseItemCommand("item").action, "show");
  assert.equal(itemCmd.parseItemCommand("batoh").action, "show");
  assert.equal(itemCmd.parseItemCommand("polozka").action, "show");
  assert.equal(itemCmd.parseItemCommand("položka").action, "show");
  assert.equal(itemCmd.parseItemCommand("otevri batoh").action, "show");
  assert.equal(itemCmd.parseItemCommand("ukaz polozky").action, "show");
  assert.equal(itemCmd.parseItemCommand("item use boost").action, "use");
  assert.equal(itemCmd.parseItemCommand("item use boost").itemId, "boost");
  assert.equal(itemCmd.parseItemCommand("batoh use boost").action, "use");
  assert.equal(itemCmd.parseItemCommand("batoh use boost").itemId, "boost");
  assert.equal(itemCmd.parseItemCommand("polozka use boost").action, "use");
  assert.equal(itemCmd.parseItemCommand("polozka use boost").itemId, "boost");
  pass("item command parser recognizes show and use");

  let backpack = createBackpackState();
  backpack = addItemToBackpack(
    backpack,
    "Tester",
    { id: "boost", label: "Boost", power: 12 },
    { source: "gift" }
  );

  let display = itemCmd.createItemDisplayState();
  const showResult = itemCmd.handleItemCommand({
    message: "item",
    userLabel: "Tester",
    backpackState: backpack,
    displayState: display,
    duelState: { active: false },
    kojnozoutState: {}
  });

  assert.equal(showResult.handled, true);
  assert.equal(showResult.action, "show");
  assert.ok(showResult.overlayPayload.text.includes("Boost"));
  pass("item show opens backpack overlay payload");

  display = showResult.displayState;
  let duel = createDuelState({ active: true, phase: "active" });
  const useResult = itemCmd.handleItemCommand({
    message: "item use",
    userLabel: "Tester",
    backpackState: showResult.backpackState,
    displayState: display,
    duelState: duel,
    kojnozoutState: { hunger: 70 },
    duelModule: { ingestDuelContribution }
  });

  assert.equal(useResult.handled, true);
  assert.equal(useResult.action, "use");
  assert.equal(useResult.item.id, "boost");
  assert.ok(useResult.overlayPayload.text.includes("Boost"));
  pass("item use consumes backpack item in duel");

  const healEffect = itemFx.resolveItemUseEffect({ id: "lektvar", label: "Lektvar", power: 9 }, { action: "use" });
  assert.equal(healEffect.role, "heal");
  assert.equal(healEffect.prop, "hand");
  assert.equal(healEffect.cycleId, "battle-defend");
  pass("item effect maps heal items to hand + defend cycle");

  const duelEffect = itemFx.resolveItemUseEffect({ id: "utok", label: "Útok", power: 14 }, { duelActive: true, action: "use" });
  assert.equal(duelEffect.role, "duel");
  assert.equal(duelEffect.pose, "attack");
  pass("item effect maps duel items to attack pose");

  let feedState = { hunger: 70, vitals: { wellbeing: 0 }, bowlPercent: 20 };
  feedState = itemFx.applyItemUseToState(feedState, { id: "jablko", label: "Jablko", power: 5 }, { action: "feed", userLabel: "Tester" });
  assert.ok(feedState.hunger < 70);
  assert.ok(feedState.lastItemUse?.itemId === "jablko");
  assert.ok(feedState.lastItemUse?.effect?.role === "food");
  pass("item feed applies vitals + lastItemUse pulse");

  const arenaBattle = require("../scripts/MIA_ARENA_BATTLE");
  const utokMove = arenaBattle.resolveMoveFromItem({ id: "utok", role: "duel", label: "Útok", power: 14 });
  assert.equal(utokMove.projectile, "spark");
  assert.equal(utokMove.effect, "damage");
  const lekMove = arenaBattle.resolveMoveFromItem({ id: "lektvar", role: "heal", label: "Lektvar", power: 9 });
  assert.equal(lekMove.projectile, "heart");
  assert.equal(lekMove.effect, "heal");
  pass("arena battle move uses item effect projectiles");

  const careParsed = care.parseCareCommand("podrbi kojnozouta");
  assert.equal(careParsed.action, "podrbat");
  const afterCare = care.applyCareAction(
    { hunger: 60, vitals: { wellbeing: 0, sleepDepth: 40 }, socialState: 0 },
    careParsed.config
  );
  assert.ok(afterCare.vitals.wellbeing > 0);
  pass("care command applies vitals impact");

  assert.equal(care.resolveVitalsBankKey({ mood: "sleepy", isSleeping: true }), "koj_vitals_sleepy");
  assert.equal(care.resolveVitalsBankKey({ affliction: "sick" }), "koj_vitals_sick");
  pass("vitals bank key resolver maps moods");

  display = itemCmd.createItemDisplayState();
  const aliceResult = itemCmd.handleItemCommand({
    message: "item",
    userLabel: "Alice",
    backpackState: backpack,
    displayState: display,
    duelState: { active: false },
    kojnozoutState: {}
  });
  display = aliceResult.displayState;
  const bobResult = itemCmd.handleItemCommand({
    message: "item",
    userLabel: "Bob",
    backpackState: backpack,
    displayState: display,
    duelState: { active: false },
    kojnozoutState: {}
  });
  assert.ok(
    (bobResult.displayState.queue.length >= 1) ||
      (aliceResult.displayState.current && bobResult.displayState.current)
  );
  pass("multiple item requests enqueue viewers");

  console.log("\n---- KOJNOZROUT ITEM CARE CONTRACT ----");
  console.log("passed");
}

run();
