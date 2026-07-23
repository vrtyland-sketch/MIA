"use strict";

async function runVideoExecutor(ctx = {}) {
  const executeVideo = ctx?.executeVideo;
  const actionResult = ctx?.actionResult || null;
  const normalizedEvent = ctx?.normalizedEvent || null;
  const eventId = ctx?.eventId || null;

  if (typeof executeVideo !== "function") {
    return {
      ok: false,
      skipped: true,
      reason: "video_executor_missing_callback"
    };
  }

  return await executeVideo(actionResult, normalizedEvent, eventId);
}

module.exports = {
  runVideoExecutor
};