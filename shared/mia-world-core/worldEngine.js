"use strict";

/**
 * Master Canon 0045 — World Engine: central digital world management for MIA platform.
 */

const crypto = require("crypto");

const WE_COMPONENT = Object.freeze({
  WORLD_MANAGER: "world_manager",
  REGION_MANAGER: "region_manager",
  LOCATION_MANAGER: "location_manager",
  ENVIRONMENT_MANAGER: "environment_manager",
  WEATHER_MANAGER: "weather_manager",
  TIME_MANAGER: "time_manager",
  EVENT_MANAGER: "event_manager",
  STORY_MANAGER: "story_manager",
  WORLD_ANALYTICS: "world_analytics",
  WORLD_HISTORY: "world_history",
  WORLD_PERSISTENCE: "world_persistence",
  WORLD_API: "world_api"
});

const WE_COMPONENT_ORDER = Object.freeze(Object.values(WE_COMPONENT));

const WE_REGION = Object.freeze({
  CENTRAL: "central",
  BATTLE: "battle",
  ADVENTURE: "adventure",
  COMMUNITY: "community"
});

const WE_REGION_ORDER = Object.freeze(Object.values(WE_REGION));

const WE_WEATHER = Object.freeze({
  SUNNY: "sunny",
  RAIN: "rain",
  FOG: "fog",
  STORM: "storm",
  SNOW: "snow",
  WIND: "wind"
});

const WE_TIME_OF_DAY = Object.freeze({
  MORNING: "morning",
  DAY: "day",
  EVENING: "evening",
  NIGHT: "night"
});

const WE_TIME_ORDER = Object.freeze(Object.values(WE_TIME_OF_DAY));

const WE_WORLD_EVENT = Object.freeze({
  HALLOWEEN: "halloween",
  CHRISTMAS: "christmas",
  BATTLE_FESTIVAL: "battle_festival",
  KOJ_DAY: "koj_day",
  ANNIVERSARY: "anniversary"
});

const WE_DEFAULT_LOCATIONS = Object.freeze({
  [WE_REGION.CENTRAL]: Object.freeze(["mia_house", "koj_bowl", "community_square"]),
  [WE_REGION.BATTLE]: Object.freeze(["training_arena", "tournament_arena", "boss_arena"]),
  [WE_REGION.ADVENTURE]: Object.freeze(["magic_forest", "cave", "old_castle"]),
  [WE_REGION.COMMUNITY]: Object.freeze(["marketplace", "hall_of_legends", "vip_lounge"])
});

const WE_FORBIDDEN_ACTIVITIES = Object.freeze([
  "control_battle",
  "mutate_economy",
  "mutate_personality",
  "mutate_decision_engine",
  "generate_ai_responses"
]);

const WE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-world-core/worldEngine.js",
  "data/kojnozout-world.json",
  "scripts/MIA_KOJNOZROUT_ENGINE.js",
  "scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE.js",
  "shared/mia-community-core/communityEngine.js",
  "shared/mia-battle-core/battleEngine.js"
]);

function manageWorld(input = {}) {
  return Object.freeze({
    ok: true,
    worldId: input.worldId || "mia-world",
    activeRegions: Object.freeze(input.activeRegions || WE_REGION_ORDER),
    state: input.state || "active",
    config: Object.freeze(input.config || {}),
    persistentAcrossStreams: true,
    component: WE_COMPONENT.WORLD_MANAGER
  });
}

function createRegion(input = {}) {
  const regionId = input.regionId || WE_REGION.CENTRAL;
  return Object.freeze({
    ok: true,
    regionId,
    name: input.name || regionId,
    locations: Object.freeze(input.locations || WE_DEFAULT_LOCATIONS[regionId] || []),
    rules: Object.freeze(input.rules || {}),
    unlocked: input.unlocked !== false,
    component: WE_COMPONENT.REGION_MANAGER
  });
}

function createLocation(input = {}) {
  return Object.freeze({
    ok: true,
    locationId: input.locationId || `loc-${crypto.randomUUID()}`,
    regionId: input.regionId || WE_REGION.CENTRAL,
    name: input.name || input.locationId,
    objects: Object.freeze(input.objects || []),
    component: WE_COMPONENT.LOCATION_MANAGER
  });
}

function manageEnvironment(input = {}) {
  return Object.freeze({
    ok: true,
    lighting: input.lighting || "daylight",
    vegetation: input.vegetation || "default",
    decorations: Object.freeze(input.decorations || []),
    seasonalSkin: input.seasonalSkin || null,
    effects: Object.freeze(input.effects || []),
    component: WE_COMPONENT.ENVIRONMENT_MANAGER
  });
}

