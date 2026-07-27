"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  isEngine2StubEnabled,
  applyOverlayProfile,
  getPluginLoader,
  resetPluginLoaderForTests,
  createSandboxBus,
  validateManifest
} = require("../engine2");
const { buildEngine2AdminSnapshot } = require("../engine2/wiring");

const ROOT = path.join(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

const SAMPLE_OVERLAY = Object.freeze({
  updatedAt: Date.now(),
  kojDisplay: { mood: "calm", scene: "main" },
  chatFeed: [],
  recentGifts: []
});

test("game registry and hello plugin files exist", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "game", "_registry.json")));
  assert.ok(fs.existsSync(path.join(ROOT, "game", "hello", "manifest.json")));
  assert.ok(fs.existsSync(path.join(ROOT, "game", "hello", "index.js")));
});

test("hello plugin loads and unloads without restart", () => {
  resetPluginLoaderForTests();
  const loader = getPluginLoader();

  const loadResult = loader.loadPlugin("hello");
  assert.equal(loadResult.ok, true);
  assert.equal(loadResult.pluginId, "hello");
  assert.equal(loader.getLoadedPlugins().length, 1);

  const unloadResult = loader.unloadPlugin("hello");
  assert.equal(unloadResult.ok, true);
  assert.equal(loader.getLoadedPlugins().length, 0);
});

test("plugin sandbox blocks OBS and overlay coin writes", () => {
  const bus = createSandboxBus();
  assert.throws(() => bus.obs.call("SetScene", {}), /OBS directly/i);
  assert.throws(() => bus.overlay.setCoins(100), /coin values/i);
});

test("manifest rejects forbidden permissions", () => {
  assert.throws(
    () =>
      validateManifest({
        id: "game.bad",
        permissions: ["overlay.coins"]
      }),
    /forbidden/i
  );
});

test("game profile hidden until plugin active", () => {
  resetPluginLoaderForTests();
  const loader = getPluginLoader();

  const idle = applyOverlayProfile(SAMPLE_OVERLAY, "game", { activePlugin: null });
  assert.equal(idle.gameChannel.active, false);
  assert.equal(idle.gameChannel.pluginId, null);

  loader.loadPlugin("hello");
  const active = applyOverlayProfile(SAMPLE_OVERLAY, "game", {
    activePlugin: loader.getActivePlugin()
  });
  assert.equal(active.gameChannel.active, true);
  assert.equal(active.gameChannel.pluginId, "game.hello");
  assert.equal(active.gameChannel.phase, "ready");

  loader.unloadPlugin("hello");
});

test("admin routes register engine2 plugin endpoints", () => {
  const adminSrc = fs.readFileSync(path.join(ROOT, "routes", "admin.js"), "utf8");
  assert.match(adminSrc, /engine2\/plugins/);
  assert.match(adminSrc, /loadPlugin/);
  assert.match(adminSrc, /unloadPlugin/);
});

test("MIA_ENGINE2_STUB=1 admin snapshot includes plugins (E4)", () => {
  resetPluginLoaderForTests();
  const prev = process.env.MIA_ENGINE2_STUB;
  process.env.MIA_ENGINE2_STUB = "1";
  const snap = buildEngine2AdminSnapshot({});
  assert.equal(snap.phase, "E5a");
  assert.ok(snap.plugins);
  assert.ok(Array.isArray(snap.plugins.registry.plugins));
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
  resetPluginLoaderForTests();
});

test("MIA_ENGINE2_STUB defaults OFF", () => {
  const prev = process.env.MIA_ENGINE2_STUB;
  delete process.env.MIA_ENGINE2_STUB;
  assert.equal(isEngine2StubEnabled(), false);
  assert.equal(buildEngine2AdminSnapshot({}), undefined);
  if (prev === undefined) delete process.env.MIA_ENGINE2_STUB;
  else process.env.MIA_ENGINE2_STUB = prev;
});

console.log("mia_engine2_e4_contract: all passed");
