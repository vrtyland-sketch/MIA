"use strict";

/**
 * Assemble grouped stream-state host bindings from flat index bindings.
 */

function buildStreamStateHost(bindings = {}) {
  const b = bindings;

  return {
    modules: {
      streamSessionModule: b.streamSessionModule,
      giftUserLedgerModule: b.giftUserLedgerModule,
      giftSupporterProfileModule: b.giftSupporterProfileModule,
      streamStateModule: b.streamStateModule,
      mediaCatalogModule: b.mediaCatalogModule
    },
    core: {
      writeLog: b.writeLog,
      serverStartedAt: b.serverStartedAt
    }
  };
}

module.exports = { buildStreamStateHost };