function setWeather(weather = WE_WEATHER.SUNNY) {
  const battleImpact =
    weather === WE_WEATHER.STORM || weather === WE_WEATHER.SNOW
      ? "reduced_visibility"
      : weather === WE_WEATHER.RAIN
        ? "slippery"
        : "none";
  return Object.freeze({
    ok: true,
    weather,
    battleImpact,
    eventImpact: weather === WE_WEATHER.FOG ? "mystery_events" : null,
    component: WE_COMPONENT.WEATHER_MANAGER
  });
}

function advanceTimeOfDay(current = WE_TIME_OF_DAY.MORNING) {
  const index = WE_TIME_ORDER.indexOf(current);
  const next = WE_TIME_ORDER[(index + 1) % WE_TIME_ORDER.length];
  return Object.freeze({
    ok: true,
    from: current,
    to: next,
    animationCue: next,
    musicCue: next,
    questAvailability: next === WE_TIME_OF_DAY.NIGHT ? "night_quests" : "standard",
    component: WE_COMPONENT.TIME_MANAGER
  });
}

function scheduleWorldEvent(input = {}) {
  return Object.freeze({
    ok: true,
    eventId: input.eventId || WE_WORLD_EVENT.BATTLE_FESTIVAL,
    name: input.name || input.eventId,
    active: input.active !== false,
    worldWide: true,
    component: WE_COMPONENT.EVENT_MANAGER
  });
}

function manageStory(input = {}) {
  return Object.freeze({
    ok: true,
    storyId: input.storyId || `story-${crypto.randomUUID()}`,
    chapters: Object.freeze(input.chapters || []),
    mainPlot: input.mainPlot || null,
    sidePlots: Object.freeze(input.sidePlots || []),
    npc: Object.freeze(input.npc || []),
    dialogues: Object.freeze(input.dialogues || []),
    longTerm: true,
    component: WE_COMPONENT.STORY_MANAGER
  });
}

function collectWorldAnalytics(run = {}) {
  return Object.freeze({
    activeRegions: run.activeRegions || 0,
    topLocations: Object.freeze(run.topLocations || []),
    activeEvents: run.activeEvents || 0,
    battleAreas: run.battleAreas || 0,
    communityActivity: run.communityActivity || 0,
    component: WE_COMPONENT.WORLD_ANALYTICS
  });
}

function recordWorldHistory(event = {}, payload = {}) {
  return Object.freeze({
    ok: true,
    historyId: `world-hist-${crypto.randomUUID()}`,
    event,
    payload: Object.freeze(payload),
    immutable: true,
    recordedAt: Date.now(),
    component: WE_COMPONENT.WORLD_HISTORY
  });
}

function persistWorld(snapshot = {}) {
  return Object.freeze({
    ok: true,
    snapshotId: `world-snap-${crypto.randomUUID()}`,
    snapshot: Object.freeze(snapshot),
    persistedAt: Date.now(),
    component: WE_COMPONENT.WORLD_PERSISTENCE
  });
}

function buildWorldPipeline(stages = {}) {
  return Object.freeze({
    ok: true,
    pipeline: Object.freeze([
      { step: "event", done: Boolean(stages.event) },
      { step: "world_update", done: Boolean(stages.worldUpdate) },
      { step: "region", done: Boolean(stages.region) },
      { step: "location", done: Boolean(stages.location) },
      { step: "community", done: Boolean(stages.community) },
      { step: "history", done: Boolean(stages.history) }
    ]),
    component: WE_COMPONENT.WORLD_MANAGER
  });
}

function buildWorldLifecycle(stages = {}) {
  return Object.freeze({
    ok: true,
    lifecycle: Object.freeze([
      { step: "design", done: Boolean(stages.design) },
      { step: "approval", done: Boolean(stages.approval) },
      { step: "update", done: Boolean(stages.update) },
      { step: "synchronization", done: Boolean(stages.sync) },
      { step: "render", done: Boolean(stages.render) },
      { step: "history", done: Boolean(stages.history) }
    ]),
    component: WE_COMPONENT.WORLD_MANAGER
  });
}

function validateWorldInput(input = {}) {
  const errors = [];
  if (input.controlsBattle === true) errors.push("battle_control_forbidden");
  if (input.mutatesEconomy === true) errors.push("economy_mutation_forbidden");
  if (input.mutatesPersonality === true) errors.push("personality_mutation_forbidden");
  if (input.mutatesDecisionEngine === true) errors.push("decision_engine_mutation_forbidden");
  if (input.generatesAiResponses === true) errors.push("ai_response_generation_forbidden");
  if (input.bypassPipeline === true) errors.push("pipeline_required");
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    component: WE_COMPONENT.WORLD_API
  });
}

