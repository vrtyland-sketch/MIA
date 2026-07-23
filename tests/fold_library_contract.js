"use strict";

const assert = require("assert");
const {
  classifyFoldFile,
  summarizeClassification,
  mediaTypeFromExt
} = require("../scripts/MIA_FOLD_LIBRARY");

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL: ${label} :: ${err.message}`);
  }
}

check("mediaTypeFromExt rozpozná typy", () => {
  assert.strictEqual(mediaTypeFromExt(".mp4"), "video");
  assert.strictEqual(mediaTypeFromExt(".jpg"), "photo");
  assert.strictEqual(mediaTypeFromExt(".mp3"), "audio");
  assert.strictEqual(mediaTypeFromExt(".pdf"), "document");
  assert.strictEqual(mediaTypeFromExt(".xyz"), "other");
});

check("AI video je stream-safe", () => {
  const c = classifyFoldFile("hailuo_1769712635.mp4", { ext: ".mp4", sizeBytes: 2_000_000 });
  assert.strictEqual(c.category, "stream-video");
  assert.strictEqual(c.streamSafe, true);
  assert.strictEqual(c.target, "videos");
});

check("lv_ video je stream-safe", () => {
  const c = classifyFoldFile("lv_0_20260309100507.mp4", { ext: ".mp4" });
  assert.strictEqual(c.streamSafe, true);
});

check("WhatsApp video je soukromé (mimo stream)", () => {
  const c = classifyFoldFile("VID-20260201-WA0011.mp4", { ext: ".mp4" });
  assert.strictEqual(c.category, "private");
  assert.strictEqual(c.streamSafe, false);
  assert.strictEqual(c.target, "private/videos");
});

check("kamera foto (datum) je soukromé", () => {
  const c = classifyFoldFile("20260309_140145.jpg", { ext: ".jpg" });
  assert.strictEqual(c.category, "private");
  assert.strictEqual(c.streamSafe, false);
});

check("IMG_ foto je soukromé", () => {
  const c = classifyFoldFile("IMG_2026.jpg", { ext: ".jpg" });
  assert.strictEqual(c.category, "private");
});

check("screenshot je soukromé", () => {
  const c = classifyFoldFile("Screenshot_20260101.png", { ext: ".png" });
  assert.strictEqual(c.category, "private");
});

check("dokument je soukromé", () => {
  const c = classifyFoldFile("smlouva.pdf", { ext: ".pdf" });
  assert.strictEqual(c.category, "document");
  assert.strictEqual(c.target, "private/documents");
});

check("neznámé video jde do review, ne na stream", () => {
  const c = classifyFoldFile("nahodne_video.mp4", { ext: ".mp4" });
  assert.strictEqual(c.category, "review");
  assert.strictEqual(c.streamSafe, false);
  assert.strictEqual(c.target, "review/videos");
});

check("soukromý vzor má přednost před stream-safe", () => {
  // hailuo i WhatsApp v názvu → musí vyhrát soukromí
  const c = classifyFoldFile("WhatsApp hailuo_clip.mp4", { ext: ".mp4" });
  assert.strictEqual(c.streamSafe, false);
});

check("skrytý soubor se ignoruje", () => {
  const c = classifyFoldFile(".thumb.jpg", { ext: ".jpg" });
  assert.strictEqual(c.category, "ignored");
  assert.strictEqual(c.target, null);
});

check("summarizeClassification spočítá kategorie", () => {
  const entries = [
    classifyFoldFile("hailuo_1.mp4", { ext: ".mp4" }),
    classifyFoldFile("VID-20260201-WA0011.mp4", { ext: ".mp4" }),
    classifyFoldFile("smlouva.pdf", { ext: ".pdf" }),
    classifyFoldFile("nahodne.mp4", { ext: ".mp4" })
  ];
  const s = summarizeClassification(entries);
  assert.strictEqual(s.total, 4);
  assert.strictEqual(s.streamSafe, 1);
  assert.ok(s.private >= 2);
  assert.strictEqual(s.review, 1);
});

console.log(`\nfold_library_contract: passed ${passed} failed ${failed}`);
process.exit(failed === 0 ? 0 : 1);
