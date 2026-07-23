"use strict";

/**
 * Flatten grouped gift-runtime host bindings for createGiftRuntime.
 */

function buildGiftRuntimeCtx(host = {}) {
  const { core = {}, modules = {}, state = {} } = host;

  return {
    runtimeConfig: core.runtimeConfig,
    writeLog: core.writeLog,
    giftSupporterProfileModule: modules.giftSupporterProfileModule,
    giftEconomyModule: modules.giftEconomyModule,
    awayModeModule: modules.awayModeModule,
    hostTeamPointsModule: modules.hostTeamPointsModule,
    giftMapEnterprise: modules.giftMapEnterprise,
    giftPresentationModule: modules.giftPresentationModule,
    getGiftSupporterProfile: state.getGiftSupporterProfile,
    setGiftSupporterProfile: state.setGiftSupporterProfile,
    getLastGiftMapping: state.getLastGiftMapping,
    setLastGiftMapping: state.setLastGiftMapping,
    getHostTeamScoreState: state.getHostTeamScoreState,
    setHostTeamScoreState: state.setHostTeamScoreState,
    getOutputState: state.getOutputState,
    getEcosystemState: state.getEcosystemState
  };
}

module.exports = { buildGiftRuntimeCtx };
