"use strict";

function nowTs() {
  return Date.now();
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return fallback;
  }
}

function makeExecutionResult(base = {}) {
  return {
    ok: base.ok !== false,
    accepted: base.accepted !== false,
    executionId: base.executionId || null,
    status: base.status || "skipped",
    overlay: base.overlay || null,
    video: base.video || null,
    animationTrace: cloneJson(base.animationTrace, null),
    metrics: {
      overlayAttempted: Boolean(base.metrics?.overlayAttempted),
      overlayEmitted: Boolean(base.metrics?.overlayEmitted),
      videoAttempted: Boolean(base.metrics?.videoAttempted),
      videoEnqueued: Boolean(base.metrics?.videoEnqueued)
    },
    debug: {
      startedAt: Number(base.debug?.startedAt || nowTs()),
      finishedAt: Number(base.debug?.finishedAt || nowTs()),
      reasonCodes: Array.isArray(base.debug?.reasonCodes)
        ? base.debug.reasonCodes.slice()
        : []
    }
  };
}

function finalizeExecutionResult(result) {
  const overlayOk = result?.overlay?.ok !== false;
  const videoOk = result?.video?.ok !== false;
  const overlayAttempted = Boolean(result?.metrics?.overlayAttempted);
  const videoAttempted = Boolean(result?.metrics?.videoAttempted);

  let status = result?.status || "skipped";

  if (overlayAttempted || videoAttempted) {
    if (overlayOk && videoOk) {
      status =
        result?.metrics?.overlayEmitted || result?.metrics?.videoEnqueued
          ? "completed"
          : "skipped";
    } else if (overlayOk || videoOk) {
      status = "partial";
    } else {
      status = "failed";
    }
  }

  result.ok = status !== "failed";
  result.status = status;
  result.accepted = true;
  result.debug = result.debug || {};
  result.debug.finishedAt = nowTs();
  result.debug.reasonCodes = Array.isArray(result.debug.reasonCodes)
    ? result.debug.reasonCodes
    : [];

  if (!result.debug.reasonCodes.length) {
    result.debug.reasonCodes.push("EXECUTION_RESULT_FINALIZED");
  }

  return result;
}

function buildExecutionId(input = {}) {
  const parts = [
    input?.eventId || "noevent",
    input?.actionResult?.route || "noroute",
    input?.actionResult?.tier || "notier",
    nowTs()
  ];

  return `exec_${Buffer.from(parts.join(":"))
    .toString("base64")
    .replace(/=/g, "")}`;
}

module.exports = {
  buildExecutionId,
  cloneJson,
  finalizeExecutionResult,
  makeExecutionResult,
  nowTs
};