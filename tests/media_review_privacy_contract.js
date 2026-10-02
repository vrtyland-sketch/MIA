"use strict";

const assert = require("assert/strict");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REVIEW_DIR = path.join(ROOT, "data", "media-review-frames");
const VIDEO_REVIEW_DIR = path.join(ROOT, "data", "video-review-frames");
const MANIFEST_PATH = path.join(ROOT, "config", "media-visual-review.json");

const HANDLE_WITH_DIGITS = /\b[A-Za-z][A-Za-z0-9_]{2,24}\d{2,}\b/;
const NAME_VERSUS_NAME = /\b[A-Z][A-Za-z]{2,}\s+vs\s+[A-Z][A-Za-z]{2,}\b/;
const SHOUT_TEAM = /\b[A-Z]{4,}\s+TEAM\b/;

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

function assertNoPersonalHandle(label, text) {
  const value = String(text || "");
  if (
    HANDLE_WITH_DIGITS.test(value) ||
    NAME_VERSUS_NAME.test(value) ||
    SHOUT_TEAM.test(value)
  ) {
    assert.fail(`${label} contains a personal handle pattern`);
  }
}

function parkDir(dirPath) {
  if (!fs.existsSync(dirPath)) return { existed: false, backup: "" };
  const backup = path.join(os.tmpdir(), `mia-review-park-${path.basename(dirPath)}-${process.pid}`);
  fs.renameSync(dirPath, backup);
  return { existed: true, backup };
}

function unparkDir(dirPath, parked) {
  if (!parked.existed) return;
  if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
  fs.renameSync(parked.backup, dirPath);
}

test("review frame directories are untracked and the manifest stays tracked", () => {
  const tracked = execFileSync("git", ["ls-files", "data/media-review-frames", "data/video-review-frames"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(tracked.trim(), "");

  execFileSync("git", ["ls-files", "--error-unmatch", "config/media-visual-review.json"], { cwd: ROOT });
  const ignored = execFileSync(
    "git",
    ["check-ignore", "data/media-review-frames/frame.jpg", "data/video-review-frames/frame.jpg"],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(ignored.trim().split("\n").length, 2);
});

test("committed review text has no handle-like personal labels", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  for (const item of manifest.items || []) {
    assertNoPersonalHandle(`visualSummary ${item.rel}`, item.visualSummary);
  }

  const intake = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "media-intake-overrides.json"), "utf8"));
  for (const row of intake.assignments || []) {
    assertNoPersonalHandle(`intake note ${row.rel}`, row.note);
  }

  const { CURATED } = require("../scripts/media_visual_review_apply");
  for (const [rel, row] of Object.entries(CURATED)) {
    assertNoPersonalHandle(`curated summary ${rel}`, row.visualSummary);
  }

  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "stream-media-catalog.json"), "utf8"));
  for (const item of catalog.items || []) {
    if (!item.intakeNote) continue;
    assertNoPersonalHandle(`intakeNote ${item.rel}`, item.intakeNote);
  }
});

