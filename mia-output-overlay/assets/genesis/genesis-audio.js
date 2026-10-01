/**
 * Genesis audio modes — state-linked BGM/SFX helpers (WebAudio stubs).
 * Does not modify live mia-sound-cues defaults or gift music policy.
 */
(function (root) {
  "use strict";

  const MODE_FILE = {
    startup: null,
    ambient: null,
    cyber: null,
    calm: null,
    diagnostics: null
  };

  let mode = "ambient";

  function onSystemState(kind) {
    // Maps system moments → soundtrack (APPROVED rule)
    if (kind === "unlock") {
      mode = "cyber";
      if (root.MIA_GENESIS) {
        root.MIA_GENESIS.setBgmMode("cyber");
        root.MIA_GENESIS.playSfx("confirm");
      }
      return;
    }
    if (kind === "announcement") {
      mode = "startup";
      if (root.MIA_GENESIS) {
        root.MIA_GENESIS.setBgmMode("startup");
        root.MIA_GENESIS.playSfx("notification");
      }
      return;
    }
    if (kind === "diagnostics") {
      mode = "diagnostics";
      if (root.MIA_GENESIS) root.MIA_GENESIS.setBgmMode("diagnostics");
      return;
    }
    if (kind === "idle") {
      mode = "ambient";
      if (root.MIA_GENESIS) root.MIA_GENESIS.setBgmMode("ambient");
    }
  }

  root.MIA_GENESIS_AUDIO = {
    MODE_FILE,
    getMode: () => mode,
    onSystemState,
    note: "Drop cleared WAV/OGG into assets/genesis/music/ and wire MODE_FILE when ready."
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
