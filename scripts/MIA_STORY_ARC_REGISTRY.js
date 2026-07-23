"use strict";

/**
 * Příběhové oblouky — podobná videa (pattern + délka) seskupená pro boss mise / avatar / sochy.
 */

const crypto = require("crypto");
const graphicReference = require("./MIA_GRAPHIC_REFERENCE");

const ARC_KIND_ORDER = Object.freeze({
  quote_clip: 0,
  donator_moment: 1,
  story_music: 2,
  story_epic: 3,
  story_legend: 4
});

const ARC_ROLE_BY_KIND = Object.freeze({
  quote_clip: "voice_seed",
  donator_moment: "intro",
  story_music: "chapter",
  story_epic: "climax",
  story_legend: "boss_gate"
});

const NARRATIVE_KINDS = new Set(Object.keys(ARC_KIND_ORDER));
const STATUE_KINDS = new Set(["story_legend", "story_epic"]);

const ROLE_TO_TIER = Object.freeze({
  voice_seed: "T2",
  intro: "T2",
  chapter: "T3",
  climax: "T4",
  boss_gate: "T5"
});

const PATTERN_TO_CREATURE = Object.freeze({
  lv_edit: "bio_hunter_alpha",
  photos_export: "shadow_stalker",
  whatsapp_video: "neon_gladiator"
});

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function arcKindRank(contentKind = "") {
  return ARC_KIND_ORDER[safeString(contentKind)] ?? 99;
}

function clusterKey(item = {}) {
  return `${safeString(item.pattern, "other")}|${safeString(item.durationBucket, "unknown")}`;
}

function hashKey(input = "") {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 10);
}

function buildArcBeat(item = {}) {
  return {
    mediaId: item.id,
    rel: item.rel,
    name: item.name,
    contentKind: item.contentKind,
    contentKindLabel: item.contentKindLabel || item.contentKind,
    role: ARC_ROLE_BY_KIND[item.contentKind] || "beat",
    durationMs: item.durationMs ?? null,
    hasEmbeddedAudio: item.hasEmbeddedAudio,
    qualityScore: item.qualityScore ?? null,
    suggestedTier: item.suggestedTier || null
  };
}

