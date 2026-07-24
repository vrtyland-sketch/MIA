"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const manifest = require("../scripts/MIA_OBS_LIVE_MANIFEST");

test("buildLiveManifest includes all obs browser layers", () => {
  const live = manifest.buildLiveManifest({ port: 3000 });
  assert.equal(live.scene, "SPINAK_ENGINE_GIFTS");
  assert.ok(live.browserLayers.length >= 14);
  const ids = new Set(live.browserLayers.map((row) => row.id));
  for (const required of [
    "speech",
    "entity",
    "combo",
    "host_mode",
    "runtime",
    "bowl",
    "voice",
    "viewer_strip",
    "mia_head",
    "graphics_preview"
  ]) {
    assert.ok(ids.has(required), `missing ${required}`);
  }
});

test("OBS input aliases resolve speech / koj / bowl dual names", () => {
  assert.ok(manifest.resolveObsInputNames("MIA_SPEECH").includes("MIA_BUBBLE"));
  assert.ok(manifest.resolveObsInputNames("MIA_BUBBLE").includes("MIA_SPEECH"));
  assert.ok(manifest.resolveObsInputNames("MIA_KOJ_RUNTIME").includes("KOJNOZROUT_RUNTIME"));
  assert.ok(manifest.resolveObsInputNames("KOJNOZROUT_RUNTIME").includes("MIA_KOJ_RUNTIME"));
  assert.ok(manifest.resolveObsInputNames("MIA_BOWL").includes("KOJNOZROUT_BOWL_V2"));
  assert.ok(manifest.resolveObsInputNames("KOJNOZROUT_BOWL_V2").includes("MIA_BOWL"));
});

test("buildSplitUrls busts speech / runtime / bowl with GFX_CACHE_BUST; gift with GIFT_ANIM", () => {
  const urls = manifest.buildSplitUrls(3000);
  const bust = `v=${manifest.GFX_CACHE_BUST}`;
  const giftBust = `v=${manifest.GIFT_ANIM_CACHE_BUST}`;
  assert.match(urls.speech, new RegExp(`speech-overlay\\.html\\?${bust}`));
  assert.match(urls.runtime, new RegExp(`kojnozrout-runtime\\.html\\?${bust}`));
  assert.match(urls.bowl, new RegExp(`kojnozrout-bowl-overlay\\.html\\?${bust}`));
  assert.match(urls.giftAnimation, new RegExp(`gift-animation-overlay\\.html\\?${giftBust}`));
  assert.equal(manifest.GFX_CACHE_BUST, "36-koj-unify");
  assert.equal(manifest.GIFT_ANIM_CACHE_BUST, "37-stream-polish");
  assert.equal(manifest.KOJ_SPLIT_CACHE_BUST, "49-r1-milestone-polish");
});

test("buildLiveManifest exposes cache bust fields for studio desks", () => {
  const live = manifest.buildLiveManifest({ port: 3000 });
  assert.equal(live.gfxCacheBust, "36-koj-unify");
  assert.equal(live.giftAnimCacheBust, "37-stream-polish");
  assert.equal(live.kojSplitCacheBust, "49-r1-milestone-polish");
});

test("buildSplitUrls includes viewerStrip", () => {
  const urls = manifest.buildSplitUrls(3000);
  assert.match(urls.viewerStrip, /viewer-strip-overlay\.html/);
  assert.match(urls.hostMode, /host-mode-overlay\.html/);
  assert.match(urls.speech, /speech-overlay\.html/);
});

test("formatManifestText lists OBS input names", () => {
  const text = manifest.formatManifestText(manifest.buildLiveManifest({ port: 3000 }));
  assert.match(text, /MIA_SPEECH/);
  assert.match(text, /MIA_VIEWER_STRIP/);
  assert.match(text, /MIA_HOST_MODE/);
  assert.match(text, /MIA_HEAD/);
  assert.match(text, /MIA_GRAPHICS_PREVIEW/);
});

test("zIndex ordering puts combo above speech", () => {
  const combo = manifest.BROWSER_LAYERS.find((row) => row.id === "combo");
  const speech = manifest.BROWSER_LAYERS.find((row) => row.id === "speech");
  assert.ok(combo.zIndex > speech.zIndex);
});
