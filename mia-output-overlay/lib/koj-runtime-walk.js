/**
 * Koj runtime walk visual — CARE venčení vs ambient wander.
 * Pure helpers so HTML applyStageMood stays thin and single-sourced.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojRuntimeWalk = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function safe(value) {
    return typeof value === "string" && value.trim() ? value.trim() : "";
  }

  /**
   * @param {object} data overlay-state body
   * @returns {{ active: boolean, kind: 'care'|null, cssWander: boolean }}
   */
  function resolveCareWalkFromOverlay(data = {}) {
    const walk = data?.kojDisplay?.walk;
    if (walk?.active === true && walk?.kind === "care") {
      return {
        active: true,
        kind: "care",
        cssWander: walk.cssWander !== false
      };
    }

    const state = data?.kojnozoutState || data?.kojnozroutState || {};
    const flag =
      state.walkActive === true ||
      safe(state.behavior).toLowerCase() === "walking";

    if (flag) {
      return { active: true, kind: "care", cssWander: true };
    }

    return { active: false, kind: null, cssWander: false };
  }

  function shouldForceWander(data = {}) {
    const walk = resolveCareWalkFromOverlay(data);
    return walk.active === true && walk.cssWander === true;
  }

  return {
    resolveCareWalkFromOverlay,
    shouldForceWander
  };
});
