"use strict";

const assert = require("assert");
const {
  listNdiSourcesFromInputs,
  suggestNdiCameraMapping,
  buildNdiManifest
} = require("../shared/mia-scene-engine/ndiDiscovery");
const { buildNarrativeArcs, pickBossMissionArc } = require("../scripts/MIA_STORY_ARC_REGISTRY");
const mediaCatalog = require("../scripts/MIA_MEDIA_CATALOG");

function testNdiDiscovery() {
  const inputs = [
    { inputName: "NDI_CAM_A", inputKind: "ndi_source" },
    { inputName: "NDI_CAM_B", inputKind: "ndi_source" },
    { inputName: "MIA_VOICE", inputKind: "browser_source" }
  ];
  const sources = listNdiSourcesFromInputs(inputs);
  assert.equal(sources.length, 2);

  const plan = suggestNdiCameraMapping(sources);
  assert.equal(plan.ndiCount, 2);
  assert.ok(plan.mapping.find((row) => row.cameraId === "CAM_02")?.mapped);
  assert.ok(plan.mapping.find((row) => row.cameraId === "CAM_03")?.mapped);
}

function testNdiManifest() {
  const manifest = buildNdiManifest([
    { inputName: "PhoneCam", inputKind: "ndi_source" }
  ]);
  assert.equal(manifest.provider, "mia_ndi_discovery_v1");
  assert.equal(manifest.ndiCount, 1);
}

function testT2AudioPolicy() {
  assert.equal(mediaCatalog.tierRequiresEmbeddedAudio("T2"), true);
  const filtered = mediaCatalog.filterVideosForAudioTier(
    [
      { contentKind: "short_animation", hasEmbeddedAudio: false },
      { contentKind: "donator_moment", hasEmbeddedAudio: true }
    ],
    "T2"
  );
  assert.equal(filtered.length, 1);
}

function testBossArcPick() {
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
      contentKind: "story_music",
      hasEmbeddedAudio: true
    },
    {
      kind: "videos",
      id: "3",
      rel: "c.mp4",
      pattern: "lv_edit",
      durationBucket: "long",
      contentKind: "story_legend",
      hasEmbeddedAudio: true
    }
  ]);
  const picked = pickBossMissionArc(arcs, "tester");
  assert.ok(picked);
  assert.equal(picked.bossMissionReady, true);
}

async function main() {
  testNdiDiscovery();
  testNdiManifest();
  testT2AudioPolicy();
  testBossArcPick();
  console.log("mia_phase21_contract: OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
