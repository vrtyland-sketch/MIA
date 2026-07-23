"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const paintSmoke = require("../scripts/MIA_PAINT_SMOKE");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("evaluatePaintStatusPayload", () => {
  const good = paintSmoke.evaluatePaintStatusPayload({
    ok: true,
    document: { layerCount: 1 },
    agentCommands: ["set_tool"]
  });
  assert.equal(good.ok, true);
  assert.equal(good.layerCount, 1);

  const bad = paintSmoke.evaluatePaintStatusPayload({ ok: true });
  assert.equal(bad.ok, false);
});

test("evaluatePaintWsPayload", () => {
  const good = paintSmoke.evaluatePaintWsPayload({ ok: true, path: "/mia/paint/ws", attached: true });
  assert.equal(good.ok, true);
  const bad = paintSmoke.evaluatePaintWsPayload({ ok: true, path: "/other" });
  assert.equal(bad.ok, false);
});

test("evaluatePaintPluginsPayload requires official plugins", () => {
  const good = paintSmoke.evaluatePaintPluginsPayload({
    ok: true,
    plugins: [{ id: "grid-overlay" }, { id: "koj-factory-export" }]
  });
  assert.equal(good.ok, true);
  assert.equal(good.count, 2);
});

test("evaluatePaintEditorHtml", () => {
  const html = fs.readFileSync(path.join(paintSmoke.PAINT_DIR, "index.html"), "utf8");
  const evalHtml = paintSmoke.evaluatePaintEditorHtml(html);
  assert.equal(evalHtml.ok, true, `missing: ${evalHtml.missing.join(", ")}`);
});

test("static asset audit passes", () => {
  const checks = paintSmoke.auditStaticAssets();
  const failed = checks.filter((c) => !c.ok && c.severity !== "warn");
  assert.equal(failed.length, 0, failed.map((c) => c.name).join(", "));
});

test("smoke module exports runPaintSmoke", () => {
  assert.equal(typeof paintSmoke.runPaintSmoke, "function");
  assert.ok(Array.isArray(paintSmoke.REQUIRED_LIBS));
});

test("package.json paint:smoke script", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.ok(pkg.scripts["paint:smoke"]);
  assert.ok(pkg.scripts["paint:tauri:icons"]);
});

console.log("mia_paint_smoke_contract: all passed");
