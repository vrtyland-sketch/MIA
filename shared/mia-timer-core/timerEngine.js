"use strict";

/**
 * Master Canon 0060 — Timer Engine: sole time authority; schedules via Task Scheduler, never executes directly.
 * Production code must not use raw setTimeout/setInterval outside Timer Engine.
 */

const TE_COMPONENT = Object.freeze({
  TIMER_ENGINE: "timer_engine",
  TIMER_REGISTRY: "timer_registry",
  MONOTONIC_CLOCK: "monotonic_clock",
  ONE_SHOT_SCHEDULER: "one_shot_scheduler",
  REPEATING_SCHEDULER: "repeating_scheduler",
  SCHEDULED_SCHEDULER: "scheduled_scheduler",
  TASK_BRIDGE: "task_bridge",
  BATTLE_BRIDGE: "battle_bridge",
  OBS_BRIDGE: "obs_bridge",
  AI_BRIDGE: "ai_bridge",
  AUDIT_LOG: "audit_log",
  METRICS: "metrics"
});

const TE_COMPONENT_ORDER = Object.freeze(Object.values(TE_COMPONENT));

const TE_TIMER_TYPE = Object.freeze({
  ONE_SHOT: "one_shot",
  REPEATING: "repeating",
  SCHEDULED: "scheduled",
  DELAYED: "delayed"
});

const TE_STATE = Object.freeze({
  CREATED: "created",
  SCHEDULED: "scheduled",
  WAITING: "waiting",
  RUNNING: "running",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  PAUSED: "paused"
});

const TE_PRIORITY = Object.freeze({
  CRITICAL: "critical",
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
  BACKGROUND: "background"
});

const TE_PRIORITY_ORDER = Object.freeze([
  TE_PRIORITY.CRITICAL,
  TE_PRIORITY.HIGH,
  TE_PRIORITY.NORMAL,
  TE_PRIORITY.LOW,
  TE_PRIORITY.BACKGROUND
]);

const TE_INTERVAL_UNIT = Object.freeze({
  MS: "ms",
  SECONDS: "seconds",
  MINUTES: "minutes",
  HOURS: "hours",
  DAYS: "days"
});

const TE_REPEAT_MODE = Object.freeze({
  INFINITE: "infinite",
  FIXED_COUNT: "fixed_count",
  UNTIL_TIME: "until_time",
  UNTIL_CONDITION: "until_condition"
});

const TE_PUBLIC_API = Object.freeze([
  "create",
  "cancel",
  "pause",
  "resume",
  "tick",
  "now",
  "setIntervalMs",
  "createBattleTimer",
  "createObsTimer",
  "createAiTimer",
  "metrics"
]);

const TE_RUNTIME_ANCHORS = Object.freeze([
  "shared/mia-timer-core/timerEngine.js",
  "shared/mia-scheduler-core/taskScheduler.js",
  "shared/mia-thread-core/threadManager.js",
  "docs/master-canon/0060-timer-engine.md"
]);

const TE_KERNEL_TIMER_IDS = Object.freeze([
  "tmr-watchdog",
  "tmr-health-check",
  "tmr-recovery"
]);

const TE_DEFAULT_MAX_TIMERS = 500;
const TE_MIN_INTERVAL_MS = 1;
const TE_MAX_INFINITE_FIRE_PER_TICK = 1;

const TE_CLOCK = Object.freeze({
  KIND: "monotonic",
  USES_WALL_CLOCK_FOR_INTERVALS: false
});

function assertDirectTimerForbidden(api) {
  if (api === "setTimeout" || api === "setInterval" || api === "raw_timer") {
    return { ok: false, error: "direct_timer_api_forbidden" };
  }
  return { ok: true };
}

function toMilliseconds(value, unit = TE_INTERVAL_UNIT.MS) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "invalid_interval" };
  switch (unit) {
    case TE_INTERVAL_UNIT.MS:
      return { ok: true, ms: n };
    case TE_INTERVAL_UNIT.SECONDS:
      return { ok: true, ms: n * 1000 };
    case TE_INTERVAL_UNIT.MINUTES:
      return { ok: true, ms: n * 60_000 };
    case TE_INTERVAL_UNIT.HOURS:
      return { ok: true, ms: n * 3_600_000 };
    case TE_INTERVAL_UNIT.DAYS:
      return { ok: true, ms: n * 86_400_000 };
    default:
      return { ok: false, error: "unknown_unit" };
  }
}

