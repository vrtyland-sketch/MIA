"use strict";

const assert = require("assert/strict");
const path = require("path");
const {
  createOverlayPollScheduler
} = require("../mia-output-overlay/lib/overlay-poll");
const {
  resolveCareWalkFromOverlay,
  shouldForceWander
} = require("../mia-output-overlay/lib/koj-runtime-walk");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

const {
  create: createKojRuntimeSprite
} = require("../mia-output-overlay/lib/koj-runtime-sprite");
const {
  create: createKojRuntimeBelly,
  resolveProjectorMedia,
  isLiveMoment,
  resolveMediaUrl,
  formatBellyClock,
  weatherLabelFromCode,
  measureSpriteLayoutBox,
  buildSpamWaveBellyContent,
  buildComboMomentBellyContent
} = require("../mia-output-overlay/lib/koj-runtime-belly");
const {
  create: createKojRuntimeScene,
  resolveScene,
  initials,
  isDonorParticipant
} = require("../mia-output-overlay/lib/koj-runtime-scene");
const {
  create: createKojRuntimePose,
  forceCyborgRestFrames,
  playsWithProp,
  isEatingAtBowlKey,
  wantsBallProp
} = require("../mia-output-overlay/lib/koj-runtime-pose");
const {
  create: createKojRuntimeStage,
  resolveDisplayMood,
  isKojSpeaking,
  STAGE_MOOD_CLASSES
} = require("../mia-output-overlay/lib/koj-runtime-stage");
const {
  create: createKojRuntimeFx
} = require("../mia-output-overlay/lib/koj-runtime-fx");

console.log("\n---- KOJ RUNTIME SPLIT PHASE A–G ----\n");

test("overlay poll scheduler exposes in-flight and backoff knobs", () => {
  let runs = 0;
  const poll = createOverlayPollScheduler({
    intervalMs: 200,
    backoffMs: 400,
    maxBackoffMs: 800,
    tick: async () => {
      runs += 1;
    }
  });
  assert.equal(poll.intervalMs, 200);
  assert.equal(poll.backoffMs, 400);
  assert.equal(poll.inFlight, false);
  assert.equal(typeof poll.start, "function");
  assert.equal(typeof poll.stop, "function");
  poll.stop();
  assert.equal(runs, 0);
});

test("care walk helper prefers display.walk snapshot", () => {
  const walk = resolveCareWalkFromOverlay({
    kojDisplay: { walk: { active: true, kind: "care", cssWander: true } }
  });
  assert.equal(walk.active, true);
  assert.equal(walk.kind, "care");
  assert.equal(shouldForceWander({
    kojDisplay: { walk: { active: true, kind: "care" } }
  }), true);
});

test("care walk helper falls back to state.walkActive", () => {
  const walk = resolveCareWalkFromOverlay({
    kojnozoutState: { walkActive: true, behavior: "walking" }
  });
  assert.equal(walk.active, true);
  assert.equal(shouldForceWander({ kojnozoutState: { behavior: "watching" } }), false);
});

test("split assets exist beside runtime html", () => {
  const root = path.resolve(__dirname, "..", "mia-output-overlay");
  const fs = require("fs");
  assert.ok(fs.existsSync(path.join(root, "assets", "kojnozrout", "koj-runtime.css")));
  assert.ok(fs.existsSync(path.join(root, "lib", "overlay-poll.js")));
  assert.ok(fs.existsSync(path.join(root, "lib", "koj-runtime-walk.js")));
  assert.ok(fs.existsSync(path.join(root, "lib", "koj-runtime-sprite.js")));
  assert.ok(fs.existsSync(path.join(root, "lib", "koj-runtime-belly.js")));
  assert.ok(fs.existsSync(path.join(root, "lib", "koj-runtime-scene.js")));
  assert.ok(fs.existsSync(path.join(root, "lib", "koj-runtime-pose.js")));
  assert.ok(fs.existsSync(path.join(root, "lib", "koj-runtime-stage.js")));
  assert.ok(fs.existsSync(path.join(root, "lib", "koj-runtime-fx.js")));
});

