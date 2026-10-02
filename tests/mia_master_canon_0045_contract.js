"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const world = require("../shared/mia-world-core");
const battle = require("../shared/mia-battle-core");
const community = require("../shared/mia-community-core");
const architecture = require("../shared/mia-architecture-core");
const { assertRuntimeAnchors } = require("./runtime_anchor_assert");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0045-world-engine.md");
  const alignPath = path.join(MASTER, "0045-alignment.md");

  assert.ok(fs.existsSync(docPath), "0045-world-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0045-alignment.md exists");
  pass("0045 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 25; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0045 section ${i}`);
  }
  assert.ok(doc.includes("World Core"), "0045 critical priority");
  assert.ok(doc.includes("0044"), "0045 links to 0044");
  assert.ok(doc.includes("0046"), "0045 points to 0046");
  pass("0045 structure (25 sections)");

  assert.equal(world.WE_COMPONENT_ORDER.length, 12);
  pass("world components");

  assert.equal(world.WE_REGION_ORDER.length, 4);
  assert.ok(world.WE_DEFAULT_LOCATIONS[world.WE_REGION.CENTRAL].includes("mia_house"));
  assert.ok(world.WE_DEFAULT_LOCATIONS[world.WE_REGION.BATTLE].includes("boss_arena"));
  pass("default world map");

  const region = world.createRegion({ regionId: world.WE_REGION.ADVENTURE });
  assert.ok(region.locations.includes("magic_forest"));
  pass("region manager");

  const location = world.createLocation({ locationId: "hostinec", regionId: world.WE_REGION.CENTRAL });
  assert.equal(location.regionId, world.WE_REGION.CENTRAL);
  pass("location manager");

  const environment = world.manageEnvironment({ lighting: "warm", seasonalSkin: "winter" });
  assert.equal(environment.lighting, "warm");
  pass("environment manager");

  const weather = world.setWeather(world.WE_WEATHER.STORM);
  assert.equal(weather.battleImpact, "reduced_visibility");
  pass("weather manager");

  const time = world.advanceTimeOfDay(world.WE_TIME_OF_DAY.MORNING);
  assert.equal(time.to, world.WE_TIME_OF_DAY.DAY);
  pass("time manager");

  const worldEvent = world.scheduleWorldEvent({ eventId: world.WE_WORLD_EVENT.HALLOWEEN });
  assert.equal(worldEvent.worldWide, true);
  pass("event manager");

  const story = world.manageStory({ chapters: ["prolog"], mainPlot: "koj_journey" });
  assert.equal(story.longTerm, true);
  pass("story manager");

  const engine = world.createWorldEngine();
  const weatherChange = engine.processWorldEvent({ type: "weather_change", weather: world.WE_WEATHER.FOG });
  assert.equal(weatherChange.ok, true);
  assert.equal(weatherChange.weather, world.WE_WEATHER.FOG);
  pass("world event pipeline");

  const communityEngine = community.createCommunityEngine();
  const build = engine.processWorldEvent(
    {
      type: "community_build",
      locationId: "marketplace",
      communityInfluence: { unlockLocation: "marketplace", fromVote: true }
    },
    { communityEngine }
  );
  assert.equal(build.ok, true);
  assert.ok(build.communityEffect);
  pass("community world influence");

  const battleContext = engine.getBattleContext("tournament_arena");
  assert.equal(battleContext.readOnly, true);
  assert.equal(battleContext.battleManaged, false);
  assert.equal(battleContext.arenaId, "tournament_arena");
  pass("battle read-only world context");

  const questContext = engine.getQuestContext("magic_forest");
  assert.equal(questContext.readOnly, true);
  assert.equal(questContext.locationId, "magic_forest");
  pass("quest world context");

  const battleEngine = battle.createBattleEngine();
  const started = battleEngine.start({ fromDecision: true, participants: ["katka"] });
  assert.equal(started.ok, true);
  pass("battle independent of world management");

  const lifecycle = world.buildWorldLifecycle({
    design: true,
    approval: true,
    update: true,
    sync: true,
    render: true,
    history: true
  });
  assert.equal(lifecycle.lifecycle.length, 6);
  pass("world lifecycle pipeline");

  const blocked = engine.processWorldEvent({ type: "weather_change", controlsBattle: true });
  assert.equal(blocked.ok, false);
  pass("reject battle control");

  assert.equal(world.assertWorldForbiddenActivity("mutate_economy").ok, false);
  assert.equal(world.assertWorldForbiddenActivity("mutate_decision_engine").ok, false);
  pass("forbidden activities");

  const gameSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.GAME);
  assert.equal(gameSys.nextDocId, "0088");
  assert.ok(gameSys.runtime.includes("shared/mia-world-core/worldEngine.js"));
  pass("game system next doc 0047");

  const userSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.USER);
  assert.equal(userSys.nextDocId, "0088");
  pass("user system next doc 0047");

  assertRuntimeAnchors(world.WE_RUNTIME_ANCHORS);
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0045"), "README 0045");
  pass("README registry");

  console.log("\nMaster Canon 0045 contract: ALL PASS");
}

run();
