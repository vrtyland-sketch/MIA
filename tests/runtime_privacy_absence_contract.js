"use strict";

const assert = require("assert/strict");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const world = require("../scripts/MIA_KOJNOZROUT_WORLD_PERSISTENCE");
const arena = require("../scripts/MIA_PLATFORM_ARENA");
const sessionMemory = require("../scripts/MIA_SESSION_MEMORY");
const storyMemory = require("../scripts/MIA_STORY_MEMORY");
const viewerMemory = require("../core/viewer-memory");
const viewerInventory = require("../core/viewer-inventory");
const gifts = require("../shared/gifts/runtime");
const lexicon = require("../scripts/MIA_CHAT_LEXICON");
const kojPersistence = require("../scripts/MIA_KOJNOZROUT_PERSISTENCE");
const { createKojnozoutState } = require("../scripts/MIA_KOJNOZROUT_ENGINE");
const runtimeState = require("../core/runtime-state");
const { buildRuntimeStateSeedCtx } = require("../scripts/MIA_RUNTIME_STATE_SEED_CTX");
const actionQueue = require("../core/action-queue");
const themeManager = require("../core/theme-manager");

const ROOT = path.resolve(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-privacy-absence-"));

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

function park(filePath) {
  if (!fs.existsSync(filePath)) return { existed: false, backup: "" };
  const backup = path.join(dir, `${path.basename(filePath)}.parked`);
  fs.renameSync(filePath, backup);
  return { existed: true, backup };
}

function unpark(filePath, parked) {
  if (!parked.existed) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  fs.renameSync(parked.backup, filePath);
}

test("missing world state initializes and corrupt world stays a different failure", () => {
  const missing = world.loadWorldSeed(path.join(dir, "absent-world.json"));
  assert.equal(missing.ok, true);
  assert.equal(missing.reason, "missing");
  assert.equal(missing.backpack, null);
  assert.equal(missing.duel, null);

  const corruptPath = path.join(dir, "bad-world.json");
  fs.writeFileSync(corruptPath, "{");
  const corrupt = world.loadWorldSeed(corruptPath);
  assert.equal(corrupt.ok, false);
  assert.equal(corrupt.reason, "world_state_corrupt");
});

test("missing arena, session, story, viewer memory, and inventory use empty defaults", () => {
  const arenaState = arena.loadArenaState(path.join(dir, "absent-arena.json"));
  assert.equal(arenaState.version, 1);
  assert.equal(arenaState.duel.active, false);
  assert.deepEqual(arenaState.users, {});

  const session = sessionMemory.loadStore(path.join(dir, "absent-session.json"));
  assert.equal(session.version, 1);
  assert.deepEqual(session.users, {});
  assert.deepEqual(session.recentMessages, []);

  const story = storyMemory.loadStore(path.join(dir, "absent-story.json"));
  assert.equal(story.version, 1);
  assert.deepEqual(story.users, {});

  viewerMemory.configureViewerMemory({ path: path.join(dir, "absent-viewer-memory.json") });
  assert.deepEqual(viewerMemory.loadStore().viewers, {});
  const badViewer = path.join(dir, "bad-viewer-memory.json");
  fs.writeFileSync(badViewer, "{");
  viewerMemory.configureViewerMemory({ path: badViewer });
  assert.deepEqual(viewerMemory.loadStore().viewers, {});

  viewerInventory.configureViewerInventory({
    path: path.join(dir, "absent-viewer-inventory.json")
  });
  assert.deepEqual(viewerInventory.loadStore().inventories, {});
  const badInventory = path.join(dir, "bad-viewer-inventory.json");
  fs.writeFileSync(badInventory, "{");
  viewerInventory.configureViewerInventory({ path: badInventory });
  assert.deepEqual(viewerInventory.loadStore().inventories, {});
});

test("missing streamer identity does not lock a boss and does not throw", () => {
  const identityPath = path.join(ROOT, "data", "streamer-identity.json");
  const parked = park(identityPath);
  try {
    const resolved = require.resolve("../scripts/MIA_STREAMER_IDENTITY");
    delete require.cache[resolved];
    const identity = require("../scripts/MIA_STREAMER_IDENTITY");
    const missing = identity.getIdentitySnapshot({});
    assert.equal(missing.locked, false);
    assert.equal(missing.userId, null);

    fs.writeFileSync(identityPath, "{");
    delete require.cache[resolved];
    const reloaded = require("../scripts/MIA_STREAMER_IDENTITY");
    const corrupt = reloaded.getIdentitySnapshot({});
    assert.equal(corrupt.locked, false);
    assert.equal(corrupt.userId, null);
  } finally {
    const resolved = require.resolve("../scripts/MIA_STREAMER_IDENTITY");
    delete require.cache[resolved];
    unpark(identityPath, parked);
  }
});

test("missing gift-map stats initialize an empty community instead of crashing", () => {
  const statsPath = path.join(ROOT, "data", "gift-map-stats.json");
  const parked = park(statsPath);
  try {
    const fresh = gifts.createRuntime({ persist: true });
    const stats = fresh.getStats();
    assert.equal(stats.community.totalGifts, 0);
    assert.deepEqual(stats.viewers, {});

    fs.writeFileSync(statsPath, "{");
    const corrupt = gifts.createRuntime({ persist: true });
    assert.equal(corrupt.getStats().community.totalGifts, 0);
  } finally {
    unpark(statsPath, parked);
  }
});

test("missing chat lexicon is an empty store and does not write a file", () => {
  const lexiconPath = path.join(ROOT, "data", "mia-chat-lexicon.json");
  const parked = park(lexiconPath);
  try {
    const missing = lexicon.loadStoreFromDisk(lexiconPath);
    assert.equal(missing.stats.messagesSeen, 0);
    assert.deepEqual(missing.users, {});
    assert.deepEqual(missing.recentSamples, []);
    assert.equal(fs.existsSync(lexiconPath), false);

    const corruptPath = path.join(dir, "bad-lexicon.json");
    fs.writeFileSync(corruptPath, "{");
    const corrupt = lexicon.loadStoreFromDisk(corruptPath);
    assert.equal(corrupt.stats.messagesSeen, 0);
    assert.deepEqual(corrupt.users, {});
    assert.deepEqual(corrupt.recentSamples, []);
  } finally {
    unpark(lexiconPath, parked);
  }
});

test("missing Koj state and runtime state boot from defaults", () => {
  const kojPath = path.join(ROOT, "data", "kojnozout-state.json");
  const kojBak = `${kojPath}.bak`;
  const runtimePath = path.join(ROOT, "data", "runtime-state.json");
  const parkedKoj = park(kojPath);
  const parkedBak = park(kojBak);
  const parkedRuntime = park(runtimePath);
  try {
    const seed = kojPersistence.loadPersistedSeed(kojPath);
    assert.deepEqual(seed, {});
    const booted = createKojnozoutState(seed);
    assert.equal(booted.hunger, 68);
    assert.equal(booted.energy, 58);
    assert.equal(booted.bowlPercent, 0);
    assert.equal(booted.mood, "idle");
    assert.equal(fs.existsSync(kojPath), false);
    assert.equal(fs.existsSync(kojBak), false);

    fs.writeFileSync(kojPath, "{");
    assert.deepEqual(kojPersistence.loadPersistedSeed(kojPath), {});
    fs.unlinkSync(kojPath);

    assert.equal(runtimeState.loadRuntimeState(runtimePath), null);
    const ctx = buildRuntimeStateSeedCtx({
      modules: {
        kojnozoutWorldPersistenceModule: {
          loadWorldSeed: () => ({ backpack: null, duel: null, ok: true, reason: "missing" })
        },
        kojnozoutPersistenceModule: {
          loadPersistedSeed: () => ({})
        }
      }
    });
    assert.deepEqual(ctx.kojnozoutPersistedSeed, {});
    assert.equal(createKojnozoutState(ctx.kojnozoutPersistedSeed).hunger, 68);
    assert.equal(fs.existsSync(runtimePath), false);
  } finally {
    if (fs.existsSync(kojPath)) fs.unlinkSync(kojPath);
    unpark(kojPath, parkedKoj);
    unpark(kojBak, parkedBak);
    unpark(runtimePath, parkedRuntime);
  }
});

test("missing action queue and theme use defaults and do not create files", () => {
  const queuePath = path.join(ROOT, "data", "mia-action-queue.json");
  const themePath = path.join(ROOT, "data", "mia-theme.json");
  const parkedQueue = park(queuePath);
  const parkedTheme = park(themePath);
  const previousQueue = process.env.MIA_ACTION_QUEUE;
  delete process.env.MIA_ACTION_QUEUE;
  try {
    delete require.cache[require.resolve("../core/action-queue")];
    const freshQueue = require("../core/action-queue");
    assert.equal(freshQueue.isActionQueueEnabled({}), false);
    assert.equal(fs.existsSync(queuePath), false);

    themeManager._resetForTests();
    assert.equal(themeManager.getActiveThemeId(), themeManager.DEFAULT_THEME_ID);
    assert.equal(themeManager.getActiveThemeId(), "cyber");
    assert.equal(fs.existsSync(themePath), false);
  } finally {
    if (previousQueue === undefined) delete process.env.MIA_ACTION_QUEUE;
    else process.env.MIA_ACTION_QUEUE = previousQueue;
    delete require.cache[require.resolve("../core/action-queue")];
    themeManager._resetForTests();
    unpark(queuePath, parkedQueue);
    unpark(themePath, parkedTheme);
  }
});

test("runtime stores are ignored and sanitized examples stay visible to git", () => {
  const ignored = execFileSync(
    "git",
    [
      "check-ignore",
      "data/avatar-cache/example.bin",
      "data/streamer-identity.json",
      "data/mia-session-memory.json",
      "data/viewer-memory.json",
      "data/viewer-inventory.json",
      "data/platform-arena.json",
      "data/story-memory.json",
      "data/gift-map-stats.json",
      "data/kojnozout-world.json",
      "tests/.tmp-session-memory-test.json",
      "data/mia-chat-lexicon.json",
      "data/runtime-state.json",
      "data/kojnozout-state.json",
      "data/kojnozout-state.json.bak",
      "data/mia-action-queue.json",
      "data/mia-theme.json"
    ],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(ignored.trim().split("\n").length, 16);

  for (const example of [
    "data/streamer-identity.example.json",
    "data/mia-session-memory.example.json",
    "data/viewer-memory.example.json",
    "data/viewer-inventory.example.json",
    "data/platform-arena.example.json",
    "data/story-memory.example.json",
    "data/gift-map-stats.example.json",
    "data/kojnozout-world.example.json",
    "tests/fixtures/session-memory.example.json",
    "data/mia-chat-lexicon.example.json",
    "data/runtime-state.example.json",
    "data/kojnozout-state.example.json",
    "data/mia-action-queue.example.json",
    "data/mia-theme.example.json"
  ]) {
    const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, example), "utf8"));
    assert.equal(typeof parsed, "object");
    let notIgnored = false;
    try {
      execFileSync("git", ["check-ignore", "-q", example], { cwd: ROOT });
    } catch (err) {
      notIgnored = err.status === 1;
    }
    assert.equal(notIgnored, true, `${example} must stay tracked`);
  }
});

if (process.exitCode) process.exit(process.exitCode);
console.log("runtime_privacy_absence_contract: all passed");
