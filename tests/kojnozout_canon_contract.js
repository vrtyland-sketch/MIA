"use strict";

const assert = require("assert");
const meta = require("../scripts/MIA_KOJNOZROUT_ITEM_META");
const itemCmd = require("../scripts/MIA_KOJNOZROUT_ITEM_COMMAND");
const care = require("../scripts/MIA_KOJNOZROUT_CARE");
const bond = require("../scripts/MIA_KOJNOZROUT_BOND");
const {
  createBackpackState,
  addItemToBackpack
} = require("../scripts/MIA_KOJNOZROUT_BACKPACK");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.equal(meta.resolveItemAlias("jablko"), "jablko");
  assert.equal(meta.resolveItemAlias("granule"), "granule");
  assert.equal(meta.resolveItemAlias("obvaz"), "obvaz");
  assert.ok(meta.isFoodItem("jablko"));
  assert.ok(meta.isHealItem("lektvar"));
  assert.ok(meta.isDuelItem("utok"));
  pass("canon item aliases and roles");

  assert.deepEqual(itemCmd.parseItemCommand("pouzij jablko"), {
    action: "feed",
    itemId: "jablko"
  });
  assert.deepEqual(itemCmd.parseItemCommand("dej granule"), {
    action: "feed",
    itemId: "granule"
  });
  assert.deepEqual(itemCmd.parseItemCommand("obvaz"), {
    action: "use",
    itemId: "obvaz"
  });
  pass("natural Czech item commands");

  const scratch = care.parseCareCommand("podrbi kojnozouta");
  assert.equal(scratch?.action, "podrbat");
  const feedChat = care.parseCareCommand("krmim koj");
  assert.equal(feedChat?.action, "nakrmit");
  pass("canon CARE verb patterns");

  let kojState = { hunger: 70, bond: bond.createBondState({ neglect: 40 }) };
  const beforeBond = kojState.bond.careBond;
  kojState = care.applyCareAction(kojState, care.CARE_ACTIONS.nakrmit);
  assert.ok(kojState.bond.careBond > beforeBond);
  assert.ok(kojState.bond.neglect < 40);
  pass("care action updates bond");

  let backpack = createBackpackState();
  backpack = addItemToBackpack(
    backpack,
    "Tester",
    { id: "jablko", label: "Jablko", power: 5 },
    { source: "gift" }
  );

  const feedResult = itemCmd.handleItemCommand({
    message: "pouzij jablko",
    userLabel: "Tester",
    backpackState: backpack,
    displayState: itemCmd.createItemDisplayState(),
    duelState: { active: false },
    kojnozoutState: { hunger: 75, bowlPercent: 8, bond: bond.createBondState() }
  });

  assert.equal(feedResult.action, "feed");
  assert.ok(feedResult.kojnozoutState.hunger < 75);
  assert.ok(feedResult.kojnozoutState.bond.careBond > 0);
  pass("pouzij jablko feeds and bonds");

  const snapshot = bond.getBondSnapshot({
    bond: bond.createBondState({ careBond: 120, neglect: 10 })
  });
  assert.equal(snapshot.bondTier, "friend");
  pass("bond snapshot tiers");

  console.log("\n---- KOJNOZROUT CANON CONTRACT ----");
  console.log("passed");
}

run();
