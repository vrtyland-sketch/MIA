"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PNG } = require("pngjs");
const {
  convertSprite,
  markEdgeBackground
} = require("../scripts/kojnozrout_prepare_sprite");
const { inspectKojnozoutAssets } = require("../scripts/MIA_KOJNOZROUT_ASSETS");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

function writeSolidPng(filePath, width, height, fillFn) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (width * y + x) << 2;
      const [r, g, b, a] = fillFn(x, y);
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = a;
    }
  }

  return new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(fs.createWriteStream(filePath))
      .on("finish", resolve)
      .on("error", reject);
  });
}

(async () => {
  await testAsync("convertSprite keys magenta background to alpha", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-sprite-"));
    const input = path.join(dir, "in.png");
    const output = path.join(dir, "out.png");

    await writeSolidPng(input, 8, 8, (x, y) => {
      if (x >= 2 && x <= 5 && y >= 2 && y <= 5) return [20, 180, 40, 255];
      return [255, 0, 255, 255];
    });

    const result = await convertSprite(input, output, { mode: "magenta" });
    assert.ok(result.alphaRatio > 0.5);

    const out = await new Promise((resolve, reject) => {
      fs.createReadStream(output)
        .pipe(new PNG())
        .on("parsed", function onParsed() {
          resolve(this);
        })
        .on("error", reject);
    });

    assert.equal(out.data[0], 255);
    assert.equal(out.data[3], 0);
    assert.equal(out.data[(2 * 8 + 2) << 2], 20);
    assert.equal(out.data[((2 * 8 + 2) << 2) + 3], 255);
  });

  test("inspectKojnozoutAssets reports production mood files", () => {
    const report = inspectKojnozoutAssets();
    assert.equal(report.requiredCount, 5);
    assert.equal(report.presentCount, 5);
    assert.equal(report.missingCount, 0);
    assert.equal(report.ok, true);
  });

  test("markEdgeBackground avoids interior neutral pixels", () => {
    const data = Buffer.alloc(4 * 4 * 4, 0);
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const i = (y * 4 + x) << 2;
        if (x === 1 && y === 1) {
          data[i] = 240;
          data[i + 1] = 240;
          data[i + 2] = 240;
          data[i + 3] = 255;
          continue;
        }
        data[i] = 255;
        data[i + 1] = 0;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }

    const mask = markEdgeBackground(data, 4, 4, "magenta");
    assert.equal(mask[0], 1);
    assert.equal(mask[1 * 4 + 1], 0);
  });

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log("");
  console.log("---- KOJNOZROUT SPRITE ALPHA CONTRACT ----");
  console.log("passed");
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
