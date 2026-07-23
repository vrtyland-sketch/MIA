"use strict";

const assert = require("assert/strict");
const themeManager = require("../core/theme-manager");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

const prevEnv = process.env.MIA_THEME_MANAGER;

try {
  themeManager._resetForTests({ themeId: "cyber" });

  test("default OFF when env unset", () => {
    delete process.env.MIA_THEME_MANAGER;
    assert.equal(themeManager.isThemeManagerEnabled({}), false);
    const hint = themeManager.getOverlayThemeHint({});
    assert.equal(hint.enabled, false);
    assert.equal(hint.cssVars, null);
  });

  test("enable via MIA_THEME_MANAGER=1", () => {
    process.env.MIA_THEME_MANAGER = "1";
    assert.equal(themeManager.isThemeManagerEnabled({}), true);
    const hint = themeManager.getOverlayThemeHint({});
    assert.equal(hint.enabled, true);
    assert.ok(hint.cssVars["--accent"]);
  });

  test("setTheme switches cyber → purple_robot → arena", () => {
    process.env.MIA_THEME_MANAGER = "1";
    assert.equal(themeManager.setTheme("purple_robot").ok, true);
    assert.equal(themeManager.getActiveThemeId(), "purple_robot");
    assert.match(themeManager.getOverlayThemeHint({}).cssVars["--accent"], /#c77dff/i);

    assert.equal(themeManager.setTheme("arena").ok, true);
    assert.equal(themeManager.getActiveTheme().label, "Arena");
    assert.match(themeManager.getOverlayThemeHint({}).cssVars["--accent"], /#ff8a4c/i);

    assert.equal(themeManager.setTheme("cyber").ok, true);
    assert.equal(themeManager.getActiveThemeId(), "cyber");
  });

  test("unknown theme rejected", () => {
    const bad = themeManager.setTheme("neon_disco");
    assert.equal(bad.ok, false);
    assert.equal(bad.error, "unknown_theme");
  });

  test("public snapshot lists 3 themes", () => {
    const snap = themeManager.getThemeManagerPublicSnapshot({});
    assert.equal(snap.themes.length, 3);
    const ids = snap.themes.map((t) => t.id).sort();
    assert.deepEqual(ids, ["arena", "cyber", "purple_robot"]);
  });

  test("runtimeConfig postDod.themeManager.enabled", () => {
    delete process.env.MIA_THEME_MANAGER;
    assert.equal(
      themeManager.isThemeManagerEnabled({ postDod: { themeManager: { enabled: true } } }),
      true
    );
  });
} finally {
  if (prevEnv == null) delete process.env.MIA_THEME_MANAGER;
  else process.env.MIA_THEME_MANAGER = prevEnv;
  themeManager._resetForTests({ themeId: "cyber" });
}

console.log("theme_manager_contract: all passed");
