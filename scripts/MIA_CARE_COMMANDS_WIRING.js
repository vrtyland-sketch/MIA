"use strict";

/**
 * Care command handler factory deps for koj chat commands.
 */

function buildCareCommandsDeps(ctx) {
  return {
    safeString: ctx.safeString,
    upper: ctx.upper,
    getUserLabel: ctx.getUserLabel,
    getRuntimeConfig: ctx.getRuntimeConfig,
    getStreamState: ctx.getStreamState,
    getOutputState: ctx.getOutputState,
    setOutputState: ctx.setOutputState,
    getKojnozoutState: ctx.getKojnozoutState,
    setKojnozoutState: ctx.setKojnozoutState,
    getKojnozoutBackpackState: ctx.getKojnozoutBackpackState,
    setKojnozoutBackpackState: ctx.setKojnozoutBackpackState,
    getItemDisplayState: ctx.getItemDisplayState,
    setItemDisplayState: ctx.setItemDisplayState,
    getKojnozoutDuelState: ctx.getKojnozoutDuelState,
    setKojnozoutDuelState: ctx.setKojnozoutDuelState,
    getPlatformArenaState: ctx.getPlatformArenaState,
    setPlatformArenaState: ctx.setPlatformArenaState,
    getStreamPlatformKey: ctx.getStreamPlatformKey,
    executeOverlay: ctx.executeOverlay,
    deliverQuestCompleteMoment: ctx.deliverQuestCompleteMoment,
    scheduleWorldSave: ctx.scheduleWorldSave,
    scheduleStoryAnimationAfterFeed: ctx.scheduleStoryAnimationAfterFeed,
    writeLog: ctx.writeLog,
    giftMapEnterprise: ctx.giftMapEnterprise,
    modules: ctx.modules
  };
}

function createCareCommandHandler(careCommandsRoutes, ctx) {
  if (typeof careCommandsRoutes?.createCareCommandHandler !== "function") {
    return async () => null;
  }

  return careCommandsRoutes.createCareCommandHandler(buildCareCommandsDeps(ctx));
}

module.exports = { buildCareCommandsDeps, createCareCommandHandler };
