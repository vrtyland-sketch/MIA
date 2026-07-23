(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MIA_ANIMATION_PLAYER = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function safe(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function sampleMotion(motion, progress) {
    const frames = motion?.keyframes || [];
    if (!frames.length) return { translateY: 0, scaleX: 1, scaleY: 1, rotate: 0 };
    const p = clamp(progress, 0, 1);
    let prev = frames[0];
    for (let i = 1; i < frames.length; i += 1) {
      const next = frames[i];
      if (p <= next.t) {
        const span = Math.max(0.0001, next.t - prev.t);
        const local = (p - prev.t) / span;
        return {
          translateY: lerp(prev.translateY, next.translateY, local),
          scaleX: lerp(prev.scaleX, next.scaleX, local),
          scaleY: lerp(prev.scaleY, next.scaleY, local),
          rotate: lerp(prev.rotate, next.rotate, local)
        };
      }
      prev = next;
    }
    return frames[frames.length - 1];
  }

  function motionTransform(sample) {
    return `translateY(${sample.translateY || 0}px) scale(${sample.scaleX || 1}, ${sample.scaleY || 1}) rotate(${sample.rotate || 0}deg)`;
  }

  class MiaAnimationPlayer {
    constructor(hostEl, options = {}) {
      this.host = hostEl;
      this.apiBase = safe(options.apiBase, "");
      this.sheetEl = null;
      this.manifest = null;
      this.playing = false;
      this.raf = null;
      this.frameIndex = 0;
      this.accMs = 0;
      this.lastTs = 0;
      this.motion = null;
      this.motionStart = 0;
      this.onComplete = null;
      this.visible = false;
      this._ensureDom();
    }

    _ensureDom() {
      if (!this.host) return;
      let layer = this.host.querySelector(".mia-anim-layer");
      if (!layer) {
        layer = document.createElement("div");
        layer.className = "mia-anim-layer";
        layer.style.cssText =
          "position:absolute;inset:0;pointer-events:none;display:none;transform-origin:50% 100%;";
        const sheet = document.createElement("div");
        sheet.className = "mia-anim-sheet";
        sheet.style.cssText =
          "position:absolute;left:50%;bottom:0;transform:translateX(-50%);transform-origin:50% 100%;image-rendering:auto;";
        layer.appendChild(sheet);
        this.host.appendChild(layer);
        this.layerEl = layer;
        this.sheetEl = sheet;
      } else {
        this.layerEl = layer;
        this.sheetEl = layer.querySelector(".mia-anim-sheet");
      }
    }

    _url(path) {
      const raw = safe(path);
      if (!raw) return "";
      if (raw.startsWith("http")) return raw;
      const base = this.apiBase.replace(/\/$/, "");
      return `${base}/${raw.replace(/^\/+/, "")}`;
    }

    async loadManifest(manifestUrl) {
      const url = this._url(manifestUrl);
      if (!url) throw new Error("missing_manifest_url");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`manifest_http_${res.status}`);
      this.manifest = await res.json();
      return this.manifest;
    }

    async loadClip(clip) {
      const manifestUrl = clip?.manifestUrl || clip?.manifestPath;
      const sheetUrl = clip?.sheetUrl || clip?.sheetPath;
      await this.loadManifest(manifestUrl);
      const url = this._url(sheetUrl);
      this.sheetEl.style.width = `${this.manifest.frameWidth}px`;
      this.sheetEl.style.height = `${this.manifest.frameHeight}px`;
      this.sheetEl.style.backgroundImage = `url("${url}")`;
      this.sheetEl.style.backgroundRepeat = "no-repeat";
      this.sheetEl.style.backgroundPosition = "0 0";
      this.sheetEl.style.backgroundSize = `${this.manifest.sheetWidth}px ${this.manifest.sheetHeight}px`;
      this.frameIndex = 0;
      this._applyFrame(0);
      return this.manifest;
    }

    _applyFrame(index) {
      if (!this.manifest?.frames?.length) return;
      const frame = this.manifest.frames[index];
      if (!frame) return;
      this.sheetEl.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
    }

    play(options = {}) {
      if (!this.manifest) return false;
      this.stop({ keepVisible: true });
      this.playing = true;
      this.motion = options.motion || null;
      this.motionStart = performance.now();
      this.onComplete = typeof options.onComplete === "function" ? options.onComplete : null;
      this.layerEl.style.display = "block";
      this.visible = true;
      this.accMs = 0;
      this.lastTs = 0;
      this.frameIndex = 0;
      this._applyFrame(0);

      const loop = options.loop != null ? Boolean(options.loop) : this.manifest.loop !== false;
      const fps = Math.max(1, Number(options.fps || this.manifest.fps || 12));
      const frameMs = 1000 / fps;

      const tick = (ts) => {
        if (!this.playing) return;
        if (!this.lastTs) this.lastTs = ts;
        const dt = ts - this.lastTs;
        this.lastTs = ts;
        this.accMs += dt;

        if (this.motion?.durationMs) {
          const progress = clamp((ts - this.motionStart) / this.motion.durationMs, 0, 1);
          const sample = sampleMotion(this.motion, progress);
          const base = "translateX(-50%)";
          this.sheetEl.style.transform = `${base} ${motionTransform(sample)}`;
        } else {
          this.sheetEl.style.transform = "translateX(-50%)";
        }

        if (this.accMs >= frameMs) {
          this.accMs = 0;
          const next = this.frameIndex + 1;
          if (next >= this.manifest.frames.length) {
            if (loop) {
              this.frameIndex = 0;
            } else {
              this.frameIndex = this.manifest.frames.length - 1;
              this.playing = false;
              if (this.onComplete) this.onComplete();
              return;
            }
          } else {
            this.frameIndex = next;
          }
          this._applyFrame(this.frameIndex);
        }

        this.raf = requestAnimationFrame(tick);
      };

      this.raf = requestAnimationFrame(tick);
      return true;
    }

    stop(options = {}) {
      this.playing = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.lastTs = 0;
      this.accMs = 0;
      if (!options.keepVisible) {
        this.visible = false;
        if (this.layerEl) this.layerEl.style.display = "none";
      }
    }

    hide() {
      this.stop();
    }
  }

  function playGiftReaction(host, reaction, options = {}) {
    const player = new MiaAnimationPlayer(host, options);
    return player.loadClip(reaction).then(() => {
      player.play({
        motion: reaction.motion,
        loop: false,
        onComplete: options.onComplete
      });
      return player;
    });
  }

  function spawnParticles(layer, preset = {}, options = {}) {
    const FX = root.MIA_2D_FX;
    if (!FX?.spawnBurst || !layer) return null;
    return FX.init({ apiBase: options.apiBase || "" }).then(() => {
      return FX.spawnBurst(layer, {
        burst: preset.burst || "star",
        frame: preset.frame || "spark",
        count: preset.count || 16,
        x: options.x != null ? options.x : layer.clientWidth * 0.5,
        y: options.y != null ? options.y : layer.clientHeight * 0.55
      });
    });
  }

  return {
    MiaAnimationPlayer,
    playGiftReaction,
    spawnParticles,
    sampleMotion,
    motionTransform
  };
});
