"use strict";

const assert = require("assert");
const { PNG } = require("pngjs");
const {
  computeContentCoverage,
  analyzePngBase64Coverage
} = require("../scripts/MIA_EYES");

function makePng(width, height, paint) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const px = paint(x, y) || { r: 0, g: 0, b: 0, a: 0 };
      png.data[i] = px.r;
      png.data[i + 1] = px.g;
      png.data[i + 2] = px.b;
      png.data[i + 3] = px.a;
    }
  }
  return PNG.sync.write(png).toString("base64");
}

async function run() {
  // 1) Prázdné (vše průhledné) → coverage 0, blank
  const blank = makePng(40, 40, () => ({ r: 0, g: 0, b: 0, a: 0 }));
  const blankRes = await analyzePngBase64Coverage(blank, { minCoverage: 0.01 });
  assert.ok(blankRes.ok, "blank analyzed");
  assert.strictEqual(blankRes.contentPixels, 0, "blank has no content pixels");
  assert.ok(blankRes.blank, "transparent overlay flagged blank");

  // 2) Skoro černé (nízká luminance) → bráno jako prázdno
  const darkRes = await analyzePngBase64Coverage(
    makePng(40, 40, () => ({ r: 4, g: 4, b: 4, a: 255 })),
    { minCoverage: 0.01 }
  );
  assert.ok(darkRes.blank, "near-black overlay flagged blank");

  // 3) Bílý čtverec 10×10 uprostřed → coverage ~6.25 %, bbox sedí
  const filled = makePng(40, 40, (x, y) =>
    x >= 15 && x < 25 && y >= 15 && y < 25
      ? { r: 255, g: 255, b: 255, a: 255 }
      : { r: 0, g: 0, b: 0, a: 0 }
  );
  const filledRes = await analyzePngBase64Coverage(filled, { minCoverage: 0.01 });
  assert.ok(filledRes.ok, "filled analyzed");
  assert.strictEqual(filledRes.contentPixels, 100, "10x10 block = 100 content px");
  assert.ok(!filledRes.blank, "visible sprite not flagged blank");
  assert.deepStrictEqual(
    filledRes.bbox,
    { x: 15, y: 15, w: 10, h: 10 },
    "bbox tightly bounds content"
  );

  // 4) computeContentCoverage přímo
  const rgba = Buffer.alloc(4 * 4 * 4, 0);
  rgba[3] = 255;
  rgba[0] = 255; // jeden bílý opaque pixel
  const direct = computeContentCoverage(rgba, 4, 4, {});
  assert.strictEqual(direct.contentPixels, 1, "single content pixel counted");
  assert.deepStrictEqual(direct.bbox, { x: 0, y: 0, w: 1, h: 1 }, "single pixel bbox");

  console.log("✅ MIA visual coverage analyzer");
  console.log("\n---- MIA VISUAL COVERAGE CONTRACT ----");
  console.log("passed");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
