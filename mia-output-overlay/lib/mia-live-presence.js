/**
 * Phase 14e — living-robot hero (true-alpha PNG).
 * One idle base + speak variant only; motion lives in MiaHoloMotion (not pose carousel).
 */
(function (root, factory) {
  const cfg = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = cfg;
  }
  root.MiaLivePresence = cfg;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  /** Shared with MiaRigAnchors.CACHE_BUST / Graphics v34 */
  const BUST = "36-koj-unify";
  const IDLE = "/assets/mia/cyber/lip/01.png";
  const SPEAK = "/assets/mia/cyber/speak.png";
  /** Idle ↔ speak only (2 states). lip/02 retired from hero carousel. */
  const LIP = [IDLE, SPEAK];

  return {
    phase: "14e",
    bust: BUST,
    lipLadder: LIP,
    idleFace: IDLE,
    speakFace: SPEAK,
    /** Pose crossfade (idle↔speak) — CSS opacity, not hard cut */
    poseCrossfadeMs: 320,
    /** Kept for contract / eyes ladder timing; hero no longer ticks pose frames */
    lipTickMs: 280,
    lipHoldMs: 340,
    faces: {
      idle: IDLE,
      happy: IDLE,
      gift: IDLE,
      duel: IDLE,
      combo: IDLE,
      think: IDLE,
      wave: IDLE
    },
    bustUrl(url) {
      if (!url) return url;
      return url + (url.includes("?") ? "&" : "?") + "v=" + BUST;
    }
  };
});