test("catalog metadata loads with review frames absent and does not open them", () => {
  const parkedReview = parkDir(REVIEW_DIR);
  const parkedVideo = parkDir(VIDEO_REVIEW_DIR);
  const opened = [];
  const originalRead = fs.readFileSync;
  const originalExists = fs.existsSync;
  fs.readFileSync = function patchedRead(filePath, ...args) {
    const text = String(filePath);
    if (text.includes(`${path.sep}media-review-frames${path.sep}`) || text.includes(`${path.sep}video-review-frames${path.sep}`)) {
      opened.push(text);
    }
    return originalRead.call(fs, filePath, ...args);
  };
  fs.existsSync = function patchedExists(filePath) {
    const text = String(filePath);
    if (text.includes(`${path.sep}media-review-frames${path.sep}`) || text.includes(`${path.sep}video-review-frames${path.sep}`)) {
      opened.push(text);
    }
    return originalExists.call(fs, filePath);
  };

  try {
    assert.equal(fs.existsSync(REVIEW_DIR), false);
    assert.equal(fs.existsSync(VIDEO_REVIEW_DIR), false);

    const graphicReference = require("../scripts/MIA_GRAPHIC_REFERENCE");
    const catalog = require("../scripts/MIA_MEDIA_CATALOG");
    const index = graphicReference.loadVisualMetadataIndex();

    const prague = graphicReference.enrichVideoWithVisualMeta({
      kind: "videos",
      rel: "videos_2/VID-20260318-WA0333.mp4",
      name: "VID-20260318-WA0333.mp4",
      contentKind: "story_music",
      pattern: "whatsapp_video",
      qualityScore: 95
    });
    assert.equal(prague.theme, "prague_pixverse");
    assert.ok(prague.tags.includes("prague"));
    assert.ok(prague.tags.includes("pixverse"));
    assert.equal(prague.visualReviewed, true);
    assert.match(prague.visualSummary, /Karl[ůu]v most|Praha|Prague/i);
    assert.equal(graphicReference.isGraphicReferenceVideo(prague), true);

    const romance = index.get("videos_2/VID-20260318-WA0328.mp4");
    assert.equal(romance.theme, "prague_romance");
    assert.ok(romance.tags.includes("prague"));
    assert.match(romance.visualSummary, /Karl[ůu]v most/);

    const pool = graphicReference.buildGraphicReferencePool([
      prague,
      {
        kind: "videos",
        rel: "videos_2/2026-06-21-201620647.mp4",
        contentKind: "story_epic",
        pattern: "photos_export",
        qualityScore: 90
      }
    ]);
    assert.deepEqual(pool.map((row) => row.rel), ["videos_2/VID-20260318-WA0333.mp4"]);

    const manifest = JSON.parse(originalRead.call(fs, MANIFEST_PATH, "utf8"));
    const byRel = new Map(manifest.items.map((item) => [item.rel, item]));
    const duel = byRel.get("videos_2/2026-06-21-201620647.mp4");
    assert.equal(duel.tier, "T4");
    assert.equal(duel.contentKind, "story_epic");
    assert.equal(duel.theme, "community_duel_promo");
    assert.equal(duel.obsSlot, "T5_VIDEO_21");
    assert.deepEqual(duel.tags, [
      "photos_export",
      "google_photos_export",
      "longform",
      "needs_full_watch",
      "duel",
      "community",
      "promo"
    ]);
    assert.equal(graphicReference.isPragueThemed(duel), false);

    const tribute = byRel.get("videos/lv_7569904188230995253_20260217112138.mp4");
    assert.equal(tribute.tier, "T3");
    assert.equal(tribute.contentKind, "donator_moment");
    assert.equal(tribute.theme, "top_donator");
    assert.equal(tribute.obsSlot, "T4_VIDEO_18");
    assert.ok(tribute.tags.includes("donator"));
    assert.equal(tribute.visualSummary, "PixVerse — TOP DONATORS community tribute, komunitní T3");

    const brand = byRel.get("videos/lv_7518394866301209909_20260302101327.mp4");
    assert.equal(brand.tier, "T3");
    assert.equal(brand.contentKind, "story_music");
    assert.equal(brand.theme, "community_brand");
    assert.equal(brand.obsSlot, "T3_VIDEO_11");
    assert.equal(brand.visualSummary, "LV — community team van u řeky, komunitní branding clip, T3");

    const loaded = catalog.loadCatalog();
    const catalogTribute = loaded.items.find((item) => item.rel === tribute.rel);
    assert.equal(catalogTribute.contentKind, "donator_moment");
    assert.equal(catalogTribute.suggestedTier, "T3");
    assert.equal(catalogTribute.intakeNote, tribute.visualSummary);
    const catalogBrand = loaded.items.find((item) => item.rel === brand.rel);
    assert.equal(catalogBrand.contentKind, "story_music");
    assert.equal(catalogBrand.suggestedTier, "T3");
    assert.equal(catalogBrand.intakeNote, brand.visualSummary);

    const reviewScript = originalRead.call(fs, path.join(ROOT, "scripts", "media_visual_review.js"), "utf8");
    assert.match(reviewScript, /media-review-frames/);
    const packageJson = JSON.parse(originalRead.call(fs, path.join(ROOT, "package.json"), "utf8"));
    assert.match(packageJson.scripts["media:review"], /media_visual_review\.js/);
    assert.match(packageJson.scripts["media:review:all"], /media_visual_review\.js all/);

    for (const rel of ["scripts/MIA_GRAPHIC_REFERENCE.js", "scripts/MIA_MEDIA_CATALOG.js", "index.js"]) {
      const source = originalRead.call(fs, path.join(ROOT, rel), "utf8");
      assert.equal(source.includes("media-review-frames"), false, rel);
      assert.equal(source.includes("video-review-frames"), false, rel);
    }

    assert.deepEqual(opened, []);
  } finally {
    fs.readFileSync = originalRead;
    fs.existsSync = originalExists;
    unparkDir(REVIEW_DIR, parkedReview);
    unparkDir(VIDEO_REVIEW_DIR, parkedVideo);
  }
});

if (process.exitCode) process.exit(process.exitCode);
console.log("media_review_privacy_contract: all passed");
