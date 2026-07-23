"use strict";

/**
 * Flatten grouped stream-state host bindings for createStreamStateRuntime.
 */

function buildStreamStateCtx(host = {}) {
  const { modules = {}, core = {} } = host;

  return {
    streamSessionModule: modules.streamSessionModule,
    giftUserLedgerModule: modules.giftUserLedgerModule,
    giftSupporterProfileModule: modules.giftSupporterProfileModule,
    streamStateModule: modules.streamStateModule,
    mediaCatalogModule: modules.mediaCatalogModule,
    writeLog: core.writeLog,
    serverStartedAt: core.serverStartedAt
  };
}

module.exports = { buildStreamStateCtx };