function getBattleWorldContext(world = {}, locationId = "training_arena") {
  return Object.freeze({
    ok: true,
    readOnly: true,
    arenaId: locationId,
    regionId: WE_REGION.BATTLE,
    weather: world.weather || WE_WEATHER.SUNNY,
    timeOfDay: world.timeOfDay || WE_TIME_OF_DAY.DAY,
    environment: world.environment || manageEnvironment(),
    battleManaged: false,
    component: WE_COMPONENT.WORLD_API
  });
}

function getQuestWorldContext(world = {}, locationId = "magic_forest") {
  return Object.freeze({
    ok: true,
    readOnly: true,
    locationId,
    regionId: world.locationRegion?.[locationId] || WE_REGION.ADVENTURE,
    weather: world.weather,
    timeOfDay: world.timeOfDay,
    season: world.activeEvent || null,
    component: WE_COMPONENT.WORLD_API
  });
}

function applyCommunityWorldInfluence(influence = {}) {
  const unlockRegion = influence.unlockRegion || null;
  const unlockLocation = influence.unlockLocation || null;
  return Object.freeze({
    ok: true,
    unlockRegion,
    unlockLocation,
    communityVoteApplied: influence.fromVote === true,
    component: WE_COMPONENT.WORLD_MANAGER
  });
}

function assertWorldForbiddenActivity(activity) {
  const key = String(activity || "");
  return { ok: !WE_FORBIDDEN_ACTIVITIES.includes(key), activity: key };
}

