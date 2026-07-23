"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const catalog = require("../scripts/MIA_MEDIA_CATALOG");
const orchestrator = require("../scripts/MIA_MEDIA_ORCHESTRATOR");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function testClassification() {
  const photo = catalog.classifyPhoto({
    name: "file_00000000218071f48094678d69dd6f34.png",
    sizeBytes: 400_000,
    pattern: "contact_file"
  });
  assert.strictEqual(photo.category, "profile_photo");
  assert.ok(photo.qualityScore >= 70);

  const cute = catalog.classifyVideo({
    name: "hailuo_1769867013.mp4",
    sizeBytes: 900_000,
    pattern: "hailuo_ai"
  });
  assert.strictEqual(cute.category, "cute_clip");
  assert.strictEqual(cute.suggestedTier, "T1");

  const story = catalog.classifyVideo({
    name: "lv_0_20260129173032.mp4",
    sizeBytes: 16_000_000,
    pattern: "lv_edit"
  });
  assert.strictEqual(story.contentKind, "story_legend");
  assert.strictEqual(story.suggestedTier, "T5");

  const epic = catalog.classifyVideo({
    name: "lv_0_20260129173032.mp4",
    sizeBytes: 9_000_000,
    pattern: "lv_edit",
    durationMs: 50_000,
    hasEmbeddedAudio: true
  });
  assert.strictEqual(epic.contentKind, "story_epic");
  assert.strictEqual(epic.suggestedTier, "T4");

  const photos = catalog.classifyVideo({
    name: "2026-06-21-201620647.mp4",
    sizeBytes: 179_000_000,
    pattern: "photos_export"
  });
  assert.strictEqual(photos.contentKind, "story_legend");
  assert.strictEqual(photos.suggestedTier, "T5");
}

function testVideos2ScanDirs() {
  const dirs = catalog.listVideoScanDirs();
  const prefixes = dirs.map((row) => row.relPrefix);
  assert.ok(prefixes.includes("videos"));
  assert.ok(prefixes.includes("videos_2"));

  const built = catalog.buildCatalog();
  const fromVideos2 = (built.items || []).filter((row) =>
    safeString(row.rel).startsWith("videos_2/")
  );
  assert.ok(fromVideos2.length >= 10, "expected videos_2 files in catalog");
}

function testBuildCatalog() {
  const built = catalog.buildCatalog();
  assert.ok(built.totalPhotos >= 1, "expected photos in inbox");
  assert.ok(built.totalVideos >= 1, "expected videos in inbox");
  assert.ok(built.obsAssignments.length >= 1, "expected obs assignments");
  assert.ok(built.profilePool.length >= 1, "expected profile pool");

  for (const assign of built.obsAssignments) {
    assert.ok(assign.obsSource, "assignment needs obsSource");
    assert.ok(assign.rel, "assignment needs rel");
    assert.ok(fs.existsSync(assign.abs), `missing file ${assign.rel}`);
  }
}

function testOrchestratorTemplatePick() {
  assert.strictEqual(orchestrator.resolveGiftTemplateId("T1"), null);
  assert.strictEqual(orchestrator.resolveGiftTemplateId("T2"), "donator_spotlight");
  assert.strictEqual(orchestrator.resolveGiftTemplateId("T4"), "donator_spotlight");
}

function testStoryBeatPlan() {
  const built = catalog.buildCatalog();
  const story = {
    beats: [
      { id: "a", videoTier: "T1", videoSource: "T1_VIDEO_01", caption: "{user} start" },
      { id: "b", videoTier: "T4", videoSource: "T4_VIDEO_13", caption: "{user} end" }
    ]
  };
  const plan = catalog.buildStoryBeatPlan(story, built, "Test User");
  assert.strictEqual(plan.length, 2);
  assert.strictEqual(plan[0].sourceName, "T1_VIDEO_01");
  assert.strictEqual(plan[1].sourceName, "T4_VIDEO_13");
  assert.ok(plan[0].caption.includes("Test"));
}

function testTemplatesFile() {
  const p = path.join(__dirname, "..", "config", "media-templates.json");
  const json = JSON.parse(fs.readFileSync(p, "utf8"));
  assert.ok(json.templates.donator_spotlight);
  assert.ok(json.tierSlots.T1.length === 6);
  assert.ok(json.tierSlots.T4.length === 6);
  assert.ok(json.tierSlots.T5.length === 3);
  assert.ok(json.tierSlots.PROFILE.length === 4);
  assert.ok(json.contentKindTierDefaults.story_legend === "T5");
}

