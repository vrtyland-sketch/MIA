"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const hostModeConfig = require("../scripts/MIA_HOST_MODE_CONFIG");
const manifest = require("../scripts/MIA_OBS_LIVE_MANIFEST");

test("buildHostPanelSnapshot hides panel when live", () => {
  const panel = hostModeConfig.buildHostPanelSnapshot({
    hostMode: { hostMode: "live", awayActive: false, label: "LIVE", badge: "LIVE" },
    capybaraFlow: null,
    audience: { viewerCount: 120, platform: "tiktok" }
  });
  assert.equal(panel.awayActive, false);
  assert.equal(panel.overlayVisible, false);
  assert.equal(panel.ninjaEmbedUrl, null);
});

test("buildHostPanelSnapshot shows away panel with capybara prompt", () => {
  const panel = hostModeConfig.buildHostPanelSnapshot({
    hostMode: {
      hostMode: "nejsem_tu",
      awayActive: true,
      label: "NEJSEM TU · MIA HOST",
      badge: "HOST",
      sceneName: "SPINAK_NEJSEM_TU"
    },
    capybaraFlow: {
      active: true,
      phase: "waiting_comment",
      waitPrompt: "NEJSEM TU režim — Kapybara proběhla. Napiš do chatu, odpovím.",
      gifter: "Fan123",
      giftName: "Kapybara"
    },
    audience: { viewerCount: 42, platform: "tiktok" },
    env: { MIA_OBS_NINJA_URL: "https://vdo.ninja/?view=abc123" }
  });
  assert.equal(panel.overlayVisible, true);
  assert.equal(panel.audience.viewerCount, 42);
  assert.match(panel.ninjaEmbedUrl, /^https:\/\/vdo\.ninja/);
  assert.equal(panel.capybara.gifter, "Fan123");
});

test("resolveNinjaEmbedUrl rejects invalid values", () => {
  assert.equal(hostModeConfig.resolveNinjaEmbedUrl({ MIA_OBS_NINJA_URL: "" }), null);
  assert.equal(hostModeConfig.resolveNinjaEmbedUrl({ MIA_OBS_NINJA_URL: "not-a-url" }), null);
});

test("OBS manifest includes host_mode layer", () => {
  const live = manifest.buildLiveManifest({ port: 3000 });
  const layer = live.browserLayers.find((row) => row.id === "host_mode");
  assert.ok(layer);
  assert.equal(layer.inputName, "MIA_HOST_MODE");
  assert.match(layer.url, /host-mode-overlay\.html/);
});

test("buildSplitUrls exposes hostMode url", () => {
  const urls = manifest.buildSplitUrls(3000);
  assert.match(urls.hostMode, /host-mode-overlay\.html/);
});

test("host-mode-overlay.html polls hostPanel", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "mia-output-overlay", "host-mode-overlay.html"),
    "utf8"
  );
  assert.match(html, /hostPanel/);
  assert.match(html, /\/overlay-state/);
});
