"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function pass(label) {
  console.log(`✅ ${label}`);
}

const overlayDir = path.resolve(__dirname, "..", "mia-output-overlay");

const voice = fs.readFileSync(path.join(overlayDir, "mia-voice-overlay.html"), "utf8");
assert.ok(!voice.includes('id="tag"'), "voice overlay has no visible tag");
assert.ok(voice.includes("completedPlaybackId"), "voice overlay single-play guard");
assert.ok(voice.includes("width: 200px"), "voice overlay fixed 200px canvas");

const bowl = fs.readFileSync(path.join(overlayDir, "kojnozrout-bowl-overlay.html"), "utf8");
assert.ok(bowl.includes("moodBadge"), "bowl uses compact mood badge only");
assert.ok(!bowl.includes('id="kojSprite"'), "bowl does not duplicate koj PNG sprite");
assert.ok(bowl.includes("kojDisplay"), "bowl uses server kojDisplay for mood badge");

const runtime = fs.readFileSync(path.join(overlayDir, "kojnozrout-runtime.html"), "utf8");
assert.ok(runtime.includes("kojDisplay"), "runtime uses server kojDisplay snapshot");
assert.ok(runtime.includes("HUB_EVOLUTION_SCALE"), "runtime hub-compatible scale");
assert.ok(runtime.includes("resolveSpriteHeightFraction"), "runtime scale from hub formula");

const entity = fs.readFileSync(path.join(overlayDir, "entity-overlay.html"), "utf8");
assert.ok(entity.includes("#badge"), "entity uses flexible badge layout");
assert.ok(entity.includes("max-width:") || entity.includes("min-height:"), "entity badge is responsive");
assert.ok(entity.includes("vitalsSummary"), "entity shows vitals summary");

const speech = fs.readFileSync(path.join(overlayDir, "speech-overlay.html"), "utf8");
const pickBlock = speech.slice(
  speech.indexOf("function pickActiveOverlay"),
  speech.indexOf("function isActiveVoicePlayback")
);
assert.ok(
  pickBlock.includes("toNumber(b.priority, 3) - toNumber(a.priority, 3)"),
  "speech overlay picks active bubble by priority first (support beats newer low-prio chatter)"
);
assert.ok(
  pickBlock.includes("b.updatedAt") && pickBlock.includes("a.updatedAt"),
  "speech overlay tie-breaks equal priority by most recent update"
);
assert.ok(
  speech.includes("livePriority > pinnedPriority"),
  "speech overlay lets a higher-priority overlay break an existing pin"
);
assert.ok(speech.includes("#box") && speech.includes("z-index: 10"), "speech bubble stacks above hologram");
assert.ok(speech.includes("#miaHolo") && speech.includes("z-index: 2"), "mia hologram stays under bubble text");
assert.ok(
  speech.includes("@media (max-height: 500px)") && speech.includes("#miaHolo"),
  "speech strip shrinks hologram on portrait OBS browser"
);

pass("overlay layout contract");
console.log("\n---- OVERLAY LAYOUT CONTRACT ----");
console.log("passed");
