"use strict";

const assert = require("assert");
const {
  buildBossMissionPlan,
  buildNarrativeArcs,
  pickBossMissionArc
} = require("../scripts/MIA_STORY_ARC_REGISTRY");
const bossMission = require("../scripts/MIA_BOSS_MISSION");
const overlayState = require("../scripts/MIA_OVERLAY_STATE");

const mockArc = {
  id: "arc_test",
  pattern: "lv_edit",
  durationBucket: "long",
  bossMissionReady: true,
  avatarSeedRel: "videos/intro.mp4",
  statueRel: "videos/boss.mp4",
  visualReference: {
    avatarFrom: "videos/intro.mp4",
    bossStatueFrom: "videos/boss.mp4"
  },
  beats: [
    {
      role: "intro",
      contentKind: "donator_moment",
      contentKindLabel: "moment dárce",
      rel: "videos/intro.mp4",
      mediaId: "a1",
      durationMs: 12000,
      hasEmbeddedAudio: true
    },
    {
      role: "chapter",
      contentKind: "story_music",
      contentKindLabel: "příběh + hudba",
      rel: "videos/chapter.mp4",
      mediaId: "a2",
      durationMs: 24000,
      hasEmbeddedAudio: true
    },
    {
      role: "boss_gate",
      contentKind: "story_legend",
      contentKindLabel: "legendární příběh",
      rel: "videos/boss.mp4",
      mediaId: "a3",
      durationMs: 90000,
      hasEmbeddedAudio: true
    }
  ]
};

const mockCatalog = {
  obsAssignments: [
    { rel: "videos/intro.mp4", obsSource: "T2_VIDEO_05", tier: "T2" },
    { rel: "videos/chapter.mp4", obsSource: "T3_VIDEO_09", tier: "T3" },
    { rel: "videos/boss.mp4", obsSource: "T5_VIDEO_19", tier: "T5" }
  ],
  tierSlotNames: {
    T2: ["T2_VIDEO_05"],
    T3: ["T3_VIDEO_09"],
    T5: ["T5_VIDEO_19"]
  }
};

function testBuildBossMissionPlan() {
  const plan = buildBossMissionPlan(mockArc, { userLabel: "Tester" }, mockCatalog);
  assert.equal(plan.ok, true);
  assert.equal(plan.phases.length, 3);
  assert.equal(plan.phases[0].sourceName, "T2_VIDEO_05");
  assert.equal(plan.phases[2].sourceName, "T5_VIDEO_19");
  assert.equal(plan.immersive.mode, "combat");
  assert.equal(plan.immersive.creatureId, "bio_hunter_alpha");
  assert.ok(plan.holdMs >= 22000);
}

function testApplyBossMissionOverlay() {
  const state = overlayState.createOverlayState();
  const applied = bossMission.applyBossMission(
    state,
    { userLabel: "Tester", arcId: mockArc.id },
    { catalog: { ...mockCatalog, narrativeArcs: [mockArc], items: [] } }
  );
  assert.equal(applied.ok, true);
  const snap = overlayState.getOverlaySnapshot(state);
  assert.ok(snap.bossMission);
  assert.equal(snap.bossMission.title, "Boss mise — Tester");
  assert.ok(snap.immersiveScene);
  bossMission.clearBossMission(state);
}

function testNarrativeArcCluster() {
  const arcs = buildNarrativeArcs([
    {
      kind: "videos",
      id: "1",
      rel: "a.mp4",
      pattern: "lv_edit",
      durationBucket: "long",
      contentKind: "donator_moment",
      hasEmbeddedAudio: true
    },
    {
      kind: "videos",
      id: "2",
      rel: "b.mp4",
      pattern: "lv_edit",
      durationBucket: "long",
      contentKind: "story_legend",
      hasEmbeddedAudio: true
    },
    {
      kind: "videos",
      id: "3",
      rel: "c.mp4",
      pattern: "lv_edit",
      durationBucket: "long",
      contentKind: "story_music",
      hasEmbeddedAudio: true
    }
  ]);
  assert.ok(arcs.length >= 1);
  const picked = pickBossMissionArc(arcs, "seed");
  assert.ok(picked);
}

async function main() {
  testBuildBossMissionPlan();
  testApplyBossMissionOverlay();
  testNarrativeArcCluster();
  console.log("mia_phase22_contract: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
