"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const viewerMemory = require("../core/viewer-memory");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-vm-"));
const filePath = path.join(tmpDir, "viewer-memory.json");

viewerMemory.configureViewerMemory({ path: filePath });
viewerMemory.resetViewerMemoryForTest();
viewerMemory.configureViewerMemory({ path: filePath });

test("recordGift stores miaPoints not coins / not chat text", () => {
  const r1 = viewerMemory.recordGift({
    type: "gift",
    user: { id: "42", name: "Pepa" },
    gift: { name: "Rose", miaPoints: 15, count: 1 },
    text: "SECRET CHAT SHOULD NOT BE STORED"
  });
  assert.equal(r1.wasNew, true);
  assert.equal(r1.viewer.giftCount, 1);
  assert.equal(r1.viewer.totalMiaPoints, 15);
  assert.equal(r1.viewer.favoriteGift, "ROSE");

  viewerMemory.flushSync();
  const raw = fs.readFileSync(filePath, "utf8");
  assert.ok(!raw.includes("SECRET"));
  assert.ok(!raw.toLowerCase().includes("coins"));
  assert.ok(raw.includes("miaPoints") || raw.includes("totalMiaPoints"));
});

test("recordChat increments count without storing message", () => {
  const r = viewerMemory.recordChat({
    type: "chat",
    user: { id: "42", name: "Pepa" },
    text: "private hello world"
  });
  assert.equal(r.viewer.chatCount, 1);
  viewerMemory.flushSync();
  const raw = fs.readFileSync(filePath, "utf8");
  assert.ok(!raw.includes("private hello"));
});

test("favoriteGift updates with repeated gifts", () => {
  viewerMemory.recordGift({
    user: { id: "42", name: "Pepa" },
    gift: { name: "Galaxy", miaPoints: 100, count: 3 }
  });
  const v = viewerMemory.getViewer({ userId: "42" });
  assert.equal(v.favoriteGift, "GALAXY");
  assert.ok(v.giftCount >= 4);
});

test("buildMemoryThankLine first support", () => {
  const line = viewerMemory.buildMemoryThankLine(
    { name: "NewFan", giftCount: 1 },
    { firstSupport: true, speaker: "mia" }
  );
  assert.match(line, /první/i);
});

test("toGiftMemoryShape aliases", () => {
  const shape = viewerMemory.toGiftMemoryShape(
    { name: "Pepa", giftCount: 4, totalMiaPoints: 50, favoriteGift: "ROSE" },
    "ROSE"
  );
  assert.equal(shape.totalGifts, 4);
  assert.equal(shape.source, "phase2_viewer_memory");
  assert.equal(shape.currentGiftKey, "ROSE");
});

viewerMemory.resetViewerMemoryForTest();
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch (_err) {
  /* ignore */
}

console.log("phase2_viewer_memory_contract: all passed");