function priorityRank(priority) {
  const idx = TE_PRIORITY_ORDER.indexOf(priority);
  return idx === -1 ? TE_PRIORITY_ORDER.length : idx;
}

function createMonotonicClock(options = {}) {
  const origin = options.origin != null ? Number(options.origin) : 0;
  let offset = origin;
  let last = origin;

  return {
    kind: TE_CLOCK.KIND,
    usesWallClockForIntervals: false,
    now() {
      // Simulated monotonic advancement: callers may also inject via advance()
      return last;
    },
    advance(ms) {
      const delta = Number(ms) || 0;
      if (delta < 0) return last;
      last += delta;
      return last;
    },
    set(ms) {
      // Allow absolute monotonic set for tests; wall-clock jumps do not apply
      last = Number(ms) || last;
      return last;
    },
    syncModules() {
      return Object.freeze({
        source: "timer_engine",
        now: last,
        modules: Object.freeze([
          "battle",
          "ai",
          "obs",
          "overlay",
          "inventory",
          "memory"
        ])
      });
    }
  };
}

function createTimerDescriptor(input = {}, clockNow = 0) {
  const timerId = String(input.timerId || input.id || "").trim();
  if (!timerId) return { ok: false, error: "missing_timer_id" };
  const owner = String(input.owner || "").trim();
  if (!owner) return { ok: false, error: "missing_owner" };

  const type = input.type || TE_TIMER_TYPE.ONE_SHOT;
  const intervalInfo = toMilliseconds(
    input.interval != null ? input.interval : input.delayMs != null ? input.delayMs : 0,
    input.unit || TE_INTERVAL_UNIT.MS
  );
  if (!intervalInfo.ok) return intervalInfo;

  let intervalMs = intervalInfo.ms;
  if (type === TE_TIMER_TYPE.REPEATING && intervalMs < TE_MIN_INTERVAL_MS) {
    return { ok: false, error: "interval_too_small" };
  }

  const startTime = clockNow;
  let nextExecution = clockNow + intervalMs;
  if (type === TE_TIMER_TYPE.SCHEDULED) {
    if (input.at == null) return { ok: false, error: "missing_scheduled_at" };
    nextExecution = Number(input.at);
  }

  return {
    ok: true,
    descriptor: Object.freeze({
      timerId,
      type,
      owner,
      startTime,
      nextExecution,
      interval: intervalMs,
      repeatCount: 0,
      maxRepeats:
        input.repeatMode === TE_REPEAT_MODE.INFINITE
          ? Infinity
          : Number.isFinite(input.maxRepeats)
            ? input.maxRepeats
            : type === TE_TIMER_TYPE.REPEATING
              ? Infinity
              : 1,
      repeatMode: input.repeatMode || (type === TE_TIMER_TYPE.REPEATING ? TE_REPEAT_MODE.INFINITE : TE_REPEAT_MODE.FIXED_COUNT),
      untilTime: input.untilTime != null ? Number(input.untilTime) : null,
      untilCondition: typeof input.untilCondition === "function" ? input.untilCondition : null,
      status: TE_STATE.CREATED,
      priority: input.priority || TE_PRIORITY.NORMAL,
      domain: input.domain || "system",
      taskType: input.taskType || "timer_expired",
      pausedRemaining: null,
      lastFiredAt: null,
      delayAccumulated: 0,
      kernel: TE_KERNEL_TIMER_IDS.includes(timerId) || input.kernel === true
    })
  };
}

