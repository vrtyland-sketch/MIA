"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { createPluginHost } = require("../shared/mia-paint-core");
const pluginLoader = require("../scripts/MIA_PAINT_PLUGIN_LOADER");
const nativeBridge = require("../scripts/MIA_PAINT_NATIVE_BRIDGE");

const ROOT = path.join(__dirname, "..");

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const hostApi = createPluginHost();
  assert.ok(hostApi.validateManifest({ id: "test", name: "T", entry: "p.js" }).ok);
  assert.ok(!hostApi.validateManifest({ id: "../evil", name: "X", entry: "p.js" }).ok);
  pass("PluginHost validateManifest");

  let called = false;
  hostApi.register(
    { id: "demo", name: "Demo", entry: "demo.js", hooks: ["init"] },
    (host) => {
      host.on("afterRender", () => {
        called = true;
      });
    }
  );
  hostApi.host.emit("afterRender", {});
  assert.ok(called);
  pass("PluginHost hooks");

  const plugins = pluginLoader.discoverPlugins();
  assert.ok(plugins.length >= 2, "official plugins");
  assert.ok(plugins.some((p) => p.id === "grid-overlay"));
  assert.ok(plugins.some((p) => p.id === "koj-factory-export"));
  pass("discoverPlugins whitelist");

  const grid = pluginLoader.getPluginScript("grid-overlay");
  assert.match(grid.source, /afterRender/);
  assert.ok(!grid.source.includes("eval("));
  pass("plugin script safe load");

  const browser = nativeBridge.detectShellMode({ shell: "1" });
  assert.equal(browser, true);
  const caps = nativeBridge.getNativeCapabilities({ shellMode: true });
  assert.equal(caps.runtime, "mia-paint-shell");
  assert.equal(caps.capabilities.windowsInk, process.platform === "win32");
  const tauriCaps = nativeBridge.getNativeCapabilities({
    shellMode: true,
    query: { native: "tauri" }
  });
  assert.equal(tauriCaps.runtime, "mia-paint-tauri");
  assert.equal(tauriCaps.capabilities.tauriNative, true);
  pass("native capabilities");

  const routes = fs.readFileSync(path.join(ROOT, "routes", "mia_paint.js"), "utf8");
  assert.match(routes, /\/mia\/paint\/plugins/);
  assert.match(routes, /\/mia\/paint\/native\/status/);
  pass("paint routes plugins + native");

  const html = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "index.html"), "utf8");
  assert.match(html, /mia-paint-plugin-host/);
  assert.match(html, /pluginMenuItems/);
  assert.match(html, /nativeBackend/);
  const appJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "app.js"), "utf8");
  assert.match(appJs, /initPlugins/);
  assert.match(appJs, /emitAfterRender/);
  pass("editor plugin + native wiring");

  assert.ok(fs.existsSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "shell.html")));
  assert.ok(fs.existsSync(path.join(ROOT, "tools", "mia-paint-shell", "launch.ps1")));
  pass("shell scaffold");

  console.log("\n---- MIA PAINT PLUGIN / SHELL CONTRACT ----");
  console.log("passed");
}

run();
