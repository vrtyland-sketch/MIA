"use strict";

const storyArcRegistry = require("./MIA_STORY_ARC_REGISTRY");
const graphicReference = require("./MIA_GRAPHIC_REFERENCE");
const immersiveScene = require("./MIA_IMMERSIVE_SCENE");
const overlayState = require("./MIA_OVERLAY_STATE");
const mediaCatalog = require("./MIA_MEDIA_CATALOG");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function loadArcCatalog(catalog = null) {
  const cat =
    catalog ||
    (typeof mediaCatalog.loadCatalog === "function" ? mediaCatalog.loadCatalog() : null);
  const videos = (cat?.items || []).filter((row) => row.kind === "videos");
  const arcs =
    cat?.narrativeArcs ||
    storyArcRegistry.buildNarrativeArcs(videos);
  const bossArcs = arcs.filter((arc) => arc.bossMissionReady);
  return { catalog: cat, arcs, bossArcs };
}

function getBossMissionCatalog(catalog = null) {
  const { bossArcs, arcs, catalog: cat } = loadArcCatalog(catalog);
  const graphicPool =
    cat?.graphicReferencePool ||
    graphicReference.buildGraphicReferencePool(
      (cat?.items || []).filter((row) => row.kind === "videos")
    );
  return {
    ok: true,
    arcCount: arcs.length,
    bossMissionArcs: bossArcs.length,
    graphicReferenceCount: graphicPool.length,
    graphicReferencePolicy: cat?.graphicReferencePolicy || {
      rule: "Pouze animovaná videa z Prahy jsou vzorem pro avatary a budoucí stream grafiku.",
      provider: "mia_graphic_reference_v1"
    },
    graphicReferencePool: graphicPool,
    arcs: bossArcs.map((arc) => ({
      id: arc.id,
      pattern: arc.pattern,
      durationBucket: arc.durationBucket,
      beatCount: arc.beatCount,
      progression: arc.progression,
      visualReference: arc.visualReference
    })),
    provider: "mia_boss_mission_v1"
  };
}

function resolveBossMission(input = {}, catalog = null) {
  const { catalog: cat, bossArcs } = loadArcCatalog(catalog);
  if (!bossArcs.length) {
    return { ok: false, reason: "no_boss_arcs" };
  }

  const arcId = safeString(input.arcId);
  const arc =
    (arcId ? bossArcs.find((row) => row.id === arcId) : null) ||
    storyArcRegistry.pickBossMissionArc(
      bossArcs,
      safeString(input.userLabel || input.nickname || input.seed, "koj_boss")
    );

  if (!arc) {
    return { ok: false, reason: "arc_not_found" };
  }

  const plan = storyArcRegistry.buildBossMissionPlan(arc, input, cat);
  return { ok: plan.ok === true, arc, plan, reason: plan.reason || null };
}

function applyBossMission(state, input = {}, options = {}) {
  const resolved = resolveBossMission(input, options.catalog);
  if (!resolved.ok || !resolved.plan?.ok) {
    return resolved;
  }

  const plan = resolved.plan;
  const immersiveApplied = immersiveScene.applyImmersiveScene(state, {
    ...plan.immersive,
    holdMs: plan.holdMs,
    trigger: safeString(input.trigger, "boss_mission"),
    userLabel: plan.userLabel
  });

  if (typeof overlayState.setBossMission === "function") {
    overlayState.setBossMission(state, {
      ...plan,
      active: true,
      immersiveApplied
    });
  }

  let cinematic = null;
  if (options.activateCinematic !== false && plan.bossCinematic) {
    cinematic = {
      kind: "MEGA_BOSS",
      title: plan.bossCinematic.title,
      subtext: plan.subtitle || plan.userLabel,
      tier: plan.bossCinematic.tier || "T5",
      userLabel: plan.userLabel,
      holdMs: plan.bossCinematic.holdMs,
      source: "boss_mission",
      priority: 7,
      meta: {
        bossEvent: "boss_mission",
        arcId: plan.arcId,
        streamTier: plan.bossCinematic.tier || "T5"
      }
    };
    if (typeof overlayState.setBossCinematic === "function") {
      overlayState.setBossCinematic(state, cinematic);
    }
  }

  return {
    ok: true,
    arc: resolved.arc,
    plan,
    immersive: immersiveApplied,
    bossCinematic: cinematic,
    playHint: plan.bossPhase
      ? {
          tier: plan.bossPhase.tier,
          sourceName: plan.bossPhase.sourceName,
          mediaRel: plan.bossPhase.rel,
          playbackMs: plan.bossPhase.durationMs
        }
      : null
  };
}

function clearBossMission(state) {
  if (typeof overlayState.clearBossMission === "function") {
    overlayState.clearBossMission(state);
  }
  immersiveScene.clearImmersiveScene(state);
  if (typeof overlayState.clearBossCinematic === "function") {
    overlayState.clearBossCinematic(state);
  }
  return { ok: true, cleared: true };
}

module.exports = {
  getBossMissionCatalog,
  resolveBossMission,
  applyBossMission,
  clearBossMission,
  loadArcCatalog
};
