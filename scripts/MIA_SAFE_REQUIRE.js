"use strict";

const path = require("path");

/** Project root (parent of scripts/) — matches index.js-relative require paths. */
const PROJECT_ROOT = path.join(__dirname, "..");

/**
 * Boot-safe require — logs failure, returns fallback (no process exit).
 * Relative paths resolve from project root, same as when safeRequire lived in index.js.
 */
function safeRequire(modulePath, fallback = {}) {
  try {
    let resolved = modulePath;
    if (
      typeof modulePath === "string" &&
      (modulePath.startsWith("./") || modulePath.startsWith("../"))
    ) {
      resolved = path.join(PROJECT_ROOT, modulePath);
    }
    return require(resolved);
  } catch (err) {
    console.error("[BOOT][REQUIRE_FAILED]", modulePath, err && err.message ? err.message : err);
    return fallback;
  }
}

module.exports = { safeRequire };
