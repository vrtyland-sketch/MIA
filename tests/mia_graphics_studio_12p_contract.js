"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { SUITES } = require("../scripts/run_graphics_body_tests");
const graphicsStudio = require("../shared/mia-graphics-studio");

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
  await test("graphics body runner lists 12g-12p suites", () => {
    assert.ok(SUITES.length >= 10);
    assert.ok(SUITES.includes("mia_graphics_studio_12g_contract.js"));
    assert.ok(SUITES.includes("mia_graphics_studio_12o_contract.js"));
    assert.ok(SUITES.includes("mia_graphics_studio_12p_contract.js"));
  });

  await test("package.json exposes test:graphics-body", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
    assert.match(pkg.scripts["test:graphics-body"], /run_graphics_body_tests\.js/);
  });

  await test("docs document graphics body block and test command", () => {
    const runner = require("../scripts/run_graphics_body_tests");
    const studio = fs.readFileSync(
      path.join(__dirname, "..", "docs", "MIA_GRAPHICS_STUDIO.md"),
      "utf8"
    );
    const alignment = fs.readFileSync(
      path.join(__dirname, "..", "docs", "KANON_MIA_ALIGNMENT.md"),
      "utf8"
    );
    assert.match(studio, /Graphics Body \(12g–12u\)/);
    assert.match(studio, /test:graphics-body/);
    assert.match(alignment, /Graphics Body pipeline/);
    assert.match(alignment, /12a–13[cdefh]|12a–12u|12a–13/);
    assert.ok(runner.SUITES.includes("mia_graphics_studio_12u_contract.js"));
  });

  await test("body state phase 12p (runner meta)", () => {
    const runner = require("../scripts/run_graphics_body_tests");
    assert.equal(runner.SUITES.includes("mia_graphics_studio_12q_contract.js"), true);
  });

  await test("body state phase 12p legacy suite count", () => {
    const runner = require("../scripts/run_graphics_body_tests");
    assert.equal(typeof runner.runSuite, "function");
    assert.ok(runner.SUITES.length >= 10);
  });

  console.log("mia_graphics_studio_12p_contract: all passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
