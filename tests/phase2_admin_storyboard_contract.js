"use strict";

const assert = require("assert/strict");
const path = require("path");
const fs = require("fs");
const { registerAdminRoutes, TIER_COINS } = require("../routes/admin");
const {
  resolveStoryboard,
  buildStoryboardTimeline,
  listStoryboards,
  LION_BLOCKS,
  UNIVERSE_BLOCKS,
  GALAXY_BLOCKS,
  ROSE_BLOCKS
} = require("../shared/mia-gift-animation/storyboard");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

function assertPipeline(board, reactId) {
  assert.ok(board);
  assert.equal(board.blocks[0].id, "intro");
  assert.equal(board.blocks[1].id, "avatar");
  assert.equal(board.blocks[2].id, reactId);
  assert.equal(board.blocks[3].id, "koj");
  assert.equal(board.blocks[board.blocks.length - 1].id, "outro");
  assert.equal(board.blocks.length, 5);
}

test("admin html exists", () => {
  const p = path.join(__dirname, "..", "mia-output-overlay", "mia-admin.html");
  assert.ok(fs.existsSync(p));
});

test("registerAdminRoutes exposes /admin and test APIs", () => {
  const routes = { get: [], post: [] };
  const app = {
    get(p, ..._handlers) {
      routes.get.push(p);
    },
    post(p, ..._handlers) {
      routes.post.push(p);
    }
  };
  const result = registerAdminRoutes(app, {
    localAdminGuard: (_req, _res, next) => next && next(),
    processEvent: async () => ({ status: 200, body: { ok: true } }),
    buildHealthPayload: () => ({ ok: true })
  });
  assert.equal(result.ok, true);
  assert.ok(routes.get.includes("/admin"));
  assert.ok(routes.get.includes("/mia-admin"));
  assert.ok(routes.get.includes("/api/mia-admin/status"));
  assert.ok(routes.get.includes("/api/mia-admin/theme"));
  assert.ok(routes.get.includes("/api/mia-admin/action-queue"));
  assert.ok(routes.post.includes("/api/mia-admin/test/gift"));
  assert.ok(routes.post.includes("/api/mia-admin/test/bowl"));
  assert.ok(routes.post.includes("/api/mia-admin/theme"));
  assert.ok(routes.post.includes("/api/mia-admin/action-queue"));
  assert.ok(TIER_COINS.T4 >= TIER_COINS.T1);
});

test("Lion storyboard blocks intro→outro", () => {
  const board = resolveStoryboard("Lion");
  assert.equal(board.blocks.length, LION_BLOCKS.length);
  assertPipeline(board, "roar");
  const tl = buildStoryboardTimeline("LEV", { userLabel: "Fan", miaPoints: 750 });
  assert.ok(tl.totalMs > 0);
  const json = JSON.stringify(tl);
  assert.ok(!json.includes('"coins"'));
  assert.ok(json.includes("miaPoints"));
});

test("Universe storyboard blocks intro→outro", () => {
  const board = resolveStoryboard("Universe");
  assert.equal(board.blocks.length, UNIVERSE_BLOCKS.length);
  assertPipeline(board, "react");
  assert.equal(board.blocks[2].overlay.effect, "universe_surge");
  const tl = buildStoryboardTimeline("VESMIR", { userLabel: "Fan", miaPoints: 199 });
  assert.equal(tl.giftKey, "UNIVERSE");
  assert.ok(!JSON.stringify(tl).includes('"coins"'));
});

test("Galaxy storyboard blocks intro→outro", () => {
  const board = resolveStoryboard("Galaxy");
  assert.equal(board.blocks.length, GALAXY_BLOCKS.length);
  assertPipeline(board, "react");
  assert.equal(board.blocks[2].overlay.effect, "galaxy_burst");
  const tl = buildStoryboardTimeline("GALAXIE", { miaPoints: 500 });
  assert.equal(tl.giftKey, "GALAXY");
});

test("Rose storyboard blocks intro→outro", () => {
  const board = resolveStoryboard("Rose");
  assert.equal(board.blocks.length, ROSE_BLOCKS.length);
  assertPipeline(board, "react");
  assert.equal(board.blocks[2].overlay.effect, "rose_bloom");
  assert.ok(resolveStoryboard("RŮŽE"));
});

test("listStoryboards includes Lion Universe Galaxy Rose", () => {
  const keys = listStoryboards();
  for (const k of ["LION", "UNIVERSE", "GALAXY", "ROSE"]) {
    assert.ok(keys.includes(k), `missing ${k}`);
  }
});

console.log("phase2_admin_storyboard_contract: all passed");
