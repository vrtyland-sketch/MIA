"use strict";

const assert = require("assert/strict");
const {
  createObsOverlayRenderer
} = require("../renderers/obs_overlay_render");

const results = {
  passed: 0,
  failed: 0
};

async function test(name, fn) {
  try {
    await fn();
    results.passed += 1;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed += 1;
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

(async () => {
  await test("renderer rejects invalid overlay payload", async () => {
    const renderer = createObsOverlayRenderer({
      runtimeConfig: {}
    });

    const result = await renderer.render(null, {});

    assert.equal(result.emitted, false);
    assert.equal(result.reason, "invalid_overlay_payload");
  });

  await test("renderer does not require safeObsCall in Variant A", async () => {
    const renderer = createObsOverlayRenderer({
      runtimeConfig: {}
    });

    const result = await renderer.render({
      owner: "mia",
      route: "community",
      stage: "community"
    });

    assert.equal(result.emitted, false);
    assert.equal(result.reason, "scene_switch_disabled_variant_A");
    assert.equal(result.owner, "mia");
    assert.equal(result.route, "community");
    assert.equal(result.suggestedSceneMode, "community");
    assert.equal(result.obsAction, null);
  });

  await test("renderer returns support suggestedSceneMode from route fallback", async () => {
    const renderer = createObsOverlayRenderer({
      runtimeConfig: {}
    });

    const result = await renderer.render({
      owner: "kojnozout",
      route: "support",
      stage: "support"
    });

    assert.equal(result.emitted, false);
    assert.equal(result.reason, "scene_switch_disabled_variant_A");
    assert.equal(result.owner, "kojnozout");
    assert.equal(result.route, "support");
    assert.equal(result.suggestedSceneMode, "support");
    assert.equal(result.obsAction, null);
  });

  await test("renderer returns share suggestedSceneMode by stage fallback", async () => {
    const renderer = createObsOverlayRenderer({
      runtimeConfig: {}
    });

    const result = await renderer.render(
      {
        owner: "mia",
        stage: "share"
      },
      {
        normalizedEvent: {
          route: "share"
        }
      }
    );

    assert.equal(result.emitted, false);
    assert.equal(result.reason, "scene_switch_disabled_variant_A");
    assert.equal(result.owner, "mia");
    assert.equal(result.route, "share");
    assert.equal(result.suggestedSceneMode, "share");
    assert.equal(result.obsAction, null);
  });

  await test("renderer reads sceneMode from meta intent without switching scene", async () => {
    const renderer = createObsOverlayRenderer({
      runtimeConfig: {}
    });

    const result = await renderer.render({
      owner: "mia",
      route: "community",
      meta: {
        intent: "switch_scene",
        sceneMode: "battle"
      }
    });

    assert.equal(result.emitted, false);
    assert.equal(result.reason, "scene_switch_disabled_variant_A");
    assert.equal(result.intent, "switch_scene");
    assert.equal(result.sceneMode, "battle");
    assert.equal(result.suggestedSceneMode, "battle");
    assert.equal(result.obsAction, null);
  });

  await test("renderer resolves route from normalizedEvent fallback", async () => {
    const renderer = createObsOverlayRenderer({
      runtimeConfig: {}
    });

    const result = await renderer.render(
      {
        owner: "mia"
      },
      {
        normalizedEvent: {
          route: "support"
        }
      }
    );

    assert.equal(result.emitted, false);
    assert.equal(result.reason, "scene_switch_disabled_variant_A");
    assert.equal(result.route, "support");
    assert.equal(result.suggestedSceneMode, "support");
  });

  await test("renderer defaults owner to mia", async () => {
    const renderer = createObsOverlayRenderer({
      runtimeConfig: {}
    });

    const result = await renderer.render({
      route: "community"
    });

    assert.equal(result.emitted, false);
    assert.equal(result.owner, "mia");
    assert.equal(result.route, "community");
    assert.equal(result.suggestedSceneMode, "community");
  });

  console.log("");
  console.log("---- OBS OVERLAY RENDER SMOKE SUMMARY ----");
  console.log(`passed: ${results.passed}`);
  console.log(`failed: ${results.failed}`);

  if (results.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
})().catch((err) => {
  console.error("❌ obs overlay render smoke runner crashed");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});