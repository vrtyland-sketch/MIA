"use strict";

const assert = require("assert");
const {
  isGiftVideoSourceName,
  isPersistentOverlaySource,
  sortPersistentOverlaySources,
  getPersistentOverlayPriority,
  shouldForceEnablePersistentOverlay
} = require("../scripts/MIA_OBS_PERSISTENT_LAYERS");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test("detects gift video slots", () => {
  assert.equal(isGiftVideoSourceName("T5_VIDEO_19"), true);
  assert.equal(isGiftVideoSourceName("KOJNOZROUT_RUNTIME"), false);
});

test("keeps koj png/runtime above gift videos in raise order", () => {
  const sources = [
    "T3_VIDEO_09",
    "NOTEBOOK_CAMERA",
    "KOJNOZROUT_BOWL_V2",
    "KOJNOZROUT_RUNTIME",
    "MIA_VOICE"
  ];

  assert.equal(isPersistentOverlaySource("KOJNOZROUT_RUNTIME"), true);
  assert.equal(isPersistentOverlaySource("T3_VIDEO_09"), false);

  const ordered = sortPersistentOverlaySources(sources);
  assert.deepEqual(ordered, [
    "KOJNOZROUT_BOWL_V2",
    "MIA_VOICE",
    "KOJNOZROUT_RUNTIME"
  ]);
  assert.ok(
    getPersistentOverlayPriority("KOJNOZROUT_RUNTIME") >
      getPersistentOverlayPriority("MIA_VOICE")
  );
});

test("combo/spam alert stays above gift videos but below koj/voice", () => {
  assert.equal(isPersistentOverlaySource("MIA_COMBO"), true);
  assert.ok(getPersistentOverlayPriority("MIA_COMBO") > 0);
  // combo nad story momentem, ale pod hlasem a Koj sprite (ty drží úplně nahoře)
  assert.ok(
    getPersistentOverlayPriority("MIA_COMBO") >
      getPersistentOverlayPriority("MIA_STORY_MOMENT")
  );
  assert.ok(
    getPersistentOverlayPriority("MIA_COMBO") <
      getPersistentOverlayPriority("MIA_VOICE")
  );

  const ordered = sortPersistentOverlaySources([
    "T3_VIDEO_09",
    "MIA_COMBO",
    "KOJNOZROUT_RUNTIME"
  ]);
  // gift video vypadne (není persistent), combo je nad ničím z videí a pod koj sprite
  assert.deepEqual(ordered, ["MIA_COMBO", "KOJNOZROUT_RUNTIME"]);
});

test("t0 flyby and duel alerts are also raised above gift videos", () => {
  assert.equal(isPersistentOverlaySource("MIA_T0_FLYBY"), true);
  assert.equal(isPersistentOverlaySource("MIA_DUEL"), true);
  assert.equal(isGiftVideoSourceName("MIA_COMBO"), false);
});

test("alert overlays are raise-only (never force-enabled) but always-on overlays are", () => {
  // Combo/flyby/duel: jen zvedat z-order, nezapínat natvrdo (šetří HW).
  assert.equal(shouldForceEnablePersistentOverlay("MIA_COMBO"), false);
  assert.equal(shouldForceEnablePersistentOverlay("MIA_T0_FLYBY"), false);
  assert.equal(shouldForceEnablePersistentOverlay("MIA_DUEL"), false);
  // Stálé overlaye (Koj, miska, hlas, bublina) se smí zapnout, ať jsou vždy vidět.
  assert.equal(shouldForceEnablePersistentOverlay("KOJNOZROUT_RUNTIME"), true);
  assert.equal(shouldForceEnablePersistentOverlay("KOJNOZROUT_BOWL_V2"), true);
  assert.equal(shouldForceEnablePersistentOverlay("MIA_VOICE"), true);
  // Gift video se nikdy nezapíná přes tuhle cestu.
  assert.equal(shouldForceEnablePersistentOverlay("T3_VIDEO_09"), false);
});

console.log("obs_persistent_layers_contract: OK");
