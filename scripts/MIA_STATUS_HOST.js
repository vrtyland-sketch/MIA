"use strict";

/**
 * Assemble grouped status-runtime host bindings from flat index bindings.
 */

function buildStatusHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      getVideoEngine: b.getVideoEngine,
      getSpamSessionEngine: b.getSpamSessionEngine,
      kojnozoutModule: b.kojnozoutModule,
      overlayStateModule: b.overlayStateModule,
      kickBridgeModule: b.kickBridgeModule,
      streamSessionModule: b.streamSessionModule,
      streamEconomyConfig: b.streamEconomyConfig,
      giftMapEnterprise: b.giftMapEnterprise,
      awayModeModule: b.awayModeModule,
      kojnozoutVitalsModule: b.kojnozoutVitalsModule,
      kojnozoutDuelModule: b.kojnozoutDuelModule,
      kojnozoutBackpackModule: b.kojnozoutBackpackModule,
      kojnozoutAssetsModule: b.kojnozoutAssetsModule,
      ecosystemOrchestratorModule: b.ecosystemOrchestratorModule,
      chatLexiconModule: b.chatLexiconModule,
      sessionMemoryModule: b.sessionMemoryModule,
      llmAdapterModule: b.llmAdapterModule,
      statusSnapshotModule: b.statusSnapshotModule,
      proactiveHostModule: b.proactiveHostModule,
      supportPolicyModule: b.supportPolicyModule,
      soloStreamModule: b.soloStreamModule,
      logRotationModule: b.logRotationModule
    },
    core: {
      cloneJson: b.cloneJson,
      runtimeConfig: b.runtimeConfig,
      nowIso: b.nowIso,
      getPort: b.getPort
    },
    state: {
      getKojnozoutStateForSnapshot: b.getKojnozoutStateForSnapshot,
      getKojnozoutState: b.getKojnozoutState,
      getStreamState: b.getStreamState,
      getOverlayState: b.getOverlayState,
      getServerStartedAt: b.getServerStartedAt,
      getStreamSession: b.getStreamSession,
      getObsConnected: b.getObsConnected,
      getLastGiftMapping: b.getLastGiftMapping,
      getOutputState: b.getOutputState,
      getHostTeamScoreState: b.getHostTeamScoreState,
      getEcosystemState: b.getEcosystemState,
      getDuelState: b.getDuelState,
      getLastDuelSyncSummary: b.getLastDuelSyncSummary,
      getBackpackState: b.getBackpackState,
      getLastIngestSummary: b.getLastIngestSummary,
      getLastShadowPipelineSummary: b.getLastShadowPipelineSummary
    }
  };
}

module.exports = { buildStatusHost };
