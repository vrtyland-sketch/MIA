/**
 * Shared overlay poll scheduler — in-flight guard + exponential backoff.
 * Used by Koj runtime (and optionally bowl/backpack/duel) so poll logic
 * does not duplicate across Browser Sources.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MiaOverlayPoll = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  /**
   * @param {object} opts
   * @param {() => Promise<void>|void} opts.tick
   * @param {number} [opts.intervalMs=450]
   * @param {number} [opts.backoffMs=2000]
   * @param {number} [opts.maxBackoffMs=8000]
   * @param {(err: unknown) => void} [opts.onError]
   */
  function createOverlayPollScheduler(opts = {}) {
    const tickFn = typeof opts.tick === "function" ? opts.tick : async () => {};
    const intervalMs = Math.max(100, toNumber(opts.intervalMs, 450));
    const backoffMs = Math.max(intervalMs, toNumber(opts.backoffMs, 2000));
    const maxBackoffMs = Math.max(backoffMs, toNumber(opts.maxBackoffMs, 8000));
    const onError = typeof opts.onError === "function" ? opts.onError : null;

    let inFlight = false;
    let failStreak = 0;
    let timer = null;
    let stopped = false;

    async function runTick() {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        await tickFn();
        failStreak = 0;
      } catch (err) {
        failStreak += 1;
        if (onError) onError(err);
      } finally {
        inFlight = false;
      }
    }

    function nextDelay() {
      if (failStreak <= 0) return intervalMs;
      return Math.min(backoffMs * failStreak, maxBackoffMs);
    }

    function schedule() {
      if (stopped) return;
      timer = setTimeout(async () => {
        await runTick();
        schedule();
      }, nextDelay());
    }

    function start() {
      stopped = false;
      if (timer != null) return;
      schedule();
    }

    function stop() {
      stopped = true;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    return {
      start,
      stop,
      runTick,
      get inFlight() {
        return inFlight;
      },
      get failStreak() {
        return failStreak;
      },
      get intervalMs() {
        return intervalMs;
      },
      get backoffMs() {
        return backoffMs;
      }
    };
  }

  return {
    createOverlayPollScheduler
  };
});
