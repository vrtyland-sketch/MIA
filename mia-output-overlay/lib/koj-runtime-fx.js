/**
 * Koj runtime gift/item FX — animation sheets, particles, sound cues, backpack item bursts.
 * Split phase G: HTML tick stays orchestrator; FX I/O and token dedupe live here.
 * No coins on overlay — only reaction/item visual payloads already sanitized upstream.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojRuntimeFx = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function safe(v) {
    return typeof v === "string" && v.trim() ? v.trim() : "";
  }

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.stageEl
   * @param {HTMLElement} [opts.spriteDock]
   * @param {HTMLElement} [opts.animFxLayer]
   * @param {HTMLElement} [opts.itemFxLayer]
   * @param {string} opts.apiBase
   * @param {() => string} [opts.getSearch]
   * @param {() => any} [opts.getAnimationPlayerApi]
   * @param {() => any} [opts.getSoundCuesApi]
   * @param {() => any} [opts.getMia2dFxApi]
   */
  function create(opts = {}) {
    const stageEl = opts.stageEl;
    const spriteDock = opts.spriteDock || null;
    const animFxLayer = opts.animFxLayer || null;
    const itemFxLayer = opts.itemFxLayer || null;
    const apiBase = safe(opts.apiBase) || "http://127.0.0.1:3000";
    const getSearch =
      typeof opts.getSearch === "function"
        ? opts.getSearch
        : () => (typeof location !== "undefined" ? location.search : "");
    const getAnimationPlayerApi =
      typeof opts.getAnimationPlayerApi === "function"
        ? opts.getAnimationPlayerApi
        : () => globalThis.MIA_ANIMATION_PLAYER;
    const getSoundCuesApi =
      typeof opts.getSoundCuesApi === "function"
        ? opts.getSoundCuesApi
        : () => globalThis.MIA_SOUND_CUES;
    const getMia2dFxApi =
      typeof opts.getMia2dFxApi === "function"
        ? opts.getMia2dFxApi
        : () => (typeof window !== "undefined" ? window.MIA_2D_FX : null);

    let lastItemUseToken = "";
    let animPlayer = null;
    let lastAnimationToken = "";
    let animationBusy = false;

    function ensureAnimPlayer() {
      const API = getAnimationPlayerApi();
      if (!API?.MiaAnimationPlayer || !spriteDock) return null;
      if (!animPlayer) {
        animPlayer = new API.MiaAnimationPlayer(spriteDock, { apiBase });
      }
      return animPlayer;
    }

    function syncAnimationReaction(data, now) {
      if (!stageEl) return false;
      const reaction = data?.animationReaction;
      const active = reaction?.active && Number(reaction.holdUntilTs || 0) > now;
      if (!active) {
        if (lastAnimationToken) {
          lastAnimationToken = "";
          animationBusy = false;
          stageEl.classList.remove("anim-sheet-active", "gift");
          if (animPlayer) animPlayer.hide();
        }
        return false;
      }

      const token = `${reaction.updatedAt || 0}:${reaction.animationId}:${reaction.giftKey || ""}`;
      const forceSheet =
        new URLSearchParams(getSearch() || "").get("animBank") === "1" ||
        reaction.studioPreview === true ||
        String(reaction.bankQuality || "").toLowerCase() === "production";
      const canPlaySheet =
        forceSheet &&
        reaction.preferProductionSprite !== true &&
        reaction.manifestUrl &&
        reaction.sheetUrl;

      if (token !== lastAnimationToken) {
        const FX = getAnimationPlayerApi();
        if (FX?.spawnParticles && reaction.particles && animFxLayer) {
          FX.spawnParticles(animFxLayer, reaction.particles, { apiBase });
        }
        const SFX = getSoundCuesApi();
        if (SFX?.playSoundCue && reaction.soundCue) {
          SFX.playSoundCue(reaction.soundCue);
        }
      }

      if (!canPlaySheet) {
        lastAnimationToken = token;
        animationBusy = false;
        stageEl.classList.remove("anim-sheet-active");
        if (reaction.overlay?.stageClass) {
          stageEl.classList.add(reaction.overlay.stageClass);
        } else {
          stageEl.classList.add("gift");
        }
        return false;
      }

      if (token === lastAnimationToken && animationBusy) {
        stageEl.classList.add("anim-sheet-active");
        return true;
      }

      const player = ensureAnimPlayer();
      if (!player) return false;

      lastAnimationToken = token;
      animationBusy = true;
      stageEl.classList.add("anim-sheet-active");
      if (reaction.overlay?.stageClass) {
        stageEl.classList.add(reaction.overlay.stageClass);
      } else {
        stageEl.classList.add("gift");
      }

      void player
        .loadClip({
          manifestUrl: reaction.manifestUrl,
          sheetUrl: reaction.sheetUrl
        })
        .then(() => {
          player.play({
            motion: reaction.motion,
            loop: false,
            onComplete: () => {
              animationBusy = false;
              stageEl.classList.remove("anim-sheet-active");
            }
          });
        })
        .catch((err) => {
          console.error("[MIA_ANIM]", err);
          animationBusy = false;
          stageEl.classList.remove("anim-sheet-active");
        });

      return true;
    }

    function spawnItemFx(itemId, optsFx = {}) {
      const FX = getMia2dFxApi();
      if (!FX?.playItemUse || !itemFxLayer) return;
      FX.init({ apiBase }).then(() => {
        FX.playItemUse(itemFxLayer, {
          itemId,
          apiBase,
          duelProjectile: optsFx.duelProjectile,
          projectile: optsFx.projectile,
          accent: optsFx.accent || "#b46cff"
        });
      });
    }

    function syncItemUse(data, now) {
      const itemUse = data?.kojDisplay?.itemUse;
      const summary = data?.backpack?.display?.lastUseSummary;
      const active = itemUse?.active || (summary?.holdUntil && summary.holdUntil > now);
      const source = itemUse?.active ? itemUse : summary;
      if (!active || !source?.itemId) {
        lastItemUseToken = "";
        return;
      }
      const token = `${source.at || 0}:${source.itemId}:${source.action || "use"}`;
      if (token !== lastItemUseToken) {
        lastItemUseToken = token;
        const role = safe(source.role || source.effect?.role).toLowerCase();
        const duelProjectile =
          role === "duel" || source.duelActive
            ? source.projectile || source.effect?.projectile || "orb"
            : null;
        spawnItemFx(source.itemId, {
          duelProjectile,
          projectile: source.projectile || source.effect?.projectile
        });
      }
    }

    return {
      ensureAnimPlayer,
      syncAnimationReaction,
      spawnItemFx,
      syncItemUse,
      isAnimationBusy: () => animationBusy,
      getLastAnimationToken: () => lastAnimationToken
    };
  }

  return { create };
});
