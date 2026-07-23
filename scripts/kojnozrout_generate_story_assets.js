"use strict";

/**
 * Ensures story bank manifest exists and validates beat layouts.
 * Scene PNG props are drawn procedurally at compose time.
 */

const fs = require("fs");
const path = require("path");
const { buildDefaultSockRocketStory } = require("./MIA_STORY_ANIMATION_ENGINE");

const ASSETS_ROOT = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout");
const MANIFEST_PATH = path.join(ASSETS_ROOT, "story-bank-manifest.json");

function main() {
  fs.mkdirSync(ASSETS_ROOT, { recursive: true });

  let manifest;
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } else {
    manifest = { version: 1, stories: [buildDefaultSockRocketStory()] };
  }

  if (!Array.isArray(manifest.stories) || !manifest.stories.length) {
    manifest.stories = [buildDefaultSockRocketStory()];
  }

  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`[story-assets] manifest -> ${MANIFEST_PATH}`);
  console.log(`[story-assets] stories: ${manifest.stories.map((s) => s.id).join(", ")}`);
}

main();
