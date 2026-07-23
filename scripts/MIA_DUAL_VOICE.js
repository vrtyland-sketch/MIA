"use strict";

/**
 * Dual / companion voice — default OFF.
 * One user action = one TTS utterance unless explicitly enabled.
 *
 * Enable only when intentionally wanted:
 *   MIA_DUAL_VOICE=1
 */
function isDualVoiceEnabled() {
  return String(process.env.MIA_DUAL_VOICE || "").trim() === "1";
}

module.exports = {
  isDualVoiceEnabled
};
