"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "docs", "master-canon");
const timer = require("../shared/mia-timer-core");
const architecture = require("../shared/mia-architecture-core");

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function pass(label) {
  console.log(`✅ ${label}`);
}

function run() {
  const docPath = path.join(MASTER, "0060-timer-engine.md");
  const alignPath = path.join(MASTER, "0060-alignment.md");

  assert.ok(fs.existsSync(docPath), "0060-timer-engine.md exists");
  assert.ok(fs.existsSync(alignPath), "0060-alignment.md exists");
  pass("0060 files on disk");

  const doc = fs.readFileSync(docPath, "utf8");
  for (let i = 1; i <= 21; i += 1) {
    assert.ok(doc.includes(`## ${i}.`), `0060 section ${i}`);
  }
  assert.ok(doc.includes("Kernel Layer 0"), "0060 kernel layer");
  assert.ok(doc.includes("0059"), "0060 links to 0059");
  assert.ok(doc.includes("0061"), "0060 points to 0061");
  assert.ok(doc.includes("setTimeout"), "0060 forbids setTimeout");
  pass("0060 structure (21 sections)");

  assert.equal(timer.TE_COMPONENT_ORDER.length, 12);
  pass("timer engine components");

  assert.equal(timer.TE_TIMER_TYPE.ONE_SHOT, "one_shot");
  assert.equal(timer.TE_TIMER_TYPE.REPEATING, "repeating");
  assert.equal(timer.TE_TIMER_TYPE.SCHEDULED, "scheduled");
  assert.equal(timer.TE_TIMER_TYPE.DELAYED, "delayed");
  pass("timer types");

  assert.equal(timer.TE_CLOCK.KIND, "monotonic");
  assert.equal(timer.TE_CLOCK.USES_WALL_CLOCK_FOR_INTERVALS, false);
  pass("monotonic clock");

  assert.equal(timer.TE_PUBLIC_API.length, 11);
  pass("public timer api");

  assert.equal(timer.assertDirectTimerForbidden("setTimeout").ok, false);
  assert.equal(timer.assertDirectTimerForbidden("setInterval").ok, false);
  assert.equal(timer.assertDirectTimerForbidden("timer_engine").ok, true);
  pass("direct timer api forbidden");

  assert.equal(timer.toMilliseconds(2, timer.TE_INTERVAL_UNIT.SECONDS).ms, 2000);
  assert.equal(timer.toMilliseconds(1, timer.TE_INTERVAL_UNIT.MINUTES).ms, 60_000);
  pass("interval units");

  const tasks = [];
  const eng = timer.createTimerEngine({
    taskScheduler: {
      submit(task) {
        tasks.push(task);
        return { ok: true, taskId: task.taskId };
      }
    }
  });
  assert.equal(eng.status().singleton, true);
  assert.equal(eng.status().soleTimeAuthority, true);
  assert.equal(eng.status().executesTasksDirectly, false);
  pass("sole timer authority");

  const sync = eng.syncTime();
  assert.ok(sync.modules.includes("battle"));
  assert.ok(sync.modules.includes("obs"));
  assert.ok(sync.modules.includes("ai"));
  pass("unified time source");

  const dup = eng.create({
    timerId: "tmr-watchdog",
    owner: "x",
    type: timer.TE_TIMER_TYPE.ONE_SHOT,
    interval: 10
  });
  assert.equal(dup.ok, false);
  pass("unique timer id");

  const one = eng.create({
    timerId: "tmr-notify",
    owner: "overlay",
    type: timer.TE_TIMER_TYPE.ONE_SHOT,
    interval: 100,
    priority: timer.TE_PRIORITY.LOW
  });
  assert.equal(one.ok, true);
  assert.equal(one.executesDirectly, false);

  eng.advance(100);
  const tick1 = eng.tick();
  assert.ok(tick1.createdTasks.length >= 1);
  assert.equal(tick1.executesDirectly, false);
  assert.ok(tasks.some((t) => t.sourceTimerId === "tmr-notify"));
  assert.equal(eng.getTimer("tmr-notify").status, timer.TE_STATE.COMPLETED);
  pass("one-shot hands off to task scheduler");

  // repeating
  const rep = eng.create({
    timerId: "tmr-pulse",
    owner: "monitoring",
    type: timer.TE_TIMER_TYPE.REPEATING,
    interval: 50,
    maxRepeats: 3,
    repeatMode: timer.TE_REPEAT_MODE.FIXED_COUNT
  });
  assert.equal(rep.ok, true);
  eng.advance(50);
  eng.tick();
  eng.advance(50);
  eng.tick();
  eng.advance(50);
  eng.tick();
  assert.equal(eng.getTimer("tmr-pulse").status, timer.TE_STATE.COMPLETED);
  assert.equal(eng.getTimer("tmr-pulse").repeatCount, 3);
  pass("repeating fixed count");

  // scheduled
  const clock = timer.createMonotonicClock({ origin: 1000 });
  const sch = timer.createTimerEngine({
    seedDefaults: false,
    clock,
    taskScheduler: { submit: (t) => ({ ok: true, taskId: t.taskId }) }
  });
  sch.create({
    timerId: "tmr-backup",
    owner: "backup",
    type: timer.TE_TIMER_TYPE.SCHEDULED,
    at: 1500,
    interval: 0
  });
  clock.set(1499);
  assert.equal(sch.tick().fired, 0);
  clock.set(1500);
  assert.equal(sch.tick().fired, 1);
  pass("scheduled timer");

  // pause/resume
  const pr = timer.createTimerEngine({ seedDefaults: false });
  pr.create({ timerId: "tmr-pause", owner: "ai", interval: 200 });
  pr.pause("tmr-pause");
  assert.equal(pr.getTimer("tmr-pause").status, timer.TE_STATE.PAUSED);
  pr.advance(500);
  assert.equal(pr.tick().fired, 0);
  pr.resume("tmr-pause");
  pr.advance(200);
  assert.ok(pr.tick().fired >= 1);
  pass("pause resume");

  // battle / obs / ai
  const battle = eng.createBattleTimer({
    timerId: "battle-cd-1",
    kind: "cooldown",
    interval: 10
  });
  assert.equal(battle.ok, true);
  assert.equal(eng.getTimer("battle-cd-1").domain, "battle");
  const obs = eng.createObsTimer({ timerId: "obs-hide-1", interval: 10 });
  assert.equal(obs.ok, true);
  assert.equal(eng.getTimer("obs-hide-1").domain, "obs");
  const ai = eng.createAiTimer({ timerId: "ai-remind-1", at: eng.now() + 10, interval: 0 });
  assert.equal(ai.ok, true);
  assert.equal(eng.getTimer("ai-remind-1").domain, "ai");
  pass("battle obs ai timers");

  // kernel protect
  assert.equal(eng.cancel("tmr-watchdog").ok, false);
  pass("kernel timers protected");

  // limit
  const limited = timer.createTimerEngine({ seedDefaults: false, maxTimers: 1 });
  assert.equal(limited.create({ timerId: "a", owner: "o", interval: 10 }).ok, true);
  assert.equal(limited.create({ timerId: "b", owner: "o", interval: 10 }).ok, false);
  assert.equal(
    limited.create({
      timerId: "c",
      owner: "recovery",
      interval: 10,
      priority: timer.TE_PRIORITY.CRITICAL
    }).ok,
    true
  );
  pass("timer limit with critical bypass");

  // wall clock immunity: advancing monotonic ignores wall concepts
  const mono = timer.createMonotonicClock({ origin: 0 });
  mono.advance(1000);
  assert.equal(mono.now(), 1000);
  pass("monotonic advance");

  const trail = eng.auditTrail();
  assert.ok(trail.length > 0);
  assert.equal(trail[0].immutable, true);
  pass("immutable audit");

  const metrics = eng.metrics();
  assert.ok(metrics.timers >= 1);
  assert.ok(metrics.taskHandoffs >= 1);
  pass("timer metrics");

  const coreSys = architecture.getPlatformSystem(architecture.PLATFORM_SYSTEM_ID.CORE);
  assert.equal(coreSys.nextDocId, "0088");
  assert.ok(coreSys.runtime.includes("shared/mia-timer-core/timerEngine.js"));
  pass("core system next doc 0071");

  for (const rel of timer.TE_RUNTIME_ANCHORS) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
  }
  pass("runtime anchors");

  const readme = read("docs/master-canon/README.md");
  assert.ok(readme.includes("0060"), "README 0060");
  assert.ok(readme.includes("Timer Engine"), "README Timer Engine");
  pass("README registry");

  console.log("\nMaster Canon 0060 contract: ALL PASS");
}

run();
