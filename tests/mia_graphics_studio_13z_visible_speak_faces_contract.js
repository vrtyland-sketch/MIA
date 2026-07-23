"use strict";



const assert = require("assert/strict");

const fs = require("fs");

const path = require("path");

const sharp = require("sharp");

const graphicsStudio = require("../shared/mia-graphics-studio");



const ROOT = path.resolve(__dirname, "..");

const OVERLAY = path.join(ROOT, "mia-output-overlay");

const LIP_DIR = path.join(OVERLAY, "assets", "mia", "parts", "speak-lip");



async function test(name, fn) {

  try {

    await fn();

    console.log(`ok - ${name}`);

  } catch (err) {

    console.error(`fail - ${name}`);

    throw err;

  }

}



(async () => {

  await test("catalog lists visible_speak_faces as 13z", () => {

    const def = graphicsStudio.getCommand("visible_speak_faces");

    assert.equal(def.phase, "13z");

    assert.equal(def.status, "implemented");

    const mods = graphicsStudio.listAiAnimationModules();

    assert.ok(mods.some((m) => m.id === "visible_speak_faces" && m.phase === "13z"));

  });



  await test("speak-lip face crops exist and diverge", async () => {

    for (const id of ["01", "02", "03", "04"]) {

      const p = path.join(LIP_DIR, `${id}.png`);

      assert.ok(fs.existsSync(p), `missing ${id}`);

      const m = await sharp(p).metadata();

      assert.ok(m.width >= 300 && m.height >= 300);

      assert.equal(m.hasAlpha, true);

    }

    const a = await sharp(path.join(LIP_DIR, "01.png")).raw().toBuffer();

    const b = await sharp(path.join(LIP_DIR, "04.png")).ensureAlpha().resize(360, 360).raw().toBuffer();

    let diff = 0;

    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff += 1;

    const pct = (100 * diff) / a.length;

    assert.ok(pct > 2, `closedVsWide too similar: ${pct}%`);

  });



  await test("speech overlay + 14a presence wiring", () => {

    const html = fs.readFileSync(path.join(OVERLAY, "speech-overlay.html"), "utf8");

    const presence = fs.readFileSync(path.join(OVERLAY, "lib", "mia-live-presence.js"), "utf8");

    const runtime = fs.readFileSync(path.join(OVERLAY, "lib", "mia-body-part-runtime.js"), "utf8");

    assert.match(html, /mia-live-presence\.js/);

    assert.match(html, /MiaLivePresence/);

    assert.match(html, /MiaHoloMotion|mia-holo-motion/);

    assert.match(html, /body-hero-active/);

    assert.match(presence, /cyber\/lip\/0[12]\.png|parts\/speak-lip\/01\.png/);

    assert.match(runtime, /MiaLivePresence/);

    assert.match(runtime, /sampleLipFrameUrl/);

    const build = fs.readFileSync(path.join(ROOT, "scripts", "build_mia_speak_lip_faces.js"), "utf8");

    assert.match(build, /eye-register|alignToBase|findAlignOffset/);

  });



  console.log("mia_graphics_studio_13z_visible_speak_faces_contract: all passed");

})().catch((err) => {

  console.error(err);

  process.exit(1);

});