function testTierFallbackAssignment() {
  const items = [
    {
      kind: "videos",
      id: "a",
      rel: "videos/d1.mp4",
      abs: "x",
      contentKind: "donator_moment",
      category: "donator_moment",
      qualityScore: 90,
      durationMs: 18_000
    },
    {
      kind: "videos",
      id: "b",
      rel: "videos/legend.mp4",
      abs: "y",
      contentKind: "story_legend",
      category: "story_legend",
      qualityScore: 100,
      durationMs: 90_000
    },
    {
      kind: "videos",
      id: "c",
      rel: "videos/m1.mp4",
      abs: "z",
      contentKind: "story_music",
      category: "story_music",
      qualityScore: 88,
      durationMs: 22_000
    }
  ];

  const templates = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "config", "media-templates.json"), "utf8")
  );
  templates.tierSlots = {
    T2: ["T2_VIDEO_05", "T2_VIDEO_06"]
  };

  const assignments = catalog.assignObsSlots(items, templates);
  assert.strictEqual(assignments.length, 2);
  assert.strictEqual(assignments[0].contentKind, "donator_moment");
  assert.strictEqual(assignments[1].contentKind, "story_music");
  assert.notStrictEqual(assignments[1].contentKind, "story_legend");
}

function testTierAudioPolicy() {
  assert.equal(catalog.tierRequiresEmbeddedAudio("T2"), true);
  assert.equal(catalog.tierRequiresEmbeddedAudio("T3"), true);
  assert.equal(catalog.tierRequiresEmbeddedAudio("T4"), true);

  const filteredT2 = catalog.filterVideosForAudioTier(
    [
      { contentKind: "short_animation", hasEmbeddedAudio: false },
      { contentKind: "donator_moment", hasEmbeddedAudio: true }
    ],
    "T2"
  );
  assert.strictEqual(filteredT2.length, 1);
  assert.strictEqual(filteredT2[0].contentKind, "donator_moment");

  const silentLegend = catalog.applyTierAudioPolicy(
    { contentKind: "story_legend", hasEmbeddedAudio: false },
    "T5"
  );
  assert.strictEqual(silentLegend.hasEmbeddedAudio, true);

  const filtered = catalog.filterVideosForAudioTier(
    [
      { contentKind: "short_animation", hasEmbeddedAudio: false },
      { contentKind: "story_music", hasEmbeddedAudio: true }
    ],
    "T3"
  );
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].contentKind, "story_music");
}

function testNarrativeArcs() {
  const videos = [
    {
      kind: "videos",
      id: "a",
      rel: "videos/a.mp4",
      pattern: "lv_edit",
      durationBucket: "medium",
      contentKind: "donator_moment",
      hasEmbeddedAudio: true,
      qualityScore: 88
    },
    {
      kind: "videos",
      id: "b",
      rel: "videos/b.mp4",
      pattern: "lv_edit",
      durationBucket: "medium",
      contentKind: "story_music",
      hasEmbeddedAudio: true,
      qualityScore: 90
    },
    {
      kind: "videos",
      id: "c",
      rel: "videos/c.mp4",
      pattern: "lv_edit",
      durationBucket: "medium",
      contentKind: "story_legend",
      hasEmbeddedAudio: true,
      qualityScore: 95
    }
  ];
  const arcs = catalog.buildNarrativeArcs(videos, {
    graphicReferencePool: [
      {
        id: "prague_ref",
        rel: "videos_2/prague_style.mp4",
        theme: "prague_pixverse",
        tags: ["prague", "pixverse"],
        graphicRole: "stream_style"
      }
    ]
  });
  assert.ok(arcs.length >= 1);
  assert.equal(arcs[0].bossMissionReady, true);
  assert.equal(arcs[0].visualReference.bossStatueFrom, "videos_2/prague_style.mp4");
  assert.match(arcs[0].visualReference.note, /Prahy|animovan/i);
}

function main() {
  testClassification();
  testVideos2ScanDirs();
  testTemplatesFile();
  testTierFallbackAssignment();
  testTierAudioPolicy();
  testNarrativeArcs();
  testBuildCatalog();
  testOrchestratorTemplatePick();
  testStoryBeatPlan();
  console.log("media_catalog_contract: OK");
}

main();
