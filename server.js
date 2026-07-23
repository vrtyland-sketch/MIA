"use strict";

const { loadLocalEnv } = require("./scripts/MIA_ENV");
loadLocalEnv();

const { startMiaServer } = require("./index.js");

if (require.main === module) {
  startMiaServer().catch((err) => {
    console.error("[MIA][BOOT_FAILED]", err && err.message ? err.message : err);
    process.exit(1);
  });
}

module.exports = { startMiaServer };
