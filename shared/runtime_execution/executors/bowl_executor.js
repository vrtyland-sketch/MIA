"use strict";

async function runBowlExecutor(ctx = {}) {
  const executeBowl = ctx?.executeBowl;
  const bowlAction = ctx?.bowlAction || null;

  if (typeof executeBowl !== "function") {
    return {
      ok: false,
      skipped: true,
      reason: "bowl_executor_missing_callback"
    };
  }

  return await executeBowl(bowlAction);
}

module.exports = {
  runBowlExecutor
};