"use strict";

/**
 * Assemble grouped care-commands host bindings from flat index bindings.
 */

function buildCareCommandsHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      safeString: b.safeString,
      upper: b.upper,
      writeLog: b.writeLog,
      getRuntimeConfig: b.getRuntimeConfig,
      getStreamPlatformKey: b.getStreamPlatformKey
    },
    state: {
      getStreamState: b.getStreamState,
      getOutputState: b.getOutputState,
      setOutputState: b.setOutputState,
      getKojnozoutState: b.getKojnozoutState,
      setKojnozoutState: b.setKojnozoutState,
      getKojnozoutBackpackState: b.getKojnozoutBackpackState,
      setKojnozoutBackpackState: b.setKojnozoutBackpackState,
      getItemDisplayState: b.getItemDisplayState,
      setItemDisplayState: b.setItemDisplayState,
      getKojnozoutDuelState: b.getKojnozoutDuelState,
      setKojnozoutDuelState: b.setKojnozoutDuelState,
      getPlatformArenaState: b.getPlatformArenaState,
      setPlatformArenaState: b.setPlatformArenaState
    },
    handlers: {
      getUserLabel: b.getUserLabel,
      executeOverlay: b.executeOverlay,
      deliverQuestCompleteMoment: b.deliverQuestCompleteMoment,
      scheduleWorldSave: b.scheduleWorldSave,
      scheduleStoryAnimationAfterFeed: b.scheduleStoryAnimationAfterFeed
    },
    modules: {
      giftMapEnterprise: b.giftMapEnterprise,
      care: {
        kojTestModeModule: b.kojTestModeModule,
        kojnozoutVitalsModule: b.kojnozoutVitalsModule,
        kojnozoutPersistenceModule: b.kojnozoutPersistenceModule,
        kojnozoutDuelModule: b.kojnozoutDuelModule,
        kojnozoutItemCommandModule: b.kojnozoutItemCommandModule,
        careOpportunitiesModule: b.careOpportunitiesModule,
        careQuestModule: b.careQuestModule,
        kojnozoutCareModule: b.kojnozoutCareModule,
        kojnozoutCareValidationModule: b.kojnozoutCareValidationModule,
        careRewardModule: b.careRewardModule,
        responseEngine: b.responseEngine,
        kojWalkModule: b.kojWalkModule,
        platformArenaModule: b.platformArenaModule
      }
    }
  };
}

module.exports = { buildCareCommandsHost };
