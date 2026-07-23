"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { scanScenes } = require("../scripts/MIA_OBS_SCENE_GUARD");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("\u2705 " + name);
  } catch (err) {
    failed += 1;
    console.log("\u274c " + name + " \u2014 " + (err && err.message));
  }
}

function makeScenesDir(scenes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-scenes-"));
  for (const [name, data] of Object.entries(scenes)) {
    fs.writeFileSync(path.join(dir, name + ".json"), JSON.stringify(data), "utf8");
  }
  return dir;
}

test("clean scene with existing file reports no dead sources", () => {
  const real = __filename; // existující soubor
  const dir = makeScenesDir({
    SPINAK: { sources: [{ name: "ok", id: "image_source", settings: { file: real } }] }
  });
  const r = scanScenes({ scenesDir: dir });
  assert.equal(r.ok, true);
  assert.equal(r.dead.length, 0);
  assert.equal(r.scanned, 1);
});

test("detects dead local file path", () => {
  const dir = makeScenesDir({
    SPINAK: {
      sources: [
        { name: "deadImg", id: "image_source", settings: { file: "C:/Users/Shadow/Downloads/x.png" } },
        { name: "deadVid", id: "ffmpeg_source", settings: { local_file: "C:/Users/Shadow/Downloads/y.mp4" } }
      ]
    }
  });
  const r = scanScenes({ scenesDir: dir });
  assert.equal(r.ok, false);
  assert.equal(r.dead.length, 2);
  assert.ok(r.dead.some((d) => d.sourceName === "deadImg"));
});

test("ignores http/browser source URLs", () => {
  const dir = makeScenesDir({
    SPINAK: {
      sources: [
        { name: "browser", id: "browser_source", settings: { url: "http://127.0.0.1:3000/x.html" } },
        { name: "fileUrl", id: "image_source", settings: { file: "https://example.com/a.png" } }
      ]
    }
  });
  const r = scanScenes({ scenesDir: dir });
  assert.equal(r.dead.length, 0);
});

test("missing scenes dir is treated as ok", () => {
  const r = scanScenes({ scenesDir: path.join(os.tmpdir(), "mia-nonexistent-" + Date.now()) });
  assert.equal(r.ok, true);
  assert.equal(r.scanned, 0);
});

console.log("\n---- OBS SCENE GUARD CONTRACT SUMMARY ----\n");
console.log("passed:", passed);
console.log("failed:", failed);
process.exit(failed > 0 ? 1 : 0);