function buildNarrativeArcs(videos = [], options = {}) {
  const minBeats = Math.max(2, Number(options.minBeats) || 2);
  const graphicPool =
    options.graphicReferencePool ||
    graphicReference.buildGraphicReferencePool(videos);
  const groups = new Map();

  for (const item of videos) {
    if (item?.kind !== "videos") continue;
    if (!NARRATIVE_KINDS.has(safeString(item.contentKind))) continue;
    const key = clusterKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const arcs = [];
  for (const [clusterId, members] of groups.entries()) {
    if (members.length < minBeats) continue;

    const sorted = members.slice().sort((a, b) => {
      const rank = arcKindRank(a.contentKind) - arcKindRank(b.contentKind);
      if (rank !== 0) return rank;
      return (b.qualityScore || 0) - (a.qualityScore || 0);
    });

    const beats = sorted.map(buildArcBeat);
    const hasStatue = beats.some((b) => STATUE_KINDS.has(b.contentKind));
    const arcId = `arc_${hashKey(clusterId)}`;
    const visRef = graphicReference.resolveArcVisualReference(
      { id: arcId, pattern: sorted[0]?.pattern },
      graphicPool,
      clusterId
    );

    arcs.push({
      id: arcId,
      clusterId,
      pattern: sorted[0]?.pattern || "other",
      durationBucket: sorted[0]?.durationBucket || "unknown",
      beatCount: beats.length,
      beats,
      progression: beats.map((b) => b.contentKind),
      bossMissionReady: hasStatue && beats.length >= 3,
      avatarSeedRel: visRef.avatarFrom || null,
      statueRel: visRef.bossStatueFrom || null,
      visualReference: visRef
    });
  }

  return arcs.sort((a, b) => {
    if (a.bossMissionReady !== b.bossMissionReady) {
      return a.bossMissionReady ? -1 : 1;
    }
    return b.beatCount - a.beatCount;
  });
}

function pickBossMissionArc(arcs = [], seed = "") {
  const ready = (arcs || []).filter((a) => a.bossMissionReady);
  if (!ready.length) return null;
  let hash = 0;
  const label = safeString(seed, "koj_boss");
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return ready[hash % ready.length];
}

function resolveObsSourceForRel(catalog, rel = "", tier = "T3") {
  const hit = (catalog?.obsAssignments || []).find((row) => row.rel === rel);
  if (hit?.obsSource) return hit.obsSource;
  const slots = catalog?.tierSlotNames?.[tier] || [];
  return slots[0] || `${tier}_VIDEO_05`;
}

function resolveCreatureIdForArc(arc = {}, seed = "") {
  const fromPattern = PATTERN_TO_CREATURE[safeString(arc.pattern)];
  if (fromPattern) return fromPattern;
  let hash = 0;
  const label = safeString(seed, arc.id || "koj");
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  const ids = Object.values(PATTERN_TO_CREATURE);
  return ids[hash % ids.length] || "bio_hunter_alpha";
}

function buildBossMissionPlan(arc = {}, input = {}, catalog = null) {
  if (!arc?.bossMissionReady) {
    return { ok: false, reason: "arc_not_ready" };
  }

  const userLabel = safeString(input.userLabel || input.nickname, "Divák");
  const beats = (arc.beats || []).slice().sort((a, b) => arcKindRank(a.contentKind) - arcKindRank(b.contentKind));
  const missionBeats = beats.length > 4 ? beats.slice(-4) : beats;

  const phases = missionBeats.map((beat, index) => {
    const tier = ROLE_TO_TIER[beat.role] || ["T2", "T3", "T4", "T5"][index] || "T3";
    return {
      index,
      role: beat.role,
      tier,
      mediaId: beat.mediaId,
      rel: beat.rel,
      sourceName: resolveObsSourceForRel(catalog, beat.rel, tier),
      durationMs: beat.durationMs,
      contentKind: beat.contentKind,
      caption: `${userLabel} · ${beat.contentKindLabel || beat.contentKind}`
    };
  });

  const totalDurationMs = phases.reduce((sum, row) => sum + Math.max(0, Number(row.durationMs) || 0), 0);
  const holdMs = Math.max(22000, totalDurationMs + 6000);
  const creatureId = resolveCreatureIdForArc(arc, userLabel);
  const bossPhase = phases.find((row) => row.role === "boss_gate") || phases[phases.length - 1];
  const visualReference = arc.visualReference || {};
  const graphicStyleBrief = visualReference.avatarFrom
    ? graphicReference.buildGraphicStyleBrief({
        rel: visualReference.avatarFrom,
        theme: visualReference.theme,
        visualSummary: visualReference.visualSummary,
        graphicRole: "avatar_seed"
      })
    : null;

  return {
    ok: true,
    missionId: `boss_${arc.id}_${Date.now()}`,
    arcId: arc.id,
    title: `Boss mise — ${userLabel}`,
    subtitle: arc.pattern ? `${arc.pattern} · ${arc.durationBucket}` : "",
    userLabel,
    phases,
    currentPhase: 0,
    bossPhase,
    holdMs,
    visualReference,
    graphicStyleBrief,
    avatarSeedRel: arc.avatarSeedRel || visualReference.avatarFrom || null,
    statueRel: arc.statueRel || visualReference.bossStatueFrom || null,
    immersive: {
      mode: "combat",
      combat: true,
      environmentId: "arena_combat_neon",
      creatureId,
      userLabel,
      chatText: safeString(input.chatText, "boss mise"),
      cameraCount: 6
    },
    bossCinematic: {
      kind: "MEGA_BOSS",
      tier: bossPhase?.tier || "T5",
      title: "BOSS MISE",
      subtext: userLabel,
      holdMs: Math.min(holdMs, 14000),
      source: "boss_mission"
    },
    provider: "mia_boss_mission_v1"
  };
}

module.exports = {
  ARC_KIND_ORDER,
  ARC_ROLE_BY_KIND,
  ROLE_TO_TIER,
  PATTERN_TO_CREATURE,
  NARRATIVE_KINDS,
  clusterKey,
  buildNarrativeArcs,
  pickBossMissionArc,
  buildBossMissionPlan,
  resolveObsSourceForRel,
  resolveCreatureIdForArc
};
