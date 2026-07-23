"use strict";

const path = require("path");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const RESTART_SCRIPT = path.join(__dirname, "mia_restart.js");

let restartPending = false;
let restartTimer = null;

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isSelfRestartEnabled() {
  const raw = safeString(process.env.MIA_SELF_RESTART, "on").toLowerCase();
  return raw !== "off" && raw !== "0" && raw !== "false";
}

function isRestartPending() {
  return restartPending;
}

function shouldRestartAfterHands(result = {}) {
  if (!result || result.skipped) return false;
  return (
    (Array.isArray(result.created) && result.created.length > 0) ||
    (Array.isArray(result.sceneAdded) && result.sceneAdded.length > 0) ||
    (Array.isArray(result.configured) && result.configured.length > 0)
  );
}

function shouldRestartAfterMediaApply(report = {}) {
  return Array.isArray(report.applied) && report.applied.length > 0;
}

function resolveRestartDelayMs(options = {}) {
  if (Number.isFinite(options.delayMs)) {
    return Math.max(0, Number(options.delayMs));
  }
  const env = Number(process.env.MIA_SELF_RESTART_DELAY_MS || 2500);
  return Number.isFinite(env) ? Math.max(0, env) : 2500;
}

function spawnDetachedRestart(options = {}) {
  const delayMs = resolveRestartDelayMs(options);
  const reason = safeString(options.reason, "external");
  const args = [
    RESTART_SCRIPT,
    `--delay=${delayMs}`,
    `--reason=${encodeURIComponent(reason)}`
  ];

  const child = spawn(process.execPath, args, {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: "ignore",
    env: process.env
  });
  child.unref();
  return { scheduled: true, delayMs, reason, mode: "detached" };
}

function scheduleInProcessRestart(reason, options = {}) {
  if (!isSelfRestartEnabled()) {
    return { scheduled: false, reason: "disabled" };
  }
  if (restartPending) {
    return { scheduled: false, reason: "already_pending" };
  }

  const delayMs = resolveRestartDelayMs(options);
  restartPending = true;
  console.log(`[MIA] Restart za ${delayMs}ms — ${reason}`);

  restartTimer = setTimeout(() => {
    restartTimer = null;
    spawnDetachedRestart({ delayMs: 600, reason });
    process.exit(0);
  }, delayMs);

  return { scheduled: true, delayMs, reason, mode: "in_process" };
}

function maybeScheduleRestartAfterHands(result, reason = "obs_hands") {
  if (!shouldRestartAfterHands(result)) {
    return { scheduled: false, reason: "no_changes" };
  }
  return scheduleInProcessRestart(reason);
}

function maybeScheduleRestartAfterMediaApply(report, reason = "media_apply_obs") {
  if (!shouldRestartAfterMediaApply(report)) {
    return { scheduled: false, reason: "no_changes" };
  }
  return scheduleInProcessRestart(reason);
}

function triggerExternalRestart(reason, options = {}) {
  if (!isSelfRestartEnabled()) {
    return { scheduled: false, reason: "disabled" };
  }
  return spawnDetachedRestart({ ...options, reason });
}

module.exports = {
  isSelfRestartEnabled,
  isRestartPending,
  shouldRestartAfterHands,
  shouldRestartAfterMediaApply,
  scheduleInProcessRestart,
  maybeScheduleRestartAfterHands,
  maybeScheduleRestartAfterMediaApply,
  spawnDetachedRestart,
  triggerExternalRestart
};
