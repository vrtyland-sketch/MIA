"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { inspectKojnozoutAssets } = require("../scripts/MIA_KOJNOZROUT_ASSETS");

const { POSE_CYCLES } = require("../scripts/kojnozrout_pose_frames");

function cycleIds() {
  return new Set(POSE_CYCLES.map((c) => c.id));
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const runtimePath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "kojnozrout-runtime.html"
  );
  const runtimeCssPath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "assets",
    "kojnozrout",
    "koj-runtime.css"
  );
  const runtimeSpritePath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "lib",
    "koj-runtime-sprite.js"
  );
  const runtimeBellyPath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "lib",
    "koj-runtime-belly.js"
  );
  const runtimeScenePath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "lib",
    "koj-runtime-scene.js"
  );
  const runtimePosePath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "lib",
    "koj-runtime-pose.js"
  );
  const runtimeStagePath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "lib",
    "koj-runtime-stage.js"
  );
  const runtimeFxPath = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "lib",
    "koj-runtime-fx.js"
  );
  const runtime = fs.readFileSync(runtimePath, "utf8");
  const runtimeCss = fs.existsSync(runtimeCssPath)
    ? fs.readFileSync(runtimeCssPath, "utf8")
    : "";
  const runtimeSprite = fs.existsSync(runtimeSpritePath)
    ? fs.readFileSync(runtimeSpritePath, "utf8")
    : "";
  const runtimeBelly = fs.existsSync(runtimeBellyPath)
    ? fs.readFileSync(runtimeBellyPath, "utf8")
    : "";
  const runtimeScene = fs.existsSync(runtimeScenePath)
    ? fs.readFileSync(runtimeScenePath, "utf8")
    : "";
  const runtimePose = fs.existsSync(runtimePosePath)
    ? fs.readFileSync(runtimePosePath, "utf8")
    : "";
  const runtimeStage = fs.existsSync(runtimeStagePath)
    ? fs.readFileSync(runtimeStagePath, "utf8")
    : "";
  const runtimeFx = fs.existsSync(runtimeFxPath)
    ? fs.readFileSync(runtimeFxPath, "utf8")
    : "";
  const runtimeBundle = `${runtime}\n${runtimeCss}\n${runtimeSprite}\n${runtimeBelly}\n${runtimeScene}\n${runtimePose}\n${runtimeStage}\n${runtimeFx}`;

  assert.ok(runtime.includes("sprite-slot") || runtimeCss.includes("sprite-slot"), "runtime uses img sprite slots");
  // Koj = čisté PNG bez mlhovin: žádná aura ani ambient částice.
  assert.ok(!runtimeBundle.includes("kojAura"), "runtime has no fog aura layer (clean PNG)");
  assert.ok(!runtimeBundle.includes("ambient-dot"), "runtime has no ambient fog particles");
  assert.ok(runtimeBundle.includes("kojWalk"), "runtime has natural walk movement");
  assert.ok(runtimeBundle.includes("careWalk"), "runtime unifies CARE walk with wander CSS");
  assert.ok(
    runtime.includes("koj-runtime-walk.js") || runtime.includes("kojDisplay?.walk"),
    "runtime loads walk helper or reads display.walk snapshot"
  );
  assert.ok(runtime.includes("KojRuntimeWalk") || runtime.includes("shouldForceWander"), "runtime uses KojRuntimeWalk helper");
  assert.ok(runtime.includes("schedulePoll"), "runtime uses schedulePoll with backoff");
  assert.ok(runtime.includes("MiaOverlayPoll") || runtime.includes("overlay-poll.js"), "runtime uses shared overlay poll helper");
  assert.ok(runtime.includes("POLL_BACKOFF_MS"), "runtime has poll backoff");
  assert.ok(runtime.includes("koj-runtime.css"), "runtime CSS extracted to koj-runtime.css");
  assert.ok(fs.existsSync(runtimeCssPath), "koj-runtime.css present");
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "lib", "overlay-poll.js")),
    "overlay-poll.js present"
  );
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "lib", "koj-runtime-walk.js")),
    "koj-runtime-walk.js present"
  );
  assert.ok(
    runtime.includes("koj-runtime-sprite.js") && runtime.includes("KojRuntimeSprite"),
    "runtime loads koj-runtime-sprite.js"
  );
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "lib", "koj-runtime-sprite.js")),
    "koj-runtime-sprite.js present"
  );
  assert.ok(
    runtime.includes("koj-runtime-belly.js") && runtime.includes("KojRuntimeBelly"),
    "runtime loads koj-runtime-belly.js"
  );
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "lib", "koj-runtime-belly.js")),
    "koj-runtime-belly.js present"
  );
  assert.ok(
    runtime.includes("koj-runtime-scene.js") && runtime.includes("KojRuntimeScene"),
    "runtime loads koj-runtime-scene.js"
  );
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "lib", "koj-runtime-scene.js")),
    "koj-runtime-scene.js present"
  );
  assert.ok(
    runtime.includes("koj-runtime-pose.js") && runtime.includes("KojRuntimePose"),
    "runtime loads koj-runtime-pose.js"
  );
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "lib", "koj-runtime-pose.js")),
    "koj-runtime-pose.js present"
  );
  assert.ok(
    runtime.includes("koj-runtime-stage.js") && runtime.includes("KojRuntimeStage"),
    "runtime loads koj-runtime-stage.js"
  );
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "lib", "koj-runtime-stage.js")),
    "koj-runtime-stage.js present"
  );
  assert.ok(
    runtime.includes("koj-runtime-fx.js") && runtime.includes("KojRuntimeFx"),
    "runtime loads koj-runtime-fx.js"
  );
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "lib", "koj-runtime-fx.js")),
    "koj-runtime-fx.js present"
  );
  // Přirozená chůze: kolíbání (waddle) + došlapový stín místo klouzání statického PNG.
  assert.ok(runtimeBundle.includes("kojWaddle"), "runtime walk uses waddle (rock + squash), not flat slide");
  assert.ok(runtimeBundle.includes("walkShadow") && runtimeBundle.includes("kojWalkShadow"), "runtime has stepping contact shadow");
  assert.ok(runtime.includes("poseFramePlayer") && runtime.includes("POSE_CYCLES"), "runtime has multi-frame pose player");
  assert.ok(runtime.includes("pose-catalog.js"), "runtime loads generated pose catalog");
  assert.ok(runtime.includes("buildRenderReport"), "runtime reports proprioception to MIA");
  assert.ok(runtime.includes("/mia/koj/render-report"), "runtime POSTs render-report");
  assert.ok(runtime.includes("CALM_WANDER_MOODS"), "runtime uses calm wander mood set");
  assert.ok(runtimeBundle.includes("pose-walk-frames"), "runtime disables CSS waddle when walk frames play");
  assert.ok(runtime.includes("resolvePoseCycle"), "runtime resolves pose cycles per mood");
  assert.ok(
    fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "pose-catalog.js")),
    "pose-catalog.js generated"
  );
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-walk-a.png")), "walk-a frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-idle-f2.png")), "idle-f2 secondary pose present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-sit-a.png")), "sit-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-munch-a.png")), "munch-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-gift-a.png")), "gift-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-combo-a.png")), "combo-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-curious-a.png")), "curious-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-shy-a.png")), "shy-a paired frame present");
  const catalogIds = cycleIds();
  assert.ok(catalogIds.has("curious"), "catalog curious pose cycle present");
  assert.ok(catalogIds.has("shy"), "catalog shy pose cycle present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-peek-a.png")), "peek-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-surprised-a.png")), "surprised-a paired frame present");
  assert.ok(catalogIds.has("surprised"), "catalog surprised pose cycle present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-react-gift-a.png")), "react-gift-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-hatch-wiggle-a.png")), "hatch-wiggle-a paired frame present");
  assert.ok(catalogIds.has("react-gift"), "catalog react-gift pose cycle present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-party-pop-a.png")), "party-pop-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-hype-jump-b.png")), "hype-jump-b paired frame present");
  assert.ok(catalogIds.has("heal-glow"), "catalog heal-glow pose cycle present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-react-chat-a.png")), "react-chat-a paired frame present");
  assert.ok(catalogIds.has("react-chat"), "catalog react-chat pose cycle present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-love-hug-a.png")), "love-hug-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-bond-warm-a.png")), "bond-warm-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-groove-a.png")), "groove-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-party-a.png")), "party-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-snack-a.png")), "snack-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-sip-a.png")), "sip-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-alert-a.png")), "alert-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-proud-stand-a.png")), "proud-stand-a paired frame present");
  assert.ok(catalogIds.has("groove"), "catalog groove pose cycle present");
  assert.ok(catalogIds.has("proud-stand"), "catalog proud-stand pose cycle present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-cozy-blanket-a.png")), "cozy-blanket-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-shy-hide-a.png")), "shy-hide-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-calm-deep-a.png")), "calm-deep-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-egg-rest-a.png")), "egg-rest-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-stressed-a.png")), "stressed-a paired frame present");
  assert.ok(fs.existsSync(path.resolve(__dirname, "..", "mia-output-overlay", "assets", "kojnozrout", "moods", "kojnozout-rest-a.png")), "rest-a paired frame present");
  assert.ok(catalogIds.has("cozy-blanket"), "catalog cozy-blanket pose cycle present");
  assert.ok(catalogIds.has("rest-nap"), "catalog rest-nap pose cycle present");
  assert.ok(runtimeBundle.includes('"react-chat-a"'), "runtime mic prop includes react-chat-a frame key");
  assert.ok(runtime.includes("celebrate-a") || catalogIds.has("celebrate"), "celebrate pose cycle in catalog");
  assert.ok(runtime.includes("resolvePropKey"), "runtime resolves prop key from active pose frame");
  assert.ok(runtimeBundle.includes('"play-a"'), "runtime ball prop includes play-a frame key");
  assert.ok(runtimeBundle.includes('"react-chat"'), "runtime mic prop includes react-chat mood");
  assert.ok(runtime.includes("propLayer") && runtime.includes("koj-prop"), "runtime has clean PNG props layer");
  assert.ok(
    runtime.includes("props/ball.png") &&
    runtime.includes("props/mic.png") &&
    runtime.includes("props/hand.png"),
    "runtime wires ball/mic/hand props"
  );
  // Koj odpočívá/hlídá u své misky v rohu (čistý PNG bowl prop + corner-rest).
  assert.ok(runtime.includes("props/bowl.png"), "runtime wires clean PNG bowl prop");
  assert.ok(runtimeBundle.includes("corner-rest"), "runtime has corner-rest (Koj lies by his bowl)");
  assert.ok(
    runtimeBundle.includes("kojHungryByBowl") || runtimeBundle.includes("corner-rest.hungry"),
    "runtime has hungry-at-bowl motion"
  );
  assert.ok(runtimeBundle.includes("care_react"), "runtime reacts to care/pet with hand prop");
  const bowlAsset = path.resolve(
    __dirname,
    "..",
    "mia-output-overlay",
    "assets",
    "kojnozrout",
    "props",
    "bowl.png"
  );
  assert.ok(fs.existsSync(bowlAsset), "bowl prop asset present");
  assert.ok(runtimeBundle.includes("viewers/default-follower.png"), "viewer strip uses default follower avatar fallback");

  // MIA = přiznaná AI: holografická projekce ve speech overlayi (ne realistická dívka).
  const speechPath = path.resolve(__dirname, "..", "mia-output-overlay", "speech-overlay.html");
  const speech = fs.readFileSync(speechPath, "utf8");
  assert.ok(speech.includes("miaHolo") && speech.includes("assets/mia/hologram.png"), "speech overlay uses MIA hologram");
  assert.ok(speech.includes("holo-scan") && speech.includes("holoFlicker"), "MIA hologram has scanline + flicker treatment");
  assert.ok(speech.includes("mood-gift") && speech.includes("mood-combo"), "MIA hologram has mood color shifts");
  assert.ok(!speech.includes("assets/mia/avatar.png"), "old realistic MIA avatar no longer referenced");

  const holoAsset = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "mia", "hologram.png");
  const followerAsset = path.resolve(__dirname, "..", "mia-output-overlay", "assets", "viewers", "default-follower.png");
  assert.ok(fs.existsSync(holoAsset), "MIA hologram asset present");
  assert.ok(fs.existsSync(followerAsset), "default follower asset present");
  assert.ok(runtimeBundle.includes("scene-accent"), "runtime uses painted scene accents");
  assert.ok(runtime.includes("cssMascot"), "runtime has css mascot fallback");
  assert.ok(runtime.includes("crossfadeReveal"), "runtime crossfades sprite swaps");
  assert.ok(runtimeBundle.includes("fading-out"), "runtime fades out previous sprite slot");
  assert.ok(runtimeBundle.includes("requestAnimationFrame"), "runtime uses rAF for pose frames");
  assert.ok(runtime.includes("BOOT_SPRITE_PATH"), "runtime boots from idle egg sprite");
  assert.ok(runtime.includes("tiktok-viewer-zones.css"), "runtime uses TikTok viewer zones");
  assert.ok(runtimeBundle.includes("gift-watch"), "runtime has gift video reaction stages");
  assert.ok(runtime.includes("spriteUrl"), "runtime consumes server spriteUrl");
  assert.ok(!runtime.includes("/vendor/pixi.min.js"), "runtime no longer depends on pixi");

  const assets = inspectKojnozoutAssets();
  assert.equal(assets.vitalMoods.missing.length, 0, "vital moods present");
  pass("runtime overlay contract");

  console.log("\n---- KOJNOZROUT RUNTIME CONTRACT ----");
  console.log("passed");
}

run();
