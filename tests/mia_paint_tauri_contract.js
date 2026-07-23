"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const nativeBridge = require("../scripts/MIA_PAINT_NATIVE_BRIDGE");

const ROOT = path.resolve(__dirname, "..");
const TAURI_ROOT = path.join(ROOT, "tools", "mia-paint-tauri");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("tauri scaffold files exist", () => {
  assert.ok(fs.existsSync(path.join(TAURI_ROOT, "package.json")));
  assert.ok(fs.existsSync(path.join(TAURI_ROOT, "launch.ps1")));
  assert.ok(fs.existsSync(path.join(TAURI_ROOT, "ui", "shell.html")));
  assert.ok(fs.existsSync(path.join(TAURI_ROOT, "ui", "bridge.js")));
  assert.ok(fs.existsSync(path.join(TAURI_ROOT, "src-tauri", "Cargo.toml")));
  assert.ok(fs.existsSync(path.join(TAURI_ROOT, "src-tauri", "tauri.conf.json")));
  assert.ok(fs.existsSync(path.join(TAURI_ROOT, "src-tauri", "src", "lib.rs")));
});

test("native bridge detects tauri mode", () => {
  assert.equal(nativeBridge.detectShellMode({ native: "tauri" }), true);
  assert.equal(nativeBridge.isTauriMode({ native: "tauri" }), true);
  const caps = nativeBridge.getNativeCapabilities({
    shellMode: true,
    query: { native: "tauri" }
  });
  assert.equal(caps.runtime, "mia-paint-tauri");
  assert.equal(caps.capabilities.tauriNative, true);
  assert.equal(caps.capabilities.saveDialog, true);
  assert.equal(caps.capabilities.openDialog, true);
});

test("shared shell bridge module", () => {
  const src = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-paint", "lib", "mia-paint-native-shell.js"),
    "utf8"
  );
  assert.match(src, /readPressure/);
  assert.match(src, /attachShellHost/);
  assert.match(src, /native-open/);
  assert.match(src, /native-save/);
});

test("editor wires tauri native dialogs", () => {
  const html = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-paint", "index.html"),
    "utf8"
  );
  assert.match(html, /mia-paint-native-shell/);
  const appJs = fs.readFileSync(path.join(ROOT, "mia-output-overlay", "mia-paint", "app.js"), "utf8");
  assert.match(appJs, /nativeDialogs/);
  assert.match(appJs, /openProjectNative/);
  assert.match(appJs, /native-save/);
  const css = fs.readFileSync(
    path.join(ROOT, "mia-output-overlay", "mia-paint", "styles", "editor.css"),
    "utf8"
  );
  assert.match(css, /touch-action:\s*none/);
});

test("routes expose tauri info", () => {
  const routes = fs.readFileSync(path.join(ROOT, "routes", "mia_paint.js"), "utf8");
  assert.match(routes, /\/mia\/paint\/native\/tauri/);
});

test("rust commands for dialog + fs", () => {
  const lib = fs.readFileSync(path.join(TAURI_ROOT, "src-tauri", "src", "lib.rs"), "utf8");
  assert.match(lib, /pick_open_file/);
  assert.match(lib, /pick_save_file/);
  assert.match(lib, /tablet_info/);
  assert.match(lib, /read_file_bytes/);
  assert.match(lib, /write_file_bytes/);
});

test("package.json paint:tauri script", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.ok(pkg.scripts["paint:tauri"]);
  assert.match(pkg.scripts["test:mia-paint"], /mia_paint_tauri_contract/);
});

console.log("mia_paint_tauri_contract: all passed");
