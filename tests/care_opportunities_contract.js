"use strict";

const assert = require("assert");
const opportunities = require("../scripts/MIA_KOJNOZROUT_CARE_OPPORTUNITIES");
const quest = require("../scripts/MIA_KOJNOZROUT_CARE_QUEST");
const {
  createBackpackState,
  addItemToBackpack
} = require("../scripts/MIA_KOJNOZROUT_BACKPACK");
const itemCmd = require("../scripts/MIA_KOJNOZROUT_ITEM_COMMAND");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  assert.equal(opportunities.resolvePrimaryNeed({ mood: "sad", affliction: "sad" }), "sad");
  assert.equal(opportunities.resolvePrimaryNeed({ hunger: 70, mood: "hungry" }), "hungry");
  pass("primary need resolver");

  let backpack = createBackpackState();
  backpack = addItemToBackpack(
    backpack,
    "Tester",
    { id: "snack", label: "Svačina", power: 6 },
    { source: "gift" }
  );

  const hungryOp = opportunities.buildCareOpportunities({
    kojnozoutState: { hunger: 72, mood: "hungry", bowlPercent: 10 },
    backpackState: backpack,
    userLabel: "Tester"
  });

  assert.equal(hungryOp.need, "hungry");
  assert.ok(hungryOp.options.some((row) => row.id === "feed_snack"));
  assert.ok(hungryOp.quest?.active);
  pass("hungry state exposes feed options and quest");

  let kojState = { hunger: 80, mood: "hungry", bowlPercent: 5 };
  const ensured = quest.ensureCareQuest(kojState, "hungry");
  kojState = ensured.state;

  const p1 = quest.progressCareQuest(
    kojState,
    { message: "ahoj koj" },
    "COMMENT",
    "Alice"
  );
  const p2 = quest.progressCareQuest(
    p1.state,
    { message: "cau kojnozroute" },
    "COMMENT",
    "Bob"
  );
  const p3 = quest.progressCareQuest(
    p2.state,
    { message: "nakrm koj" },
    "COMMENT",
    "Carol"
  );

  assert.equal(p3.completed, true);
  assert.ok(p3.state.hunger < 80);
  pass("hungry greet quest completes with 3 unique users");

  const feedResult = itemCmd.handleItemCommand({
    message: "item feed snack",
    userLabel: "Tester",
    backpackState: backpack,
    displayState: itemCmd.createItemDisplayState(),
    duelState: { active: false },
    kojnozoutState: { hunger: 75, bowlPercent: 8 }
  });

  assert.equal(feedResult.action, "feed");
  assert.ok(feedResult.kojnozoutState.hunger < 75);
  pass("item feed snack reduces hunger");

  console.log("\n---- CARE OPPORTUNITIES CONTRACT ----");
  console.log("passed");
}

run();
