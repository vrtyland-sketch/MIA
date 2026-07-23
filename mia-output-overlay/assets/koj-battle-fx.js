(function (root) {
  "use strict";
  if (root.MIA_2D_FX) {
    root.MIA_KOJ_BATTLE_FX = root.MIA_2D_FX;
    return;
  }
  console.warn("[MIA] Načti nejdřív /assets/mia-2d-fx.js — koj-battle-fx.js je jen alias.");
})(typeof globalThis !== "undefined" ? globalThis : this);
