"use strict";

const assert = require("assert/strict");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  applySupportToKojnozout,
  createKojnozoutState
} = require("../scripts/MIA_KOJNOZROUT_ENGINE");
const koj = require("../scripts/MIA_KOJNOZROUT_PERSISTENCE");
const world = require("../scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

function makeDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mia-koj-persist-"));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function freshLoad(modulePath, exportName, filePath) {
  const script = `
    const mod = require(${JSON.stringify(modulePath)});
    process.stdout.write(JSON.stringify(mod.${exportName}(process.env.MIA_PERSIST_FILE)));
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    encoding: "utf8",
    env: { ...process.env, MIA_PERSIST_FILE: filePath }
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `fresh load exited ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

function countPrimaryRenames(filePath, fn) {
  const realRename = fs.renameSync;
  let primaryRenames = 0;
  fs.renameSync = function renameSync(from, to) {
    if (path.resolve(String(to)) === path.resolve(filePath)) primaryRenames += 1;
    return realRename.call(fs, from, to);
  };
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      fs.renameSync = realRename;
    })
    .then(() => primaryRenames);
}

async function run() {
  await test("two gifts inside the debounce window persist the last bowl", async () => {
    const dir = makeDir();
    const filePath = path.join(dir, "kojnozout-state.json");
    try {
      koj.loadPersistedSeed(filePath);
      const base = createKojnozoutState({ bowlPercent: 0, feedPoints: 0 });
      const first = applySupportToKojnozout(base, {
        miaPoints: 20,
        coins: 1,
        giftName: "Rose"
      });
      const second = applySupportToKojnozout(first.state, {
        miaPoints: 80,
        coins: 5,
        giftName: "Lion"
      });
      assert.equal(first.state.bowlPercent, 0.2);
      assert.equal(second.state.bowlPercent, 1);
      assert.equal(first.state.feedPoints, 20);
      assert.equal(second.state.feedPoints, 100);
      assert.equal(first.state.totalFeedEvents, 1);
      assert.equal(second.state.totalFeedEvents, 2);
      koj.scheduleSaveKojnozoutState(first.state);
      koj.scheduleSaveKojnozoutState(second.state);
      await sleep(koj.SAVE_DEBOUNCE_MS + 400);
      const loaded = freshLoad(
        require.resolve("../scripts/MIA_KOJNOZROUT_PERSISTENCE"),
        "loadPersistedSeed",
        filePath
      );
      assert.equal(loaded.bowlPercent, 1);
      assert.equal(loaded.feedPoints, 100);
      assert.equal(loaded.totalFeedEvents, 2);
      assert.notEqual(loaded.bowlPercent, first.state.bowlPercent);
    } finally {
      cleanup(dir);
    }
  });

  await test("rapid state replacements persist only the newest snapshot", async () => {
    const dir = makeDir();
    const filePath = path.join(dir, "kojnozout-state.json");
    try {
      koj.loadPersistedSeed(filePath);
      const newest = { bowlPercent: 3, feedPoints: 30, totalFeedEvents: 3 };
      const scheduledAt = Date.now();
      const primaryRenames = await countPrimaryRenames(filePath, async () => {
        koj.scheduleSaveKojnozoutState({ bowlPercent: 1, feedPoints: 10, totalFeedEvents: 1 });
        koj.scheduleSaveKojnozoutState({ bowlPercent: 2, feedPoints: 20, totalFeedEvents: 2 });
        koj.scheduleSaveKojnozoutState(newest);
        newest.bowlPercent = 0;
        newest.feedPoints = 0;
        newest.totalFeedEvents = 0;
        await sleep(koj.SAVE_DEBOUNCE_MS + 400);
      });
      assert.equal(primaryRenames, 1);
      const saved = readJson(filePath);
      assert.equal(saved.bowlPercent, 3);
      assert.equal(saved.feedPoints, 30);
      assert.equal(saved.totalFeedEvents, 3);
      assert.ok(saved.updatedAt <= scheduledAt + 50);
      assert.ok(Date.now() - saved.updatedAt >= 2000);
    } finally {
      cleanup(dir);
    }
  });

  await test("rapid world replacements persist only the newest snapshot", async () => {
    const dir = makeDir();
    const filePath = path.join(dir, "kojnozout-world.json");
    try {
      const newest = { backpack: { id: "C", items: ["last"] }, duel: { active: true, score: 3 } };
      const primaryRenames = await countPrimaryRenames(filePath, async () => {
        world.scheduleSaveWorld({ backpack: { id: "A" }, duel: { active: false } }, filePath);
        world.scheduleSaveWorld({ backpack: { id: "B" }, duel: { active: false } }, filePath);
        world.scheduleSaveWorld(newest, filePath);
        newest.backpack.id = "mutated";
        await sleep(world.SAVE_DEBOUNCE_MS + 400);
      });
      assert.equal(primaryRenames, 1);
      const saved = readJson(filePath);
      assert.equal(saved.backpack.id, "C");
      assert.equal(saved.duel.score, 3);
    } finally {
      cleanup(dir);
    }
  });

  await test("newer koj state arriving during a write is persisted afterward", async () => {
    const dir = makeDir();
    const filePath = path.join(dir, "kojnozout-state.json");
    const realRename = fs.renameSync;
    let primaryRenames = 0;
    let secondRenameAt = 0;
    fs.renameSync = function renameSync(from, to) {
      if (path.resolve(String(to)) === path.resolve(filePath)) {
        primaryRenames += 1;
        if (primaryRenames === 1) {
          koj.scheduleSaveKojnozoutState({
            bowlPercent: 9,
            feedPoints: 900,
            totalFeedEvents: 9
          });
          const start = Date.now();
          while (Date.now() - start < 40) {
            // Keep the first write in progress while the newer snapshot is queued.
          }
        } else {
          secondRenameAt = Date.now();
        }
      }
      return realRename.call(fs, from, to);
    };
    try {
      koj.loadPersistedSeed(filePath);
      const wrote = koj.flushSaveKojnozoutState({
        bowlPercent: 1,
        feedPoints: 10,
        totalFeedEvents: 1
      });
      assert.equal(wrote, true);
      await sleep(80);
      const saved = readJson(filePath);
      assert.equal(saved.feedPoints, 900);
      assert.equal(saved.bowlPercent, 9);
      assert.equal(saved.totalFeedEvents, 9);
      assert.ok(primaryRenames >= 2);
      assert.ok(secondRenameAt - saved.updatedAt >= 25);
    } finally {
      fs.renameSync = realRename;
      cleanup(dir);
    }
  });

  await test("a truncated koj write never replaces the final file", async () => {
    const dir = makeDir();
    const filePath = path.join(dir, "kojnozout-state.json");
    const realWriteSync = fs.writeSync;
    let tripped = false;
    try {
      koj.loadPersistedSeed(filePath);
      assert.equal(
        koj.flushSaveKojnozoutState({
          bowlPercent: 11,
          feedPoints: 111,
          totalFeedEvents: 4
        }),
        true
      );
      const before = fs.readFileSync(filePath, "utf8");
      assert.equal(readJson(filePath).feedPoints, 111);
      fs.writeSync = function writeSync(fd, data, offset, length, position) {
        if (!tripped && Buffer.isBuffer(data) && data.toString("utf8").includes('"feedPoints": 777')) {
          tripped = true;
          realWriteSync.call(fs, fd, data, 0, Math.min(8, data.length), 0);
          throw new Error("truncated write");
        }
        return realWriteSync.call(fs, fd, data, offset, length, position);
      };
      const wrote = koj.flushSaveKojnozoutState({
        bowlPercent: 77,
        feedPoints: 777,
        totalFeedEvents: 8
      });
      assert.equal(wrote, false);
      assert.equal(tripped, true);
      assert.equal(fs.readFileSync(filePath, "utf8"), before);
      assert.equal(readJson(filePath).feedPoints, 111);
      const leftovers = fs.readdirSync(dir).filter((name) => name.includes(".tmp"));
      assert.deepEqual(leftovers, []);
    } finally {
      fs.writeSync = realWriteSync;
      cleanup(dir);
    }
  });

  await test("a short write is finished before the koj file is published", async () => {
    const dir = makeDir();
    const filePath = path.join(dir, "kojnozout-state.json");
    const realWriteSync = fs.writeSync;
    let shorts = 0;
    fs.writeSync = function writeSync(fd, data, offset, length, position) {
      if (Buffer.isBuffer(data) && shorts < 1 && data.toString("utf8").includes('"feedPoints": 42')) {
        shorts += 1;
        const n = Math.min(8, length);
        return realWriteSync.call(fs, fd, data, offset, n, position);
      }
      return realWriteSync.call(fs, fd, data, offset, length, position);
    };
    try {
      koj.loadPersistedSeed(filePath);
      assert.equal(
        koj.flushSaveKojnozoutState({ bowlPercent: 4, feedPoints: 42, totalFeedEvents: 2 }),
        true
      );
      assert.equal(shorts, 1);
      const raw = fs.readFileSync(filePath, "utf8");
      assert.equal(readJson(filePath).feedPoints, 42);
      assert.equal(readJson(filePath).bowlPercent, 4);
      assert.ok(raw.trim().endsWith("}"));
      assert.ok(!raw.startsWith("{truncated"));
    } finally {
      fs.writeSync = realWriteSync;
      cleanup(dir);
    }
  });

  await test("truncated world JSON recovers inventory instead of zeroing it", async () => {
    const dir = makeDir();
    const filePath = path.join(dir, "kojnozout-world.json");
    const warnings = [];
    const realWarn = console.warn;
    console.warn = (...args) => {
      warnings.push(args.join(" "));
    };
    try {
      assert.equal(
        world.flushSaveWorld({
          backpack: { items: [{ id: "rose", qty: 3 }] },
          duel: { active: true, score: 12 }
        }, filePath),
        true
      );
      fs.writeFileSync(filePath, "{truncated", "utf8");
      const recovered = world.loadWorldSeed(filePath);
      assert.equal(recovered.ok, true);
      assert.equal(recovered.recovered, true);
      assert.equal(recovered.reason, "recovered_from_backup");
      assert.equal(recovered.error, "world_state_malformed");
      assert.equal(recovered.backpack.items[0].id, "rose");
      assert.equal(recovered.backpack.items[0].qty, 3);
      assert.equal(recovered.duel.active, true);
      assert.equal(recovered.duel.score, 12);
      assert.match(warnings.join("\n"), /recovered inventory and duel/);
    } finally {
      console.warn = realWarn;
      cleanup(dir);
    }
  });

  await test("truncated world JSON without a backup reports corruption", async () => {
    const dir = makeDir();
    const filePath = path.join(dir, "kojnozout-world.json");
    const errors = [];
    const realError = console.error;
    console.error = (...args) => {
      errors.push(args.join(" "));
    };
    try {
      fs.writeFileSync(filePath, "{truncated", "utf8");
      const loaded = world.loadWorldSeed(filePath);
      assert.equal(loaded.ok, false);
      assert.equal(loaded.reason, "world_state_corrupt");
      assert.equal(loaded.error, "world_state_malformed");
      assert.equal(loaded.recovered, false);
      assert.notEqual(loaded.reason, "missing");
      assert.match(errors.join("\n"), /not recovered/);
      const missing = world.loadWorldSeed(path.join(dir, "absent-world.json"));
      assert.equal(missing.ok, true);
      assert.equal(missing.reason, "missing");
      assert.equal(missing.backpack, null);
      assert.equal(missing.duel, null);
      assert.equal(missing.error, undefined);
    } finally {
      console.error = realError;
      cleanup(dir);
    }
  });

  await test("valid existing koj and world files still load", async () => {
    const dir = makeDir();
    const kojFile = path.join(dir, "kojnozout-state.json");
    const worldFile = path.join(dir, "kojnozout-world.json");
    try {
      fs.writeFileSync(kojFile, `${JSON.stringify({
        version: 1,
        updatedAt: 1700000000000,
        feedPoints: 133,
        bowlPercent: 42,
        evolutionTier: "hatchling"
      }, null, 2)}\n`, "utf8");
      fs.writeFileSync(worldFile, `${JSON.stringify({
        version: 1,
        updatedAt: 1700000000000,
        backpack: { items: [{ id: "kept", qty: 2 }] },
        duel: { active: false, round: 4 }
      }, null, 2)}\n`, "utf8");
      const loadedKoj = koj.loadPersistedSeed(kojFile);
      assert.equal(loadedKoj.feedPoints, 133);
      assert.equal(loadedKoj.bowlPercent, 42);
      assert.equal(loadedKoj.evolutionTier, "hatchling");
      assert.equal(loadedKoj.updatedAt, undefined);
      const loadedWorld = world.loadWorldSeed(worldFile);
      assert.equal(loadedWorld.ok, true);
      assert.equal(loadedWorld.reason, "primary");
      assert.equal(loadedWorld.recovered, false);
      assert.equal(loadedWorld.error, undefined);
      assert.equal(loadedWorld.backpack.items[0].id, "kept");
      assert.equal(loadedWorld.backpack.items[0].qty, 2);
      assert.equal(loadedWorld.duel.round, 4);
      assert.equal(loadedWorld.duel.active, false);
    } finally {
      cleanup(dir);
    }
  });

  await test("restart chooses the logically newest valid koj and world state", async () => {
    const dir = makeDir();
    const kojFile = path.join(dir, "kojnozout-state.json");
    const worldFile = path.join(dir, "kojnozout-world.json");
    try {
      koj.loadPersistedSeed(kojFile);
      assert.equal(
        koj.flushSaveKojnozoutState({
          bowlPercent: 80,
          feedPoints: 500,
          totalFeedEvents: 7
        }),
        true
      );
      assert.equal(
        world.flushSaveWorld({
          backpack: { items: [{ id: "newer", qty: 4 }] },
          duel: { active: true, score: 9 }
        }, worldFile),
        true
      );
      const newerKoj = readJson(kojFile);
      const newerWorld = readJson(worldFile);
      fs.writeFileSync(kojFile, `${JSON.stringify({
        version: 1,
        updatedAt: 1,
        bowlPercent: 2,
        feedPoints: 2,
        totalFeedEvents: 1
      }, null, 2)}\n`, "utf8");
      fs.writeFileSync(worldFile, `${JSON.stringify({
        version: 1,
        updatedAt: 1,
        backpack: { items: [{ id: "older", qty: 1 }] },
        duel: { active: false, score: 1 }
      }, null, 2)}\n`, "utf8");
      assert.ok(fs.statSync(kojFile).mtimeMs >= fs.statSync(`${kojFile}.bak`).mtimeMs);
      assert.ok(fs.statSync(worldFile).mtimeMs >= fs.statSync(`${worldFile}.bak`).mtimeMs);
      assert.ok(newerKoj.updatedAt > 1);
      assert.ok(newerWorld.updatedAt > 1);
      const loadedKoj = freshLoad(
        require.resolve("../scripts/MIA_KOJNOZROUT_PERSISTENCE"),
        "loadPersistedSeed",
        kojFile
      );
      const loadedWorld = freshLoad(
        require.resolve("../scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE"),
        "loadWorldSeed",
        worldFile
      );
      assert.equal(loadedKoj.bowlPercent, 80);
      assert.equal(loadedKoj.feedPoints, 500);
      assert.equal(loadedKoj.totalFeedEvents, 7);
      assert.equal(loadedWorld.ok, true);
      assert.equal(loadedWorld.recovered, true);
      assert.equal(loadedWorld.reason, "newest_backup");
      assert.equal(loadedWorld.error, undefined);
      assert.equal(loadedWorld.backpack.items[0].id, "newer");
      assert.equal(loadedWorld.backpack.items[0].qty, 4);
      assert.equal(loadedWorld.duel.active, true);
      assert.equal(loadedWorld.duel.score, 9);
    } finally {
      cleanup(dir);
    }
  });

  if (process.exitCode) process.exit(process.exitCode);
  console.log("");
  console.log("---- KOJNOZROUT PERSISTENCE CONTRACT ----");
  console.log("passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
