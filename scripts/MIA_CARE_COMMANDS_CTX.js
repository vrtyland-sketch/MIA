"use strict";

/**
 * Flatten grouped care-commands host bindings for createCareCommandHandler.
 */

function buildCareCommandsCtx(host = {}) {
  const { core = {}, state = {}, handlers = {}, modules = {} } = host;

  return {
    safeString: core.safeString,
    upper: core.upper,
    getUserLabel: handlers.getUserLabel,
    getRuntimeConfig: core.getRuntimeConfig,
    getStreamState: state.getStreamState,
    getOutputState: state.getOutputState,
    setOutputState: state.setOutputState,
    getKojnozoutState: state.getKojnozoutState,
    setKojnozoutState: state.setKojnozoutState,
    getKojnozoutBackpackState: state.getKojnozoutBackpackState,
    setKojnozoutBackpackState: state.setKojnozoutBackpackState,
    getItemDisplayState: state.getItemDisplayState,
    setItemDisplayState: state.setItemDisplayState,
    getKojnozoutDuelState: state.getKojnozoutDuelState,
    setKojnozoutDuelState: state.setKojnozoutDuelState,
    getPlatformArenaState: state.getPlatformArenaState,
    setPlatformArenaState: state.setPlatformArenaState,
    getStreamPlatformKey: core.getStreamPlatformKey,
    executeOverlay: handlers.executeOverlay,
    deliverQuestCompleteMoment: handlers.deliverQuestCompleteMoment,
    scheduleWorldSave: handlers.scheduleWorldSave,
    scheduleStoryAnimationAfterFeed: handlers.scheduleStoryAnimationAfterFeed,
    writeLog: core.writeLog,
    giftMapEnterprise: modules.giftMapEnterprise,
    modules: modules.care
  };
}

module.exports = { buildCareCommandsCtx };
