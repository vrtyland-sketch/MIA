"use strict";

const assert = require("assert");
const {
  rectFromTransform,
  offscreenAmount,
  intersectionArea,
  analyzeLayout,
  registryForName
} = require("../scripts/MIA_DISPLAY_VISION");

function run() {
  const canvas = { w: 1920, h: 1080 };

  // ---- rectFromTransform: alignment math ----
  // top-left anchor (5)
  let r = rectFromTransform({ positionX: 100, positionY: 200, width: 300, height: 150, alignment: 5 });
  assert.deepStrictEqual(
    { l: r.left, t: r.top, rt: r.right, b: r.bottom },
    { l: 100, t: 200, rt: 400, b: 350 },
    "top-left alignment corner"
  );

  // bottom-right anchor (10): position is bottom-right corner
  r = rectFromTransform({ positionX: 1920, positionY: 1080, width: 400, height: 400, alignment: 10 });
  assert.deepStrictEqual(
    { l: r.left, t: r.top, rt: r.right, b: r.bottom },
    { l: 1520, t: 680, rt: 1920, b: 1080 },
    "bottom-right alignment corner"
  );

  // center anchor (0)
  r = rectFromTransform({ positionX: 960, positionY: 540, width: 200, height: 100, alignment: 0 });
  assert.deepStrictEqual(
    { l: r.left, t: r.top, rt: r.right, b: r.bottom },
    { l: 860, t: 490, rt: 1060, b: 590 },
    "center alignment corner"
  );

  // bounds fallback when width/height missing
  r = rectFromTransform({ positionX: 0, positionY: 0, boundsWidth: 500, boundsHeight: 250, alignment: 5 });
  assert.strictEqual(r.w, 500, "bounds width used when width missing");
  assert.strictEqual(r.h, 250, "bounds height used when height missing");

  // ---- offscreenAmount ----
  const inside = offscreenAmount({ left: 10, top: 10, right: 110, bottom: 110 }, canvas);
  assert.deepStrictEqual(inside, { left: 0, top: 0, right: 0, bottom: 0 }, "inside = no offscreen");

  const out = offscreenAmount({ left: -30, top: -5, right: 1950, bottom: 1100 }, canvas);
  assert.deepStrictEqual(out, { left: 30, top: 5, right: 30, bottom: 20 }, "offscreen px per side");

  // ---- intersectionArea ----
  const A = { left: 0, top: 0, right: 100, bottom: 100 };
  const B = { left: 50, top: 50, right: 150, bottom: 150 };
  assert.strictEqual(intersectionArea(A, B), 2500, "overlap area 50x50");
  const C = { left: 200, top: 200, right: 300, bottom: 300 };
  assert.strictEqual(intersectionArea(A, C), 0, "no overlap");

  // ---- registry resolution by alias ----
  assert.strictEqual(registryForName("KOJNOZROUT_RUNTIME").key, "runtime", "alias resolves to runtime");
  assert.strictEqual(registryForName("MIA_BUBBLE").key, "speech", "alias resolves to speech");
  assert.strictEqual(registryForName("UNKNOWN_X"), null, "unknown source not in registry");

  // ---- analyzeLayout: healthy scene = no fail ----
  const healthy = [
    { key: "speech", name: "MIA_SPEECH", enabled: true, rect: rectFromTransform({ positionX: 40, positionY: 1080, width: 600, height: 380, alignment: 9 }) },
    { key: "entity", name: "MIA_ENTITY", enabled: true, rect: rectFromTransform({ positionX: 40, positionY: 40, width: 300, height: 56, alignment: 5 }) },
    { key: "bowl", name: "MIA_BOWL", enabled: true, rect: rectFromTransform({ positionX: 1880, positionY: 120, width: 300, height: 220, alignment: 6 }) },
    { key: "runtime", name: "MIA_KOJ_RUNTIME", enabled: true, rect: rectFromTransform({ positionX: 1880, positionY: 1060, width: 420, height: 520, alignment: 10 }) },
    { key: "voice", name: "MIA_VOICE", enabled: true, rect: null }
  ];
  const okFindings = analyzeLayout(healthy, canvas);
  const okFails = okFindings.filter((f) => f.level === "fail");
  assert.strictEqual(okFails.length, 0, "healthy scene has no fails: " + JSON.stringify(okFindings));

  // ---- analyzeLayout: missing persistent overlay → fail ----
  const missing = healthy.filter((it) => it.key !== "entity");
  const missingFindings = analyzeLayout(missing, canvas);
  assert.ok(
    missingFindings.some((f) => f.level === "fail" && f.key === "entity"),
    "missing entity flagged as fail"
  );

  // ---- analyzeLayout: disabled persistent → fail ----
  const disabled = healthy.map((it) => (it.key === "bowl" ? { ...it, enabled: false } : it));
  const disabledFindings = analyzeLayout(disabled, canvas);
  assert.ok(
    disabledFindings.some((f) => f.level === "fail" && f.key === "bowl"),
    "disabled bowl flagged as fail"
  );

  // ---- analyzeLayout: off-screen bubble → fail/warn ----
  const offscreen = healthy.map((it) =>
    it.key === "speech"
      ? { ...it, rect: rectFromTransform({ positionX: 1800, positionY: 1080, width: 600, height: 380, alignment: 9 }) }
      : it
  );
  const offFindings = analyzeLayout(offscreen, canvas);
  assert.ok(
    offFindings.some((f) => f.key === "speech" && (f.level === "warn" || f.level === "fail") && /mimo obraz/.test(f.msg)),
    "off-screen speech flagged"
  );

  // ---- analyzeLayout: overlap bowl over Koj → warn (sized sources) ----
  const overlap = healthy.map((it) =>
    it.key === "bowl"
      ? { ...it, rect: rectFromTransform({ positionX: 1880, positionY: 1060, width: 360, height: 360, alignment: 10 }) }
      : it
  );
  const overlapFindings = analyzeLayout(overlap, canvas);
  assert.ok(
    overlapFindings.some((f) => /Překryv/.test(f.msg)),
    "overlapping bowl+runtime flagged"
  );

  // ---- speech is a transparent container: bbox overlap with Koj must NOT warn ----
  const speechOverKoj = healthy.map((it) =>
    it.key === "speech"
      ? { ...it, rect: rectFromTransform({ positionX: 1880, positionY: 1080, width: 900, height: 520, alignment: 10 }) }
      : it
  );
  const speechFindings = analyzeLayout(speechOverKoj, canvas);
  assert.ok(
    !speechFindings.some((f) => f.key === "speech+runtime"),
    "speech transparent container must not trigger bbox overlap"
  );

  console.log("✅ MIA display vision geometry");
  console.log("\n---- MIA DISPLAY VISION CONTRACT ----");
  console.log("passed");
}

run();
