"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  DEFAULTS,
  getLayout,
  saveLayout,
  resetLayout,
  normalize,
  resolveObsKojScale
} = require("../scripts/MIA_OVERLAY_LAYOUT");

const ROOT = path.resolve(__dirname, "..");

function ok(name) {
  console.log(`ok - ${name}`);
}

function run() {
  resetLayout();
  const base = getLayout({ forceReload: true });
  assert.strictEqual(base.kojScale, DEFAULTS.kojScale);
  assert.ok(base.kojScale < 1, "default koj scale is under 1 for portrait fit");
  assert.ok(base.dockMaxW <= 260, "default dock is narrower than legacy 360");
  ok("defaults fit on portrait");

  const saved = saveLayout({ kojScale: 0.7, growthMul: 0.6, obsKojScale: 0.9 });
  assert.strictEqual(saved.kojScale, 0.7);
  assert.strictEqual(getLayout().growthMul, 0.6);
  ok("saveLayout persists in memory/disk");

  const clamped = normalize({ kojScale: 9, dockMaxW: 10, growthMul: -1 });
  assert.ok(clamped.kojScale <= 1.4);
  assert.ok(clamped.dockMaxW >= 140);
  assert.ok(clamped.growthMul >= 0.4);
  ok("normalize clamps extremes");

  const prev = process.env.MIA_KOJ_OBS_SCALE;
  process.env.MIA_KOJ_OBS_SCALE = "0.8";
  assert.strictEqual(resolveObsKojScale("tiktok", true, 1.0), 0.8);
  delete process.env.MIA_KOJ_OBS_SCALE;
  saveLayout({ obsKojScale: 0.95 });
  assert.strictEqual(resolveObsKojScale("tiktok", true, 1.0), 0.95);
  if (prev == null) delete process.env.MIA_KOJ_OBS_SCALE;
  else process.env.MIA_KOJ_OBS_SCALE = prev;
  ok("resolveObsKojScale prefers env then layout");

  const vision = fs.readFileSync(path.join(ROOT, "scripts", "MIA_OBS_VISION.js"), "utf8");
  assert.match(vision, /resolveObsKojScale/);
  assert.doesNotMatch(vision, /isPortrait \? 1\.35/);
  ok("OBS vision no longer hardcodes 1.35 portrait scale");

  const overlayRoutes = fs.readFileSync(path.join(ROOT, "routes", "overlay.js"), "utf8");
  assert.match(overlayRoutes, /\/overlay\/layout/);
  ok("overlay routes expose layout API");

  const runtimeHtml = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "kojnozrout-runtime.html"),
    "utf8"
  );
  const runtimeCss = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "assets", "kojnozrout", "koj-runtime.css"),
    "utf8"
  );
  const layoutLib = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "lib", "koj-runtime-layout.js"),
    "utf8"
  );
  assert.match(runtimeHtml, /koj-runtime-layout\.js/);
  assert.match(runtimeHtml, /KojRuntimeLayout\.start/);
  assert.match(runtimeCss, /--koj-sprite-scale/);
  assert.match(runtimeCss, /--koj-dock-max-w/);
  assert.match(layoutLib, /\/overlay\/layout/);
  assert.doesNotMatch(layoutLib, /\bcoins?\b/i);
  ok("runtime wires layout lib without coin fields");

  const dashboard = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-streamer-dashboard.html"),
    "utf8"
  );
  assert.match(dashboard, /Velikost overlay/);
  assert.match(dashboard, /btnLayoutSave/);
  ok("streamer dashboard exposes size controls");

  const gift = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "gift-animation-overlay.html"),
    "utf8"
  );
  assert.match(gift, /--gift-cast-scale/);
  ok("gift cast uses scale var");

  resetLayout();
  console.log("overlay_layout_contract: all passed");
}

run();
