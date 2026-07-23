"use strict";

const { resolveRuntimeGetter } = require("./MIA_RUNTIME_GETTER");

/**
 * Flatten grouped status-runtime host bindings for createStatusRuntime.
 */

function buildStatusCtx(host = {}) {
  const { modules = {}, core = {}, state = {} } = host;

  return {
    videoEngine: resolveRuntimeGetter(modules.getVideoEngine, modules.videoEngine),
    spamSessionEngine: resolveRuntimeGetter(
      modules.getSpamSessionEngine,
      modules.spamSessionEngine
    ),
    kojnozoutModule: modules.kojnozoutModule,
    getKojnozoutStateForSnapshot: state.getKojnozoutStateForSnapshot,
    getKojnozoutState: state.getKojnozoutState,
    getStreamState: state.getStreamState,
    cloneJson: core.cloneJson,
    overlayStateModule: modules.overlayStateModule,
    getOverlayState: state.getOverlayState,
    runtimeConfig: core.runtimeConfig,
    kickBridgeModule: modules.kickBridgeModule,
    getPort: core.getPort,
    nowIso: core.nowIso,
    getServerStartedAt: state.getServerStartedAt,
    streamSessionModule: modules.streamSessionModule,
    getStreamSession: state.getStreamSession,
    streamEconomyConfig: modules.streamEconomyConfig,
    getObsConnected: state.getObsConnected,
    giftMapEnterprise: modules.giftMapEnterprise,
    getLastGiftMapping: state.getLastGiftMapping,
    getOutputState: state.getOutputState,
    getHostTeamScoreState: state.getHostTeamScoreState,
    awayModeModule: modules.awayModeModule,
    getEcosystemState: state.getEcosystemState,
    kojnozoutVitalsModule: modules.kojnozoutVitalsModule,
    kojnozoutDuelModule: modules.kojnozoutDuelModule,
    getDuelState: state.getDuelState,
    getLastDuelSyncSummary: state.getLastDuelSyncSummary,
    kojnozoutBackpackModule: modules.kojnozoutBackpackModule,
    getBackpackState: state.getBackpackState,
    kojnozoutAssetsModule: modules.kojnozoutAssetsModule,
    ecosystemOrchestratorModule: modules.ecosystemOrchestratorModule,
    getLastIngestSummary: state.getLastIngestSummary,
    chatLexiconModule: modules.chatLexiconModule,
    sessionMemoryModule: modules.sessionMemoryModule,
    llmAdapterModule: modules.llmAdapterModule,
    statusSnapshotModule: modules.statusSnapshotModule,
    getLastShadowPipelineSummary: state.getLastShadowPipelineSummary,
    proactiveHostModule: modules.proactiveHostModule,
    supportPolicyModule: modules.supportPolicyModule,
    soloStreamModule: modules.soloStreamModule,
    logRotationModule: modules.logRotationModule
  };
}

module.exports = { buildStatusCtx };
