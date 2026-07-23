(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MIA_2D_FX = api;
  root.MIA_KOJ_BATTLE_FX = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_MANIFEST = {
    projectiles: {
      coin: { url: "/assets/kojnozrout/fx/projectiles/coin.png?v=4", burst: "impact", sheetFrame: 3 },
      box: { url: "/assets/kojnozrout/fx/projectiles/box.png?v=4", burst: "impact", sheetFrame: 5 },
      orb: { url: "/assets/kojnozrout/fx/projectiles/orb.png?v=4", burst: "star", sheetFrame: 1 },
      heart: { url: "/assets/kojnozrout/fx/projectiles/heart.png?v=4", burst: "heal", sheetFrame: 4 },
      food: { url: "/assets/kojnozrout/fx/projectiles/food.png?v=4", burst: "item_pop", sheetFrame: 6 },
      star: { url: "/assets/kojnozrout/fx/projectiles/star.png?v=4", burst: "star", sheetFrame: 2 },
      spark: { url: "/assets/kojnozrout/fx/projectiles/spark.png?v=4", burst: "impact", sheetFrame: 0 }
    },
    particleSheet: {
      url: "/assets/kojnozrout/fx/projectiles/particle-sheet.png?v=2",
      frameWidth: 48,
      frameCount: 8,
      frames: { spark: 0, orb: 1, star: 2, coin: 3, heart: 4, box: 5, food: 6, trail: 7 }
    },
    particleSheetAnim: {
      url: "/assets/kojnozrout/fx/projectiles/particle-sheet-anim.png?v=1",
      frameWidth: 48,
      frameHeight: 48,
      cols: 4,
      rows: 8,
      fps: 14,
      kinds: { spark: 0, orb: 1, star: 2, coin: 3, heart: 4, box: 5, food: 6, trail: 7 }
    },
    burstImpactSheet: {
      url: "/assets/kojnozrout/fx/projectiles/burst-impact-sheet.png?v=1",
      frameWidth: 64,
      frameHeight: 64,
      cols: 4,
      rows: 4,
      frameCount: 16,
      fps: 28
    },
    items: { base: "/assets/kojnozrout/items/", ver: "v=4" },
    bursts: {
      impact: { count: 32, speedMin: 2.2, speedMax: 7.5, upward: 0.35, shockwave: true, life: 1, anim: true, impactSprite: true },
      heal: { count: 26, speedMin: 1.4, speedMax: 5.2, upward: 1.6, shockwave: false, frame: "heart", life: 1.1, anim: true, impactSprite: false },
      star: { count: 20, speedMin: 1.8, speedMax: 6, upward: 0.8, shockwave: false, frame: "star", life: 0.95, anim: true, impactSprite: true },
      item_pop: { count: 18, speedMin: 1.2, speedMax: 4.8, upward: 1.1, shockwave: false, frame: "star", life: 0.85, anim: true, impactSprite: false },
      trail: { count: 4, speedMin: 0.4, speedMax: 1.6, upward: -0.2, shockwave: false, life: 0.45, anim: true, impactSprite: false }
    }
  };

  const POSE_CLASS = {
    attack: "battle-attack",
    attack2: "battle-attack",
    item_box: "battle-attack",
    hit: "battle-hit",
    hit2: "battle-hit",
    defend: "battle-defend",
    item_heal: "battle-defend",
    item_buff: "battle-buff",
    win: "battle-win",
    faint: "battle-faint",
    taunt: "battle-taunt",
    "duel-ready": "battle-ready"
  };

  let cfg = {
    apiBase: "",
    manifest: DEFAULT_MANIFEST,
    sheetsReady: null,
    images: { sheet: null, sheetAnim: null, impactSheet: null }
  };

  const engines = new WeakMap();

  function safe(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function absUrl(path, apiBase) {
    const p = safe(path);
    if (!p) return "";
    if (/^https?:\/\//i.test(p)) return p;
    const base = safe(apiBase || cfg.apiBase);
    if (p.startsWith("/")) return base ? base + p : p;
    return base ? `${base}/${p}` : p;
  }

  function kindMeta(kind) {
    const key = safe(kind, "coin").toLowerCase();
    return cfg.manifest.projectiles[key] || cfg.manifest.projectiles.coin;
  }

  function projUrl(kind, apiBase) {
    return absUrl(kindMeta(kind).url, apiBase);
  }

  function buildProjUrlMap(apiBase) {
    const out = {};
    for (const [k, v] of Object.entries(cfg.manifest.projectiles || {})) {
      out[k] = absUrl(v.url, apiBase);
    }
    return out;
  }

  function loadManifest(url, apiBase) {
    const src = absUrl(url || "/assets/kojnozrout/fx/fx-manifest.json", apiBase);
    return fetch(src, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.projectiles) cfg.manifest = data;
        return cfg.manifest;
      })
      .catch(() => cfg.manifest);
  }

  function loadImage(url, apiBase) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = absUrl(url, apiBase);
    });
  }

  function loadAllSheets(apiBase) {
    if (cfg.sheetsReady) return cfg.sheetsReady;
    cfg.sheetsReady = loadManifest(undefined, apiBase).then(() =>
      Promise.all([
        loadImage(cfg.manifest.particleSheet?.url, apiBase),
        loadImage(cfg.manifest.particleSheetAnim?.url, apiBase),
        loadImage(cfg.manifest.burstImpactSheet?.url, apiBase)
      ]).then(([sheet, sheetAnim, impactSheet]) => {
        cfg.images = { sheet, sheetAnim, impactSheet };
        return cfg.images;
      })
    );
    return cfg.sheetsReady;
  }

  function init(options = {}) {
    cfg.apiBase = safe(options.apiBase, cfg.apiBase);
    if (options.manifest) cfg.manifest = options.manifest;
    if (options.manifestUrl === false) {
      return loadAllSheets(cfg.apiBase).then(() => api);
    }
    return loadAllSheets(cfg.apiBase).then(() => api);
  }

  class ParticleEngine {
    constructor(hostEl, canvas) {
      this.hostEl = hostEl;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.particles = [];
      this.shockwaves = [];
      this.impactSprites = [];
      this.raf = 0;
      this.running = false;
      this.lastTs = 0;
      this.resize = this.resize.bind(this);
      this.resize();
      if (typeof ResizeObserver !== "undefined") {
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(hostEl);
      } else {
        window.addEventListener("resize", this.resize);
      }
      loadAllSheets(cfg.apiBase);
    }

    resize() {
      const r = this.hostEl.getBoundingClientRect();
      this.canvas.width = Math.max(1, Math.round(r.width));
      this.canvas.height = Math.max(1, Math.round(r.height));
    }

    animSpec() {
      return cfg.manifest.particleSheetAnim || DEFAULT_MANIFEST.particleSheetAnim;
    }

    impactSpec() {
      return cfg.manifest.burstImpactSheet || DEFAULT_MANIFEST.burstImpactSheet;
    }

    kindRow(kind, frameKey) {
      const anim = this.animSpec();
      const kinds = anim.kinds || cfg.manifest.particleSheet.frames || {};
      const key = safe(frameKey || kind, "spark").toLowerCase();
      if (kinds[key] != null) return kinds[key];
      const meta = kindMeta(kind);
      if (meta.sheetFrame != null) return meta.sheetFrame;
      return kinds.spark ?? 0;
    }

    burst(opts = {}) {
      const presetName = safe(opts.preset, kindMeta(opts.kind).burst || "impact");
      const preset = cfg.manifest.bursts[presetName] || cfg.manifest.bursts.impact;
      const host = this.hostEl.getBoundingClientRect();
      const cx = opts.x != null ? opts.x : host.width * (opts.cx ?? 0.5);
      const cy = opts.y != null ? opts.y : host.height * (opts.cy ?? 0.42);
      const accent = opts.accent || "#b46cff";
      const count = opts.count || preset.count || 24;
      const speedMin = preset.speedMin || 1.5;
      const speedMax = preset.speedMax || 6;
      const upward = preset.upward ?? 0.3;
      const anim = this.animSpec();
      const kindKey = safe(preset.frame || opts.kind, "spark").toLowerCase();
      const row = this.kindRow(opts.kind, kindKey);
      const animFps = anim.fps || 14;
      const animCols = anim.cols || 4;

      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - upward - Math.random() * 0.8,
          life: preset.life || 1,
          decay: 0.012 + Math.random() * 0.018,
          size: 10 + Math.random() * 16,
          row,
          animCol: Math.floor(Math.random() * animCols),
          animAge: Math.random() * 0.25,
          animFps,
          animCols,
          useAnim: preset.anim !== false,
          accent
        });
      }

      if (preset.shockwave) {
        this.shockwaves.push({
          x: cx,
          y: cy,
          r: 0,
          max: Math.min(host.width, host.height) * 0.22,
          alpha: 0.42,
          color: accent
        });
      }

      if (preset.impactSprite) {
        this.spawnImpactSprite(cx, cy, accent);
      }

      this.startLoop();
    }

    spawnImpactSprite(x, y, accent) {
      const spec = this.impactSpec();
      this.impactSprites.push({
        x,
        y,
        frame: 0,
        maxFrame: spec.frameCount || 16,
        cols: spec.cols || 4,
        fw: spec.frameWidth || 64,
        fh: spec.frameHeight || 64,
        fps: spec.fps || 28,
        age: 0,
        size: 72 + Math.random() * 24,
        accent
      });
      this.startLoop();
    }

    startLoop() {
      if (!this.running) {
        this.running = true;
        this.lastTs = performance.now();
        this.raf = requestAnimationFrame((ts) => this.tick(ts));
      }
    }

    drawParticle(ctx, p, alpha) {
      const images = cfg.images;
      const anim = this.animSpec();
      const fw = anim.frameWidth || 48;
      const fh = anim.frameHeight || fw;

      if (p.useAnim && images.sheetAnim) {
        const col = p.animCol % (anim.cols || 4);
        const row = p.row || 0;
        ctx.drawImage(
          images.sheetAnim,
          col * fw,
          row * fh,
          fw,
          fh,
          -p.size / 2,
          -p.size / 2,
          p.size,
          p.size
        );
        return;
      }
      if (images.sheet) {
        const frame = p.row ?? 0;
        ctx.drawImage(
          images.sheet,
          frame * fw,
          0,
          fw,
          fh,
          -p.size / 2,
          -p.size / 2,
          p.size,
          p.size
        );
        return;
      }
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    tick(ts) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const dt = Math.min(0.05, (ts - (this.lastTs || ts)) / 1000);
      this.lastTs = ts;
      ctx.clearRect(0, 0, w, h);

      for (let i = this.shockwaves.length - 1; i >= 0; i -= 1) {
        const s = this.shockwaves[i];
        s.r += Math.max(2, s.max * 0.06);
        s.alpha *= 0.92;
        if (s.alpha < 0.03 || s.r > s.max) {
          this.shockwaves.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const impactImg = cfg.images.impactSheet;
      for (let i = this.impactSprites.length - 1; i >= 0; i -= 1) {
        const s = this.impactSprites[i];
        s.age += dt;
        s.frame = Math.min(s.maxFrame - 1, Math.floor(s.age * s.fps));
        if (s.age >= s.maxFrame / s.fps) {
          this.impactSprites.splice(i, 1);
          continue;
        }
        if (!impactImg) continue;
        const col = s.frame % s.cols;
        const row = Math.floor(s.frame / s.cols);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - s.age / (s.maxFrame / s.fps));
        ctx.translate(s.x, s.y);
        ctx.drawImage(
          impactImg,
          col * s.fw,
          row * s.fh,
          s.fw,
          s.fh,
          -s.size / 2,
          -s.size / 2,
          s.size,
          s.size
        );
        ctx.restore();
      }

      for (let i = this.particles.length - 1; i >= 0; i -= 1) {
        const p = this.particles[i];
        p.x += p.vx * (dt * 60);
        p.y += p.vy * (dt * 60);
        p.vy += 0.06 * (dt * 60);
        p.vx *= Math.pow(0.98, dt * 60);
        p.life -= p.decay;
        p.rot += p.spin || 0;
        if (p.useAnim) {
          p.animAge += dt;
          p.animCol = Math.floor(p.animAge * (p.animFps || 14)) % (p.animCols || 4);
        }
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        const alpha = Math.max(0, p.life);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        this.drawParticle(ctx, p, alpha);
        ctx.restore();
      }

      if (this.particles.length || this.shockwaves.length || this.impactSprites.length) {
        this.raf = requestAnimationFrame((t) => this.tick(t));
      } else {
        this.running = false;
        this.raf = 0;
      }
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.ro) this.ro.disconnect();
      else window.removeEventListener("resize", this.resize);
    }
  }

  function ensureEngine(hostEl) {
    if (!hostEl) return null;
    if (engines.has(hostEl)) return engines.get(hostEl);
    hostEl.classList.add("mia-fx-host");
    let canvas = hostEl.querySelector(".mia-fx-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "mia-fx-canvas";
      hostEl.appendChild(canvas);
    }
    const engine = new ParticleEngine(hostEl, canvas);
    engines.set(hostEl, engine);
    return engine;
  }

  function spawnScreenFlash(hostEl, x, y, accent, apiBase) {
    if (!hostEl) return;
    let flash = hostEl.querySelector(".mia-fx-flash");
    if (!flash) {
      flash = document.createElement("div");
      flash.className = "mia-fx-flash";
      hostEl.insertBefore(flash, hostEl.firstChild);
    }
    const rect = hostEl.getBoundingClientRect();
    const px = x != null ? (x / rect.width) * 100 : 50;
    const py = y != null ? (y / rect.height) * 100 : 42;
    flash.style.setProperty("--flash-x", `${px}%`);
    flash.style.setProperty("--flash-y", `${py}%`);
    if (accent) flash.style.setProperty("--flash-color", `radial-gradient(circle at ${px}% ${py}%, ${accent}55, transparent 58%)`);
    flash.classList.add("on");
    setTimeout(() => flash.classList.remove("on"), 160);
  }

  function spawnBurst(hostEl, opts = {}) {
    const engine = ensureEngine(hostEl);
    if (!engine) return;
    engine.burst(opts);
  }

  function poseClass(pose) {
    return POSE_CLASS[safe(pose).toLowerCase()] || "battle-ready";
  }

  function resolveProjectileKind(source = {}) {
    if (source?.effect?.projectile) return safe(source.effect.projectile, "coin");
    if (source?.projectile) return safe(source.projectile, "coin");
    return "coin";
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  function animateProjectileFlight(el, x0, y0, x1, y1, durationMs, onSample, onDone) {
    el.classList.add("mia-fx-raf");
    el.style.animation = "none";
    el.style.left = `${x0}px`;
    el.style.top = `${y0}px`;
    const start = performance.now();
    const arc = Math.min(48, Math.abs(x1 - x0) * 0.14 + Math.abs(y1 - y0) * 0.08);
    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const e = easeOutCubic(t);
      const w = easeInOutSine(t);
      const x = x0 + (x1 - x0) * e;
      const y = y0 + (y1 - y0) * e - Math.sin(Math.PI * w) * arc;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = `translate(-50%, -50%) rotate(${e * 300}deg) scale(${0.68 + e * 0.18})`;
      if (onSample) onSample(t, x, y);
      if (t < 1) requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    requestAnimationFrame(frame);
  }

  function parsePctPair(xVal, yVal, fallbackX, fallbackY) {
    const parse = (v, fb) => {
      const raw = safe(v) || fb;
      const m = String(raw).match(/([\d.]+)%/);
      return m ? Number(m[1]) / 100 : Number(raw) || 0;
    };
    return { x: parse(xVal, fallbackX), y: parse(yVal, fallbackY) };
  }

  function animateItemFly(el, layer, fromPct, toPct, durationMs, onArrive, onDone) {
    if (!el || !layer) return;
    const rect = layer.getBoundingClientRect();
    const x0 = rect.width * fromPct.x;
    const y0 = rect.height * fromPct.y;
    const x1 = rect.width * toPct.x;
    const y1 = rect.height * toPct.y;
    el.classList.add("mia-fx-raf");
    el.style.animation = "none";
    el.style.opacity = "0";
    const start = performance.now();
    const arc = Math.min(36, Math.abs(x1 - x0) * 0.12 + Math.abs(y1 - y0) * 0.1);
    let arrived = false;
    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const e = easeOutCubic(t);
      const w = easeInOutSine(t);
      const x = x0 + (x1 - x0) * e;
      const y = y0 + (y1 - y0) * e - Math.sin(Math.PI * w) * arc;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      const scale = 0.42 + Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.58;
      el.style.opacity = String(Math.min(1, t * 2.4));
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      if (!arrived && t >= 0.82) {
        arrived = true;
        if (onArrive) onArrive(x, y);
      }
      if (t < 1) requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    requestAnimationFrame(frame);
  }

  function mountProjectileEl(fxHost, kind, accent, apiBase) {
    const el = document.createElement("div");
    el.className = "battle-projectile mia-fx-trail";
    const key = safe(kind, "coin").toLowerCase();
    const src = projUrl(key, apiBase);
    const img = document.createElement("img");
    img.src = src;
    img.alt = key;
    img.onerror = () => el.remove();
    el.appendChild(img);
    if (accent) el.style.setProperty("--proj-accent", accent);
    el.style.setProperty("--mia-fx-rot", `${240 + Math.floor(Math.random() * 80)}deg`);
    fxHost.appendChild(el);
    return el;
  }

  function spawnProjectileAt(fxHost, x0, y0, x1, y1, kind, accent, apiBase) {
    if (!fxHost) return;
    const key = safe(kind, "coin").toLowerCase();
    const el = mountProjectileEl(fxHost, key, accent, apiBase);
    const engine = ensureEngine(fxHost);
    let lastTrailT = 0;
    const durationMs = 920;

    animateProjectileFlight(
      el,
      x0,
      y0,
      x1,
      y1,
      durationMs,
      (t, x, y) => {
        if (!engine || t - lastTrailT < 0.09) return;
        lastTrailT = t;
        engine.burst({
          x,
          y,
          preset: "trail",
          kind: key,
          count: 2,
          accent: accent || "#c4b5fd"
        });
      },
      () => {
        const preset = kindMeta(key).burst || "impact";
        spawnBurst(fxHost, { x: x1, y: y1, preset, kind: key, accent: accent || "#ff8060" });
        spawnScreenFlash(fxHost, x1, y1, accent || "#ffffff", apiBase);
        setTimeout(() => el.remove(), 80);
      }
    );
  }

  function spawnDuelItemBurst(fxHost, kind, accent, apiBase, side) {
    if (!fxHost) return;
    const stage = fxHost.getBoundingClientRect();
    const fromLocal = side !== "opponent";
    const x0 = stage.width * (fromLocal ? 0.26 : 0.74);
    const x1 = stage.width * (fromLocal ? 0.74 : 0.26);
    const y = stage.height * 0.38;
    spawnProjectileAt(fxHost, x0, y, x1, y, kind, accent, apiBase);
  }

  function spawnProjectile(fxHost, fromEl, toEl, kind, accent, apiBase) {
    if (!fxHost || !fromEl || !toEl) return;
    const stage = fxHost.getBoundingClientRect();
    const from = fromEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();
    const x0 = from.left + from.width * 0.5 - stage.left;
    const y0 = from.top + from.height * 0.35 - stage.top;
    const x1 = to.left + to.width * 0.5 - stage.left;
    const y1 = to.top + to.height * 0.35 - stage.top;
    spawnProjectileAt(fxHost, x0, y0, x1, y1, kind, accent, apiBase);
  }

  function spawnDamageNumber(fxHost, targetEl, amount, accent) {
    if (!fxHost || !targetEl) return;
    const stage = fxHost.getBoundingClientRect();
    const rect = targetEl.getBoundingClientRect();
    const el = document.createElement("div");
    el.className = "battle-damage";
    el.textContent = `-${Math.max(1, Math.round(Number(amount) || 8))}`;
    if (accent) el.style.color = accent;
    el.style.left = rect.left + rect.width * 0.5 - stage.left + "px";
    el.style.top = rect.top + rect.height * 0.2 - stage.top + "px";
    fxHost.appendChild(el);
    const cx = rect.left + rect.width * 0.5 - stage.left;
    const cy = rect.top + rect.height * 0.25 - stage.top;
    spawnBurst(fxHost, { x: cx, y: cy, preset: "impact", kind: "spark", accent: accent || "#ff6b4a", count: 14 });
    setTimeout(() => el.remove(), 1100);
  }

  function applyFighterPose(el, pose, role) {
    if (!el) return;
    el.classList.remove(
      "battle-attack",
      "battle-hit",
      "battle-defend",
      "battle-buff",
      "battle-win",
      "battle-faint",
      "battle-ready",
      "battle-taunt",
      "lunge-left",
      "lunge-right",
      "shake",
      "winner"
    );
    const cls = poseClass(pose);
    el.classList.add(cls);
    if (role === "attacker" && (pose === "attack" || pose === "attack2" || pose === "item_box")) {
      el.classList.add(el.classList.contains("right") ? "lunge-right" : "lunge-left");
    }
    if (role === "target" && (pose === "hit" || pose === "hit2")) {
      el.classList.add("shake");
    }
    if (pose === "win") el.classList.add("winner");
  }

  function playItemUse(hostEl, opts = {}) {
    const layer = hostEl || document.getElementById("itemFxLayer");
    if (!layer) return;
    const itemId = safe(opts.itemId);
    const apiBase = opts.apiBase || cfg.apiBase;
    const itemsBase = cfg.manifest.items?.base || "/assets/kojnozrout/items/";
    const itemsVer = cfg.manifest.items?.ver || "v=4";

    if (itemId) {
      const el = document.createElement("div");
      el.className = "item-fx";
      const img = document.createElement("img");
      img.src = absUrl(`${itemsBase}${itemId}.png?${itemsVer}`, apiBase);
      img.alt = itemId;
      img.onerror = () => el.remove();
      el.appendChild(img);
      layer.appendChild(el);
      const from = parsePctPair(opts.fromX, opts.fromY, "18%", "22%");
      const to = parsePctPair(opts.toX, opts.toY, "58%", "52%");
      animateItemFly(
        el,
        layer,
        from,
        to,
        1040,
        (x, y) => {
          spawnBurst(layer, {
            x,
            y,
            preset: "item_pop",
            kind: opts.projectile || "star",
            accent: opts.accent || "#b46cff"
          });
          el.classList.add("pop");
        },
        () => setTimeout(() => el.remove(), 420)
      );
    }

    if (opts.duelProjectile) {
      const key = safe(opts.duelProjectile, "orb").toLowerCase();
      const el = document.createElement("div");
      el.className = "duel-proj-fx";
      const img = document.createElement("img");
      img.src = projUrl(key, apiBase);
      img.alt = key;
      img.onerror = () => el.remove();
      el.appendChild(img);
      layer.appendChild(el);
      const from = parsePctPair(opts.fromX, opts.fromY, "58%", "52%");
      const to = parsePctPair("82%", "28%", "82%", "28%");
      animateItemFly(
        el,
        layer,
        from,
        to,
        880,
        (x, y) => {
          spawnBurst(layer, {
            x,
            y,
            preset: kindMeta(key).burst,
            kind: key,
            accent: opts.accent || "#ff5ab4"
          });
        },
        () => setTimeout(() => el.remove(), 120)
      );
    }
  }

  const api = {
    init,
    manifest: () => cfg.manifest,
    poseClass,
    resolveProjectileKind,
    spawnProjectile,
    spawnProjectileAt,
    spawnDuelItemBurst,
    spawnDamageNumber,
    spawnBurst,
    spawnScreenFlash,
    playItemUse,
    applyFighterPose,
    ensureEngine,
    projUrl,
    buildProjUrlMap,
    get PROJ_URL() {
      return buildProjUrlMap(cfg.apiBase);
    },
    get PROJ_BASE() {
      return "/assets/kojnozrout/fx/projectiles/";
    },
    get PROJ_VER() {
      return "?v=4";
    },
    PROJ: {}
  };

  if (typeof document !== "undefined") {
    init({ manifestUrl: "/assets/kojnozrout/fx/fx-manifest.json" }).catch(() => {});
  }

  return api;
});
