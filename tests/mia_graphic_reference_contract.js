"use strict";

const assert = require("assert");
const graphicReference = require("../scripts/MIA_GRAPHIC_REFERENCE");
const { buildNarrativeArcs } = require("../scripts/MIA_STORY_ARC_REGISTRY");

const praguePixverse = {
  kind: "videos",
  id: "prague1",
  rel: "videos_2/VID-20260318-WA0328.mp4",
  name: "PixVerse Praha pár",
  contentKind: "profile_reel",
  pattern: "whatsapp_video",
  durationBucket: "medium",
  theme: "prague_romance",
  tags: ["prague", "pixverse", "profile"],
  visualSummary: "Animovaný pár na Karlův mostě, PixVerse",
  hasEmbeddedAudio: true,
  qualityScore: 92
};

const pragueGargoyle = {
  kind: "videos",
  id: "prague2",
  rel: "videos_2/VID-20260318-WA0333.mp4",
  name: "PixVerse gargoyle Praha",
  contentKind: "story_music",
  pattern: "whatsapp_video",
  durationBucket: "long",
  theme: "prague_pixverse",
  tags: ["prague", "pixverse", "story"],
  visualSummary: "Animovaný gargoyle vs dívka v Praze",
  hasEmbeddedAudio: true,
  qualityScore: 95
};

const liveActionPrague = {
  kind: "videos",
  id: "live1",
  rel: "videos/live_prague.mp4",
  contentKind: "donator_moment",
  pattern: "whatsapp_video",
  durationBucket: "medium",
  theme: "prague",
  tags: ["prague"],
  visualSummary: "Live-action klip z Prahy bez animace",
  hasEmbeddedAudio: true,
  qualityScore: 80
};

const hailuoNotPrague = {
  kind: "videos",
  id: "hailuo1",
  rel: "videos/hailuo_cat.mp4",
  contentKind: "short_animation",
  pattern: "hailuo_ai",
  durationBucket: "short",
  theme: "cute_ai",
  tags: ["hailuo", "cute_ai"],
  visualSummary: "Hailuo animace kočky",
  hasEmbeddedAudio: false,
  qualityScore: 70
};

const lvEditCluster = {
  kind: "videos",
  id: "lv1",
  rel: "videos/lv_intro.mp4",
  contentKind: "donator_moment",
  pattern: "lv_edit",
  durationBucket: "long",
  hasEmbeddedAudio: true,
  qualityScore: 88
};

function testGraphicReferencePool() {
  const pool = graphicReference.buildGraphicReferencePool([
    praguePixverse,
    pragueGargoyle,
    liveActionPrague,
    hailuoNotPrague
  ]);
  assert.equal(pool.length, 2);
  assert.ok(pool.every((row) => row.tags.includes("prague") || /prague/.test(row.theme)));
  assert.ok(pool.every((row) => graphicReference.isAnimatedVideo(row)));
  assert.equal(graphicReference.isGraphicReferenceVideo(liveActionPrague), false);
  assert.equal(graphicReference.isGraphicReferenceVideo(hailuoNotPrague), false);
}

function testArcVisualReferenceUsesPragueOnly() {
  const graphicPool = graphicReference.buildGraphicReferencePool([
    praguePixverse,
    pragueGargoyle
  ]);
  const arcs = buildNarrativeArcs(
    [
      lvEditCluster,
      {
        kind: "videos",
        id: "lv2",
        rel: "videos/lv_story.mp4",
        contentKind: "story_music",
        pattern: "lv_edit",
        durationBucket: "long",
        hasEmbeddedAudio: true
      },
      {
        kind: "videos",
        id: "lv3",
        rel: "videos/lv_boss.mp4",
        contentKind: "story_legend",
        pattern: "lv_edit",
        durationBucket: "long",
        hasEmbeddedAudio: true
      }
    ],
    { graphicReferencePool: graphicPool }
  );
  assert.ok(arcs.length >= 1);
  const arc = arcs[0];
  assert.equal(arc.bossMissionReady, true);
  assert.ok(arc.visualReference.avatarFrom);
  assert.match(arc.visualReference.avatarFrom, /VID-20260318/);
  assert.notEqual(arc.visualReference.avatarFrom, "videos/lv_intro.mp4");
  assert.match(arc.visualReference.note, /animovan/i);
}

function testStyleBrief() {
  const brief = graphicReference.buildGraphicStyleBrief({
    rel: praguePixverse.rel,
    theme: praguePixverse.theme,
    visualSummary: praguePixverse.visualSummary,
    graphicRole: "avatar_seed"
  });
  assert.equal(brief.rel, praguePixverse.rel);
  assert.equal(brief.usage, "avatar_and_stream_graphics_only");
}

function main() {
  testGraphicReferencePool();
  testArcVisualReferenceUsesPragueOnly();
  testStyleBrief();
  console.log("mia_graphic_reference_contract: OK");
}

main();