test("runtime html loads sprite engine and cache-busts split libs", () => {
  const fs = require("fs");
  const html = fs.readFileSync(
    path.resolve(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.ok(html.includes("koj-runtime-sprite.js"), "loads koj-runtime-sprite.js");
  assert.ok(html.includes("KojRuntimeSprite.create"), "creates sprite engine");
  assert.ok(html.includes("45-r1-combo-belly"), "cache bust 45-r1-combo-belly");
  assert.ok(!html.includes("const textureCache = new Map()"), "texture cache lives in lib");
  assert.ok(!html.includes("crossfadeHideTimer"), "crossfade timer lives in lib");
});

test("sprite engine builds mood/asset urls and shares mutable state", () => {
  const shared = {
    activeSlotIndex: 0,
    currentAssetKey: "",
    currentImgUrl: "",
    lastSwapAt: 0,
    lastSpriteKey: "",
    hasLoadedPng: false,
    pendingSwapToken: 0,
    pendingSprite: null
  };
  const engine = createKojRuntimeSprite({
    apiBase: "http://127.0.0.1:3000",
    cacheV: "45-r1-combo-belly",
    sharedState: shared,
    spriteA: { style: {}, classList: { add() {}, remove() {}, contains() { return false; } } },
    spriteB: { style: {}, classList: { add() {}, remove() {}, contains() { return false; } } },
    cssMascot: { classList: { add() {}, remove() {} } },
    spriteDock: { style: {} },
    stageEl: { clientWidth: 400, clientHeight: 400 }
  });
  assert.equal(
    engine.moodAsset("idle"),
    "assets/kojnozrout/moods/kojnozout-idle.png"
  );
  assert.ok(engine.assetUrl("assets/kojnozrout/moods/kojnozout-idle.png").includes("v=45-r1-combo-belly"));
  assert.equal(engine.minSwapMs("sleepy"), 3200);
  assert.equal(engine.minSwapMs("eating"), 650);
  shared.currentImgUrl = "x";
  assert.equal(engine.currentImgUrl, "x");
  engine.currentImgUrl = "y";
  assert.equal(shared.currentImgUrl, "y");
});

test("runtime html loads belly/projector engine and drops inline weather cycle", () => {
  const fs = require("fs");
  const html = fs.readFileSync(
    path.resolve(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.ok(html.includes("koj-runtime-belly.js"), "loads koj-runtime-belly.js");
  assert.ok(html.includes("KojRuntimeBelly.create"), "creates belly engine");
  assert.ok(!html.includes("BELLY_IDLE_AFTER_MS"), "idle constants live in lib");
  assert.ok(!html.includes("function measureSpriteLayoutBox"), "layout measure lives in lib");
  assert.ok(html.includes("syncKojProjector"), "orchestrator still calls syncKojProjector");
});

test("belly helpers resolve media and giftVisual without inventing coins", () => {
  const now = 1_000_000;
  assert.equal(
    resolveMediaUrl("/assets/x.png", "http://127.0.0.1:3000"),
    "http://127.0.0.1:3000/assets/x.png"
  );
  assert.equal(weatherLabelFromCode(0), "jasno");
  assert.ok(/^\d{2}:\d{2}:\d{2}$/.test(formatBellyClock(new Date(now))));
  assert.equal(
    isLiveMoment({ holdUntilTs: now + 1000 }, now),
    true
  );
  const media = resolveProjectorMedia(
    {
      giftVisual: {
        imageUrl: "/assets/gifts/rose.png",
        holdUntilTs: now + 5000
      }
    },
    now,
    "http://127.0.0.1:3000"
  );
  assert.equal(media.reason, "giftVisual");
  assert.equal(media.project, true);
  assert.ok(media.bellyUrl.includes("/assets/gifts/rose.png"));
  assert.ok(!JSON.stringify(media).toLowerCase().includes("coin"));

  const box = measureSpriteLayoutBox(
    { offsetWidth: 120, offsetHeight: 200 },
    { clientWidth: 300, clientHeight: 400 }
  );
  assert.deepEqual(box, { left: 90, top: 200, width: 120, height: 200 });

  const classList = {
    _c: new Set(),
    add(...xs) { xs.forEach((x) => this._c.add(x)); },
    remove(...xs) { xs.forEach((x) => this._c.delete(x)); },
    toggle(x, on) { if (on) this._c.add(x); else this._c.delete(x); },
    contains(x) { return this._c.has(x); }
  };
  const belly = createKojRuntimeBelly({
    apiBase: "http://127.0.0.1:3000",
    stageEl: { classList },
    spriteLayerEl: { clientWidth: 300, clientHeight: 400 },
    kojProjectorHost: { style: {}, classList },
    kojBellyScreen: { style: {}, classList },
    kojBellyImg: { removeAttribute() {}, src: "" },
    kojBellyIdleMain: { textContent: "" },
    kojBellyIdleSub: { textContent: "" },
    kojEyeBeam: { classList },
    kojHoloPlate: { classList },
    kojHoloImg: { removeAttribute() {}, src: "" },
    getSpriteSlots: () => [],
    getActiveSlotIndex: () => 0,
    getSpriteA: () => ({ naturalWidth: 0 }),
    getAnchors: () => null,
    getSearch: () => "",
    fetchImpl: async () => ({ ok: false, status: 500 })
  });
  belly.syncKojProjector(
    {
      giftVisual: {
        imageUrl: "/assets/gifts/rose.png",
        holdUntilTs: now + 5000
      }
    },
    now
  );
  assert.ok(classList.contains("mode-gift") || classList.contains("koj-projecting"));
});

test("runtime html loads scene/viewers engine", () => {
  const fs = require("fs");
  const html = fs.readFileSync(
    path.resolve(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.ok(html.includes("koj-runtime-scene.js"), "loads koj-runtime-scene.js");
  assert.ok(html.includes("KojRuntimeScene.create"), "creates scene engine");
  assert.ok(!html.includes("SCENE_ACCENT_SPECS"), "accent specs live in lib");
  assert.ok(!html.includes("MAX_VIEWER_CHIPS"), "viewer chip limit lives in lib");
  assert.ok(html.includes("syncScene") && html.includes("renderViewers"), "orchestrator still calls scene/viewers");
});

test("scene helpers map mood to backdrop and mark donors without coin values", () => {
  assert.equal(resolveScene("sleepy", {}), "night");
  assert.equal(resolveScene("eating", {}), "feast");
  assert.equal(resolveScene("celebrate", {}), "party");
  assert.equal(resolveScene("gift", {}), "cave");
  assert.equal(resolveScene("idle", {}), "den");
  assert.equal(resolveScene("idle", { kojVideoReaction: { active: true } }), "cozy");
  assert.equal(resolveScene("idle", { kojDisplay: { scene: "party" } }), "party");
  assert.equal(initials("Ada Lovelace"), "AL");
  assert.equal(isDonorParticipant({ type: "gift", giftName: "Rose" }), true);
  assert.equal(isDonorParticipant({ type: "chat" }), false);

  const classList = {
    _c: new Set(),
    add(...xs) { xs.forEach((x) => this._c.add(x)); },
    remove(...xs) { xs.forEach((x) => this._c.delete(x)); },
    toggle(x, on) { if (on) this._c.add(x); else this._c.delete(x); },
    contains(x) { return this._c.has(x); }
  };
  const appended = [];
  const scene = createKojRuntimeScene({
    stageEl: { classList },
    sceneLayer: { classList },
    sceneAccentsEl: { innerHTML: "", appendChild() {} },
    viewerStrip: {
      innerHTML: "",
      appendChild(node) { appended.push(node); }
    },
    assetUrl: (p) => `http://127.0.0.1:3000/${p}`,
    getSearch: () => "",
    createElement: (tag) => {
      const el = {
        tagName: tag,
        className: "",
        title: "",
        alt: "",
        src: "",
        textContent: "",
        style: { setProperty() {}, width: "", bottom: "", objectPosition: "" },
        classList: {
          add() {},
          remove() {}
        },
        appendChild(child) {
          this.child = child;
        },
        remove() {}
      };
      return el;
    }
  });
  scene.syncScene("eating", {}, Date.now());
  assert.equal(scene.getCurrentScene(), "feast");
  assert.ok(classList.contains("scene-feast") || classList.contains("alive") || classList.contains("show"));
  scene.renderViewers({
    recentParticipants: [{ userLabel: "Ada", userId: "u1", type: "gift", giftName: "Rose" }],
    recentGifts: [{ userId: "u1" }]
  });
  assert.equal(appended.length, 1);
  assert.ok(String(appended[0].className).includes("donor"));
  assert.ok(!JSON.stringify(appended[0]).toLowerCase().includes("coin"));
});

test("runtime html loads pose/props engine", () => {
  const fs = require("fs");
  const html = fs.readFileSync(
    path.resolve(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.ok(html.includes("koj-runtime-pose.js"), "loads koj-runtime-pose.js");
  assert.ok(html.includes("KojRuntimePose.create"), "creates pose engine");
  assert.ok(!html.includes("const BALL_KEYS"), "prop key sets live in lib");
  assert.ok(!html.includes("const poseFramePlayer = {"), "pose player body lives in lib");
  assert.ok(html.includes("poseFramePlayer") && html.includes("syncProps"), "orchestrator still uses pose/props");
});

test("pose helpers force cyborg rest frames and prop rules without coins", () => {
  const cycles = [
    { id: "rest", frames: ["curl-a", "curl-b"], halfMs: 500, moods: ["rest"] },
    { id: "walk", frames: ["walk-a", "walk-b"], halfMs: 400, moods: ["walk"] }
  ];
  forceCyborgRestFrames(cycles);
  assert.deepEqual(cycles[0].frames, ["idle", "warm", "happy"]);
  assert.ok(cycles[0].halfMs >= 900);
  assert.equal(playsWithProp("play-a", "idle"), true);
  assert.equal(wantsBallProp("hop", "idle"), true);
  assert.equal(isEatingAtBowlKey("munch"), true);
  assert.equal(isEatingAtBowlKey("wave"), false);

  const bowlClasses = {
    _c: new Set(),
    add(...xs) { xs.forEach((x) => this._c.add(x)); },
    remove(...xs) { xs.forEach((x) => this._c.delete(x)); },
    toggle(x, on) { if (on) this._c.add(x); else this._c.delete(x); },
    contains(x) { return this._c.has(x); }
  };
  const stageClasses = {
    _c: new Set(["corner-rest"]),
    add(...xs) { xs.forEach((x) => this._c.add(x)); },
    remove(...xs) { xs.forEach((x) => this._c.delete(x)); },
    toggle(x, on) { if (on) this._c.add(x); else this._c.delete(x); },
    contains(x) { return this._c.has(x); }
  };
  const emptyProp = () => ({
    classList: {
      _c: new Set(),
      toggle() {},
      add() {},
      remove() {},
      contains() { return false; }
    }
  });
  const pose = createKojRuntimePose({
    stageEl: { classList: stageClasses },
    assetUrl: (p) => p,
    moodAsset: (m) => `moods/${m}.png`,
    preloadTexture: async () => true,
    applySpriteHeight() {},
    activeSpriteEl: () => ({ src: "", classList: stageClasses, complete: true }),
    idleSpriteEl: () => ({ src: "", classList: stageClasses, complete: true }),
    crossfadeReveal() {},
    getLastStepDurMs: () => 780,
    onPoseFrameShown() {},
    onPoseStopped() {},
    getPropBowl: () => ({ classList: bowlClasses }),
    getPropBall: emptyProp,
    getPropMic: emptyProp,
    getPropHand: emptyProp,
    isKojSpeaking: () => false,
    raf() { return 1; },
    caf() {}
  });
  pose.syncProps(
    {
      kojDisplay: { mood: "sleepy", spriteAsset: "sleepy" },
      kojnozoutState: {}
    },
    Date.now()
  );
  assert.equal(pose.resolvePropKey({ kojDisplay: { spriteAsset: "play-a" } }), "play-a");
  assert.ok(bowlClasses.contains("on"), "sleepy + corner-rest shows bowl prop");
});

test("runtime html loads stage mood/wander engine", () => {
  const fs = require("fs");
  const html = fs.readFileSync(
    path.resolve(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.ok(html.includes("koj-runtime-stage.js"), "loads koj-runtime-stage.js");
  assert.ok(html.includes("KojRuntimeStage.create"), "creates stage engine");
  assert.ok(!html.includes("let isWandering"), "wander state lives in lib");
  assert.ok(html.includes("applyStageMood") && html.includes("syncSpeakingVisual"), "orchestrator still calls stage helpers");
  assert.ok(html.includes("syncComboVisual"), "orchestrator syncs combo/spam wave visuals");
});

test("stage helpers map moods, speaking, and wander without inventing coins", () => {
  assert.ok(STAGE_MOOD_CLASSES.includes("corner-rest") === false);
  assert.ok(STAGE_MOOD_CLASSES.includes("eating"));
  assert.equal(resolveDisplayMood({ isSleeping: true }, {}), "sleepy");
  assert.equal(resolveDisplayMood({ affliction: "sad" }, {}), "sad");
  assert.equal(resolveDisplayMood({ mood: "happy" }, {}), "happy");
  assert.equal(
    isKojSpeaking(
      { voicePlayback: { speaker: "kojnozout", holdUntilTs: Date.now() + 5000 } },
      Date.now()
    ),
    true
  );
  assert.equal(
    isKojSpeaking({ voicePlayback: { speaker: "mia", holdUntilTs: Date.now() + 5000 } }, Date.now()),
    false
  );

  const classList = {
    _c: new Set(),
    add(...xs) { xs.forEach((x) => this._c.add(x)); },
    remove(...xs) { xs.forEach((x) => this._c.delete(x)); },
    toggle(x, on) { if (on) this._c.add(x); else this._c.delete(x); },
    contains(x) { return this._c.has(x); }
  };
  let lastStep = 0;
  const stage = createKojRuntimeStage({
    stageEl: { classList, style: { setProperty() {} } },
    resolvePropKey: () => "idle",
    playsWithProp: () => false,
    isCalmWanderMood: (key) => key === "idle",
    shouldForceWander: () => false,
    setLastStepDurMs: (ms) => { lastStep = ms; },
    getLiveMotion: () => null,
    random: () => 0.5
  });
  stage.applyStageMood("eating", {});
  assert.ok(classList.contains("eating"));
  assert.ok(classList.contains("corner-rest"));
  stage.applyStageMood("idle", {});
  assert.ok(classList.contains("calm-idle"));
  assert.ok(classList.contains("wander"));
  assert.ok(lastStep > 0);
  stage.syncVideoReactionVisual(
    {
      kojVideoReaction: { active: true, phase: "dance" },
      kojDisplay: { mood: "happy" }
    },
    Date.now()
  );
  assert.ok(classList.contains("dance"));
  assert.ok(!JSON.stringify({ mood: "idle" }).toLowerCase().includes("coin"));
});

test("stage syncComboVisual applies spam wave classes without coin fields", () => {
  const now = Date.now();
  const classList = {
    _c: new Set(),
    add(...xs) { xs.forEach((x) => this._c.add(x)); },
    remove(...xs) { xs.forEach((x) => this._c.delete(x)); },
    toggle(x, on) { if (on) this._c.add(x); else this._c.delete(x); },
    contains(x) { return this._c.has(x); }
  };
  const style = { setProperty() {}, removeProperty() {} };
  const stage = createKojRuntimeStage({
    stageEl: { classList, style },
    resolvePropKey: () => "idle",
    playsWithProp: () => false,
    isCalmWanderMood: () => false,
    shouldForceWander: () => false,
    setLastStepDurMs: () => {},
    getLiveMotion: () => null,
    random: () => 0.5
  });
  stage.syncComboVisual(
    {
      spamSession: {
        active: true,
        spamConfirmed: true,
        totalPoints: 600,
        targetRewardPoints: 750,
        remainingWindowSec: 8
      }
    },
    now
  );
  assert.ok(classList.contains("combo"));
  assert.ok(classList.contains("spam-wave"));
  assert.ok(!JSON.stringify({ spamSession: { totalPoints: 600 } }).toLowerCase().includes("coin"));
});

test("scene resolveScene prefers party for comboMoment and spamSession", () => {
  const now = Date.now();
  assert.equal(
    resolveScene("idle", { comboMoment: { active: true, holdUntilTs: now + 5000 } }, now),
    "party"
  );
  assert.equal(resolveScene("idle", { spamSession: { active: true } }, now), "party");
});

test("belly buildSpamWaveBellyContent exposes miaPoints progress only", () => {
  const model = buildSpamWaveBellyContent({
    active: true,
    spamConfirmed: true,
    totalPoints: 420,
    targetRewardPoints: 750,
    remainingWindowSec: 6,
    nextRewardTier: "T2"
  });
  assert.equal(model.main, "56% → T2");
  assert.match(model.sub, /420 bodů/);
  assert.equal(model.progressPct, 56);
  assert.ok(!JSON.stringify(model).toLowerCase().includes("coin"));
});

test("belly buildComboMomentBellyContent exposes title without coin fields", () => {
  const now = Date.now();
  const model = buildComboMomentBellyContent(
    {
      title: "SOLO COMBO",
      subtext: "rapid gifts",
      count: 3,
      holdUntilTs: now + 5000
    },
    now
  );
  assert.equal(model.main, "SOLO COMBO");
  assert.match(model.sub, /rapid gifts/);
  assert.ok(!JSON.stringify(model).toLowerCase().includes("coin"));
});

test("runtime html loads fx engine for animation/item effects", () => {
  const fs = require("fs");
  const html = fs.readFileSync(
    path.resolve(__dirname, "..", "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  assert.ok(html.includes("koj-runtime-fx.js"), "loads koj-runtime-fx.js");
  assert.ok(html.includes("KojRuntimeFx.create"), "creates fx engine");
  assert.ok(!html.includes("let lastAnimationToken"), "animation token lives in lib");
  assert.ok(!html.includes("let animationBusy"), "animation busy flag lives in lib");
  assert.ok(
    html.includes("syncAnimationReaction") && html.includes("syncItemUse"),
    "orchestrator still calls fx helpers"
  );
  assert.equal((html.match(/function spawnItemFx\(/g) || []).length, 1, "single spawnItemFx alias");
});

test("fx engine toggles gift stage class and fires item fx without coins", () => {
  const classList = {
    _c: new Set(),
    add(...xs) { xs.forEach((x) => this._c.add(x)); },
    remove(...xs) { xs.forEach((x) => this._c.delete(x)); },
    toggle(x, on) { if (on) this._c.add(x); else this._c.delete(x); },
    contains(x) { return this._c.has(x); }
  };
  const spawned = [];
  const fx = createKojRuntimeFx({
    stageEl: { classList },
    spriteDock: {},
    animFxLayer: {},
    itemFxLayer: {},
    apiBase: "http://127.0.0.1:3000",
    getSearch: () => "",
    getAnimationPlayerApi: () => ({
      spawnParticles() {},
      MiaAnimationPlayer: null
    }),
    getSoundCuesApi: () => ({ playSoundCue() {} }),
    getMia2dFxApi: () => ({
      init() {
        return {
          then(fn) {
            fn();
            return { catch() {} };
          }
        };
      },
      playItemUse(_layer, payload) {
        spawned.push(payload);
      }
    })
  });
  const now = Date.now();
  const active = fx.syncAnimationReaction(
    {
      animationReaction: {
        active: true,
        holdUntilTs: now + 5000,
        updatedAt: now,
        animationId: "gift-spark",
        giftKey: "rose"
      }
    },
    now
  );
  assert.equal(active, false);
  assert.ok(classList.contains("gift"));

  fx.spawnItemFx("apple", { projectile: "orb" });
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].itemId, "apple");
  assert.ok(!JSON.stringify(spawned[0]).toLowerCase().includes("coin"));
});

console.log("\n---- KOJ RUNTIME SPLIT PHASE A–G SUMMARY ----\n");
if (process.exitCode) process.exit(process.exitCode);