function createWorldEngine(options = {}) {
  const history = [];
  const regions = new Map();
  const locations = new Map();
  const locationRegion = {};
  let weather = options.weather || WE_WEATHER.SUNNY;
  let timeOfDay = options.timeOfDay || WE_TIME_OF_DAY.MORNING;
  let environment = manageEnvironment(options.environment || {});
  let activeEvent = options.activeEvent || null;

  const world = manageWorld({ worldId: options.worldId || "mia-world" });

  for (const regionId of WE_REGION_ORDER) {
    const region = createRegion({ regionId, locations: WE_DEFAULT_LOCATIONS[regionId] });
    regions.set(regionId, { ...region, unlocked: true });
    for (const locationId of WE_DEFAULT_LOCATIONS[regionId]) {
      locations.set(locationId, {
        locationId,
        regionId,
        name: locationId,
        objects: [],
        unlocked: true
      });
      locationRegion[locationId] = regionId;
    }
  }

  return {
    getRegion(regionId) {
      return regions.get(regionId) || null;
    },
    getLocation(locationId) {
      return locations.get(locationId) || null;
    },
    processWorldEvent(event = {}, adapters = {}) {
      const validation = validateWorldInput({
        controlsBattle: event.controlsBattle,
        mutatesEconomy: event.mutatesEconomy,
        mutatesPersonality: event.mutatesPersonality,
        mutatesDecisionEngine: event.mutatesDecisionEngine,
        generatesAiResponses: event.generatesAiResponses,
        bypassPipeline: event.bypassPipeline
      });
      if (!validation.ok) {
        return Object.freeze({
          ok: false,
          error: "invalid_world_input",
          validation,
          decides: false,
          component: WE_COMPONENT.WORLD_API
        });
      }

      let regionUpdate = null;
      let locationUpdate = null;
      let communityEffect = null;

      if (event.type === "weather_change") {
        const next = setWeather(event.weather || WE_WEATHER.RAIN);
        weather = next.weather;
      }

      if (event.type === "time_advance") {
        const next = advanceTimeOfDay(timeOfDay);
        timeOfDay = next.to;
      }

      if (event.type === "world_event") {
        const scheduled = scheduleWorldEvent({ eventId: event.eventId, active: true });
        activeEvent = scheduled.eventId;
        environment = manageEnvironment({
          ...environment,
          seasonalSkin: scheduled.eventId
        });
      }

      if (event.type === "unlock_region" && event.regionId) {
        const region = regions.get(event.regionId);
        if (region) {
          region.unlocked = true;
          regions.set(event.regionId, region);
          regionUpdate = createRegion(region);
        }
      }

      if (event.type === "unlock_location" && event.locationId) {
        const location = locations.get(event.locationId);
        if (location) {
          location.unlocked = true;
          locations.set(event.locationId, location);
          locationUpdate = createLocation(location);
        }
      }

      if (event.communityInfluence) {
        communityEffect = applyCommunityWorldInfluence(event.communityInfluence);
        if (communityEffect.unlockRegion && regions.has(communityEffect.unlockRegion)) {
          const region = regions.get(communityEffect.unlockRegion);
          region.unlocked = true;
          regions.set(communityEffect.unlockRegion, region);
        }
        if (communityEffect.unlockLocation && locations.has(communityEffect.unlockLocation)) {
          const location = locations.get(communityEffect.unlockLocation);
          location.unlocked = true;
          locations.set(communityEffect.unlockLocation, location);
          locationUpdate = createLocation(location);
        }
      }

      if (adapters.communityEngine && event.type === "community_build") {
        communityEffect = applyCommunityWorldInfluence({
          unlockLocation: event.locationId,
          fromVote: true
        });
      }

      const hist = recordWorldHistory(event.type || "world_event", {
        weather,
        timeOfDay,
        activeEvent,
        regionId: event.regionId || null,
        locationId: event.locationId || null
      });
      history.push(hist);

      const analytics = collectWorldAnalytics({
        activeRegions: Array.from(regions.values()).filter((r) => r.unlocked).length,
        topLocations: Array.from(locations.keys()).slice(0, 3),
        activeEvents: activeEvent ? 1 : 0,
        battleAreas: WE_DEFAULT_LOCATIONS[WE_REGION.BATTLE].length,
        communityActivity: event.type === "community_build" ? 1 : 0
      });

      const pipeline = buildWorldPipeline({
        event: true,
        worldUpdate: true,
        region: Boolean(regionUpdate) || !event.regionId,
        location: Boolean(locationUpdate) || !event.locationId,
        community: !event.communityInfluence || Boolean(communityEffect),
        history: true
      });

      const lifecycle = buildWorldLifecycle({
        design: true,
        approval: event.approved !== false,
        update: true,
        sync: true,
        render: event.renderPlan !== false,
        history: true
      });

      const persistence = persistWorld({
        worldId: world.worldId,
        weather,
        timeOfDay,
        regions: Array.from(regions.keys()),
        locations: Array.from(locations.keys())
      });

      return Object.freeze({
        ok: pipeline.pipeline.every((s) => s.done),
        weather,
        timeOfDay,
        environment,
        activeEvent,
        region: regionUpdate,
        location: locationUpdate,
        communityEffect,
        analytics,
        pipeline,
        lifecycle,
        persistence,
        controlsBattle: false,
        mutatesEconomy: false,
        decides: false,
        component: WE_COMPONENT.WORLD_API
      });
    },
    getBattleContext(arenaId = "training_arena") {
      return getBattleWorldContext(
        { weather, timeOfDay, environment, locationRegion },
        arenaId
      );
    },
    getQuestContext(locationId = "magic_forest") {
      return getQuestWorldContext(
        { weather, timeOfDay, activeEvent, locationRegion },
        locationId
      );
    },
    snapshot() {
      return persistWorld({
        worldId: world.worldId,
        weather,
        timeOfDay,
        activeEvent,
        regions: Array.from(regions.entries()),
        locations: Array.from(locations.entries())
      });
    },
    history() {
      return Object.freeze([...history]);
    }
  };
}

function createWorldApiResponse(data = {}, options = {}) {
  return Object.freeze({
    ok: true,
    decides: false,
    executes: options.executes === true,
    data,
    component: WE_COMPONENT.WORLD_API
  });
}

module.exports = {
  WE_COMPONENT,
  WE_COMPONENT_ORDER,
  WE_REGION,
  WE_REGION_ORDER,
  WE_WEATHER,
  WE_TIME_OF_DAY,
  WE_TIME_ORDER,
  WE_WORLD_EVENT,
  WE_DEFAULT_LOCATIONS,
  WE_FORBIDDEN_ACTIVITIES,
  WE_RUNTIME_ANCHORS,
  manageWorld,
  createRegion,
  createLocation,
  manageEnvironment,
  setWeather,
  advanceTimeOfDay,
  scheduleWorldEvent,
  manageStory,
  collectWorldAnalytics,
  recordWorldHistory,
  persistWorld,
  buildWorldPipeline,
  buildWorldLifecycle,
  validateWorldInput,
  getBattleWorldContext,
  getQuestWorldContext,
  applyCommunityWorldInfluence,
  createWorldEngine,
  createWorldApiResponse,
  assertWorldForbiddenActivity
};
