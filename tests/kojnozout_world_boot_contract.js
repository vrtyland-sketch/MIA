"use strict";

const assert = require("assert/strict");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const world = require("../scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE");

const ROOT = path.resolve(__dirname, "..");

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

function makeDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mia-world-boot-"));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function bootInFreshProcess(filePath) {
  const script = `
    const world = require(${JSON.stringify(require.resolve("../scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE"))});
    const { bootPersistedWorld } = require(${JSON.stringify(require.resolve("../scripts/MIA_RUNTIME_STATE_SEED_CTX"))});
    const backpack = require(${JSON.stringify(require.resolve("../scripts/MIA_KOJNOZROUT_BACKPACK"))});
    const duel = require(${JSON.stringify(require.resolve("../scripts/MIA_KOJNOZROUT_DUEL"))});
    const seed = world.loadWorldSeed(process.env.MIA_WORLD_FILE);
    const booted = bootPersistedWorld(seed, {
      kojnozoutBackpackModule: backpack,
      kojnozoutDuelModule: duel
    });
    process.stdout.write(JSON.stringify({
      seedOk: seed.ok,
      seedReason: seed.reason,
      seedError: seed.error,
      seedRecovered: seed.recovered,
      ok: booted.ok,
      degraded: booted.degraded,
      worldEnabled: booted.worldEnabled,
      recovered: booted.recovered,
      reason: booted.reason,
      error: booted.error || null,
      backpack: booted.backpack,
      duel: booted.duel
    }));
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    encoding: "utf8",
    env: { ...process.env, MIA_WORLD_FILE: filePath }
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `boot restart exited ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

test("index.js boots the world through bootPersistedWorld", () => {
  const indexSrc = fs.readFileSync(path.join(ROOT, "index.js"), "utf8");
  assert.match(indexSrc, /bootPersistedWorld\(ctx\.worldSeed/);
  assert.match(indexSrc, /worldBoot\.worldEnabled === false/);
  assert.match(indexSrc, /Backpack and duel were not initialized/);
  assert.doesNotMatch(indexSrc, /worldSeed\?\.backpack\s*\|\|/);
  assert.doesNotMatch(indexSrc, /worldSeed\?\.duel\s*\|\|/);
});

test("missing world file boots an empty backpack and duel", () => {
  const dir = makeDir();
  const filePath = path.join(dir, "kojnozout-world.json");
  try {
    const booted = bootInFreshProcess(filePath);
    assert.equal(booted.seedOk, true);
    assert.equal(booted.seedReason, "missing");
    assert.equal(booted.ok, true);
    assert.equal(booted.degraded, false);
    assert.equal(booted.worldEnabled, true);
    assert.equal(booted.recovered, false);
    assert.equal(booted.reason, "missing");
    assert.equal(booted.error, null);
    assert.deepEqual(booted.backpack.users, {});
    assert.equal(booted.backpack.totalItems, 0);
    assert.equal(booted.duel.active, false);
    assert.equal(booted.duel.phase, "idle");
  } finally {
    cleanup(dir);
  }
});

test("corrupt primary with a valid backup restores that backup", () => {
  const dir = makeDir();
  const filePath = path.join(dir, "kojnozout-world.json");
  try {
    assert.equal(world.flushSaveWorld({
      backpack: {
        users: {
          tester: {
            userLabel: "Tester",
            items: [{ id: "rose", qty: 3 }]
          }
        },
        totalItems: 3
      },
      duel: {
        active: true,
        phase: "active",
        localSide: { label: "Náš Kojnožrout", streamId: "local", miaPoints: 40 }
      }
    }, filePath), true);
    fs.writeFileSync(filePath, "{truncated", "utf8");
    const booted = bootInFreshProcess(filePath);
    assert.equal(booted.seedOk, true);
    assert.equal(booted.seedRecovered, true);
    assert.equal(booted.ok, true);
    assert.equal(booted.degraded, false);
    assert.equal(booted.worldEnabled, true);
    assert.equal(booted.recovered, true);
    assert.equal(booted.reason, "recovered_from_backup");
    assert.equal(booted.backpack.totalItems, 3);
    assert.equal(booted.backpack.users.tester.items[0].id, "rose");
    assert.equal(booted.backpack.users.tester.items[0].qty, 3);
    assert.equal(booted.duel.active, true);
    assert.equal(booted.duel.phase, "active");
    assert.equal(booted.duel.localSide.miaPoints, 40);
  } finally {
    cleanup(dir);
  }
});

test("corrupt primary without a backup does not boot an empty world", () => {
  const dir = makeDir();
  const filePath = path.join(dir, "kojnozout-world.json");
  try {
    fs.writeFileSync(filePath, "{truncated", "utf8");
    const booted = bootInFreshProcess(filePath);
    assert.equal(booted.seedOk, false);
    assert.equal(booted.seedReason, "world_state_corrupt");
    assert.equal(booted.seedError, "world_state_malformed");
    assert.equal(booted.ok, false);
    assert.equal(booted.degraded, true);
    assert.equal(booted.worldEnabled, false);
    assert.equal(booted.recovered, false);
    assert.equal(booted.reason, "world_state_corrupt");
    assert.equal(booted.error, "world_state_malformed");
    assert.equal(booted.backpack, null);
    assert.equal(booted.duel, null);
  } finally {
    cleanup(dir);
  }
});

if (process.exitCode) process.exit(process.exitCode);
console.log("");
console.log("---- KOJNOZROUT WORLD BOOT CONTRACT ----");
console.log("passed");
