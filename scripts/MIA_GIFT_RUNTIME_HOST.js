"use strict";

/**
 * Assemble grouped gift-runtime host bindings from flat index bindings.
 */

function buildGiftRuntimeHost(bindings = {}) {
  const b = bindings;

  return {
    core: {
      runtimeConfig: b.runtimeConfig,
      writeLog: b.writeLog
    },
    modules: {
      giftSupporterProfileModule: b.giftSupporterProfileModule,
      giftEconomyModule: b.giftEconomyModule,
      awayModeModule: b.awayModeModule,
      hostTeamPointsModule: b.hostTeamPointsModule,
      giftMapEnterprise: b.giftMapEnterprise,
      giftPresentationModule: b.giftPresentationModule
    },
    state: {
      getGiftSupporterProfile: b.getGiftSupporterProfile,
      setGiftSupporterProfile: b.setGiftSupporterProfile,
      getLastGiftMapping: b.getLastGiftMapping,
      setLastGiftMapping: b.setLastGiftMapping,
      getHostTeamScoreState: b.getHostTeamScoreState,
      setHostTeamScoreState: b.setHostTeamScoreState,
      getOutputState: b.getOutputState,
      getEcosystemState: b.getEcosystemState
    }
  };
}

module.exports = { buildGiftRuntimeHost };