function createTimerEngine(options = {}) {
  const singleton = options.singleton !== false;
  const clock = options.clock || createMonotonicClock(options.clockOptions);
  const timers = new Map();
  const audit = [];
  let maxTimers = options.maxTimers || TE_DEFAULT_MAX_TIMERS;
  let cancelledCount = 0;
  let fireCount = 0;
  let taskHandoffs = 0;
  const taskSink =
    options.taskScheduler ||
    ({
      submit(task) {
        return { ok: true, taskId: task.taskId, queued: true };
      }
    });

  function appendAudit(record) {
    audit.push(
      Object.freeze({
        ...record,
        at: record.at != null ? record.at : clock.now(),
        immutable: true
      })
    );
  }

  function get(timerId) {
    return timers.get(timerId) || null;
  }

  function set(timerId, patch) {
    const prev = get(timerId);
    if (!prev) return null;
    const next = Object.freeze({ ...prev, ...patch });
    timers.set(timerId, next);
    return next;
  }

  function activeCount() {
    return [...timers.values()].filter(
      (t) =>
        t.status === TE_STATE.SCHEDULED ||
        t.status === TE_STATE.WAITING ||
        t.status === TE_STATE.RUNNING ||
        t.status === TE_STATE.PAUSED
    ).length;
  }

  function create(input = {}) {
    const built = createTimerDescriptor(input, clock.now());
    if (!built.ok) return built;
    if (timers.has(built.descriptor.timerId)) {
      return { ok: false, error: "duplicate_timer_id" };
    }
    if (activeCount() >= maxTimers && built.descriptor.priority !== TE_PRIORITY.CRITICAL) {
      return { ok: false, error: "timer_limit_exceeded" };
    }

    // Block zero-interval infinite loops
    if (
      built.descriptor.repeatMode === TE_REPEAT_MODE.INFINITE &&
      built.descriptor.interval < TE_MIN_INTERVAL_MS
    ) {
      return { ok: false, error: "infinite_loop_blocked" };
    }

    timers.set(built.descriptor.timerId, built.descriptor);
    set(built.descriptor.timerId, { status: TE_STATE.SCHEDULED });
    set(built.descriptor.timerId, { status: TE_STATE.WAITING });

    appendAudit({
      action: "created",
      timerId: built.descriptor.timerId,
      owner: built.descriptor.owner,
      result: "scheduled"
    });

    return {
      ok: true,
      timer: get(built.descriptor.timerId),
      executesDirectly: false,
      usesMonotonicClock: true
    };
  }

  function cancel(timerId, meta = {}) {
    const timer = get(timerId);
    if (!timer) return { ok: false, error: "unknown_timer" };
    if (timer.kernel && meta.force !== true) {
      return { ok: false, error: "kernel_timer_protected" };
    }
    set(timerId, { status: TE_STATE.CANCELLED });
    cancelledCount += 1;
    appendAudit({
      action: "cancelled",
      timerId,
      owner: timer.owner,
      reason: meta.reason || "cancel",
      result: "cancelled"
    });
    return { ok: true, timer: get(timerId) };
  }

  function pause(timerId) {
    const timer = get(timerId);
    if (!timer) return { ok: false, error: "unknown_timer" };
    if (timer.status !== TE_STATE.WAITING && timer.status !== TE_STATE.SCHEDULED) {
      return { ok: false, error: "cannot_pause" };
    }
    const remaining = Math.max(0, timer.nextExecution - clock.now());
    set(timerId, { status: TE_STATE.PAUSED, pausedRemaining: remaining });
    appendAudit({
      action: "paused",
      timerId,
      owner: timer.owner,
      result: "paused"
    });
    return { ok: true, timer: get(timerId) };
  }

  function resume(timerId) {
    const timer = get(timerId);
    if (!timer) return { ok: false, error: "unknown_timer" };
    if (timer.status !== TE_STATE.PAUSED) return { ok: false, error: "not_paused" };
    const nextExecution = clock.now() + (timer.pausedRemaining || 0);
    set(timerId, {
      status: TE_STATE.WAITING,
      nextExecution,
      pausedRemaining: null
    });
    appendAudit({
      action: "resumed",
      timerId,
      owner: timer.owner,
      result: "waiting"
    });
    return { ok: true, timer: get(timerId) };
  }

  function setIntervalMs(timerId, interval, unit = TE_INTERVAL_UNIT.MS) {
    const timer = get(timerId);
    if (!timer) return { ok: false, error: "unknown_timer" };
    if (timer.kernel) return { ok: false, error: "kernel_timer_protected" };
    const converted = toMilliseconds(interval, unit);
    if (!converted.ok) return converted;
    if (converted.ms < TE_MIN_INTERVAL_MS) return { ok: false, error: "interval_too_small" };
    set(timerId, {
      interval: converted.ms,
      nextExecution: clock.now() + converted.ms
    });
    appendAudit({
      action: "interval_changed",
      timerId,
      owner: timer.owner,
      result: String(converted.ms)
    });
    return { ok: true, timer: get(timerId) };
  }

  function shouldComplete(timer, now) {
    if (timer.repeatMode === TE_REPEAT_MODE.FIXED_COUNT && timer.repeatCount >= timer.maxRepeats) {
      return true;
    }
    if (timer.repeatMode === TE_REPEAT_MODE.UNTIL_TIME && timer.untilTime != null && now >= timer.untilTime) {
      return true;
    }
    if (timer.repeatMode === TE_REPEAT_MODE.UNTIL_CONDITION && timer.untilCondition) {
      try {
        if (timer.untilCondition(timer, now)) return true;
      } catch (_) {
        return true;
      }
    }
    if (
      timer.type === TE_TIMER_TYPE.ONE_SHOT ||
      timer.type === TE_TIMER_TYPE.DELAYED ||
      timer.type === TE_TIMER_TYPE.SCHEDULED
    ) {
      return timer.repeatCount >= 1;
    }
    return false;
  }

  function handOffToScheduler(timer, now) {
    const taskId = `task-from-${timer.timerId}-${timer.repeatCount}`;
    const submitted = taskSink.submit({
      taskId,
      owner: timer.owner,
      type: timer.taskType,
      priority: timer.priority,
      sourceTimerId: timer.timerId,
      at: now
    });
    taskHandoffs += 1;
    appendAudit({
      action: "fired",
      timerId: timer.timerId,
      owner: timer.owner,
      result: submitted.ok ? `task:${taskId}` : "handoff_failed"
    });
    return {
      ok: !!submitted.ok,
      taskId,
      executesDirectly: false,
      submitted
    };
  }

  function tick(now = clock.now(), opts = {}) {
    if (typeof now === "number" && options.clock && options.syncClockOnTick !== false) {
      clock.set(now);
    }
    const current = clock.now();
    const due = [...timers.values()]
      .filter(
        (t) =>
          (t.status === TE_STATE.WAITING || t.status === TE_STATE.SCHEDULED) &&
          t.nextExecution <= current
      )
      .sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return a.nextExecution - b.nextExecution;
      });

    const overload = opts.overload === true || activeCount() > maxTimers * 0.9;
    const createdTasks = [];
    let processed = 0;

    for (const timer of due) {
      if (overload && priorityRank(timer.priority) > priorityRank(TE_PRIORITY.HIGH)) {
        continue;
      }
      // Prevent zero-delay infinite spin within one tick
      if (
        timer.repeatMode === TE_REPEAT_MODE.INFINITE &&
        timer.interval <= 0 &&
        processed >= TE_MAX_INFINITE_FIRE_PER_TICK
      ) {
        appendAudit({
          action: "blocked_loop",
          timerId: timer.timerId,
          owner: timer.owner,
          result: "infinite_loop_blocked"
        });
        cancel(timer.timerId, { force: true, reason: "infinite_loop" });
        continue;
      }

      set(timer.timerId, { status: TE_STATE.RUNNING, lastFiredAt: current });
      const delay = Math.max(0, current - timer.nextExecution);
      set(timer.timerId, { delayAccumulated: timer.delayAccumulated + delay });

      const handoff = handOffToScheduler(get(timer.timerId), current);
      if (handoff.ok) createdTasks.push(handoff.taskId);

      fireCount += 1;
      const nextCount = timer.repeatCount + 1;
      set(timer.timerId, { repeatCount: nextCount });

      const latest = get(timer.timerId);
      if (shouldComplete(latest, current)) {
        set(timer.timerId, { status: TE_STATE.COMPLETED });
        appendAudit({
          action: "completed",
          timerId: timer.timerId,
          owner: timer.owner,
          result: "completed"
        });
      } else {
        set(timer.timerId, {
          status: TE_STATE.WAITING,
          nextExecution: current + latest.interval
        });
      }
      processed += 1;
    }

    return {
      ok: true,
      now: current,
      fired: processed,
      createdTasks: Object.freeze(createdTasks),
      executesDirectly: false,
      overloadDeferred: overload
    };
  }

  function createBattleTimer(input = {}) {
    return create({
      ...input,
      timerId: input.timerId || `battle-${input.kind || "cooldown"}-${Date.now().toString(36)}`,
      owner: input.owner || "battle-engine",
      domain: "battle",
      type: input.type || TE_TIMER_TYPE.DELAYED,
      priority: input.priority || TE_PRIORITY.NORMAL,
      taskType: input.taskType || "battle_timer"
    });
  }

  function createObsTimer(input = {}) {
    return create({
      ...input,
      timerId: input.timerId || `obs-${input.kind || "overlay"}-${Date.now().toString(36)}`,
      owner: input.owner || "obs",
      domain: "obs",
      type: input.type || TE_TIMER_TYPE.ONE_SHOT,
      priority: input.priority || TE_PRIORITY.LOW,
      taskType: input.taskType || "obs_timer"
    });
  }

  function createAiTimer(input = {}) {
    return create({
      ...input,
      timerId: input.timerId || `ai-${input.kind || "reminder"}-${Date.now().toString(36)}`,
      owner: input.owner || "ai",
      domain: "ai",
      type: input.type || TE_TIMER_TYPE.SCHEDULED,
      priority: input.priority || TE_PRIORITY.NORMAL,
      taskType: input.taskType || "ai_timer",
      at: input.at,
      interval: input.interval != null ? input.interval : 0
    });
  }

  function metrics() {
    const active = [...timers.values()].filter(
      (t) =>
        t.status === TE_STATE.WAITING ||
        t.status === TE_STATE.SCHEDULED ||
        t.status === TE_STATE.RUNNING ||
        t.status === TE_STATE.PAUSED
    );
    const longest = active
      .slice()
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 5)
      .map((t) => t.timerId);

    const totalDelay = active.reduce((s, t) => s + t.delayAccumulated, 0);
    return Object.freeze({
      timers: timers.size,
      active: active.length,
      cancelled: cancelledCount,
      fires: fireCount,
      taskHandoffs,
      avgDelayMs: fireCount ? totalDelay / Math.max(1, fireCount) : 0,
      longestRunning: Object.freeze(longest),
      maxTimers
    });
  }

  if (options.seedDefaults !== false) {
    create({
      timerId: "tmr-watchdog",
      owner: "watchdog",
      type: TE_TIMER_TYPE.REPEATING,
      interval: 1000,
      priority: TE_PRIORITY.CRITICAL,
      kernel: true,
      repeatMode: TE_REPEAT_MODE.INFINITE
    });
    create({
      timerId: "tmr-health-check",
      owner: "monitoring",
      type: TE_TIMER_TYPE.REPEATING,
      interval: 5000,
      priority: TE_PRIORITY.HIGH,
      kernel: true,
      repeatMode: TE_REPEAT_MODE.INFINITE
    });
    create({
      timerId: "tmr-recovery",
      owner: "recovery",
      type: TE_TIMER_TYPE.ONE_SHOT,
      interval: 60_000,
      priority: TE_PRIORITY.CRITICAL,
      kernel: true
    });
  }

  return {
    create,
    cancel,
    pause,
    resume,
    tick,
    setIntervalMs,
    createBattleTimer,
    createObsTimer,
    createAiTimer,
    now() {
      return clock.now();
    },
    advance(ms) {
      return clock.advance(ms);
    },
    syncTime() {
      return clock.syncModules();
    },
    assertDirectTimerForbidden,
    toMilliseconds,
    metrics,
    getTimer(timerId) {
      return get(timerId);
    },
    list() {
      return Object.freeze({ timers: Object.freeze([...timers.values()]) });
    },
    auditTrail() {
      return Object.freeze([...audit]);
    },
    status() {
      return Object.freeze({
        singleton,
        soleTimeAuthority: true,
        executesTasksDirectly: false,
        clock: TE_CLOCK,
        component: TE_COMPONENT.TIMER_ENGINE,
        timerCount: timers.size,
        maxTimers
      });
    },
    snapshot() {
      return Object.freeze({
        ok: true,
        singleton,
        metrics: metrics(),
        time: clock.syncModules()
      });
    }
  };
}

module.exports = {
  TE_COMPONENT,
  TE_COMPONENT_ORDER,
  TE_TIMER_TYPE,
  TE_STATE,
  TE_PRIORITY,
  TE_PRIORITY_ORDER,
  TE_INTERVAL_UNIT,
  TE_REPEAT_MODE,
  TE_PUBLIC_API,
  TE_RUNTIME_ANCHORS,
  TE_KERNEL_TIMER_IDS,
  TE_CLOCK,
  TE_DEFAULT_MAX_TIMERS,
  assertDirectTimerForbidden,
  toMilliseconds,
  createMonotonicClock,
  createTimerDescriptor,
  createTimerEngine
};
