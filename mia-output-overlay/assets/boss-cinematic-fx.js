(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.MIA_BOSS_CINEMATIC_FX = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function hexToRgb(hex) {
    const raw = String(hex || "#ff6040").replace("#", "");
    const full =
      raw.length === 3
        ? raw
            .split("")
            .map((c) => c + c)
            .join("")
        : raw.padStart(6, "0").slice(0, 6);
    const n = parseInt(full, 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255
    };
  }

  function rgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function createEngine(canvas) {
    const ctx = canvas.getContext("2d");
    let particles = [];
    let shockwaves = [];
    let sparks = [];
    let raf = 0;
    let running = false;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function burst(options = {}) {
      const accent = options.accent || "#ff6040";
      const count = options.count || 160;
      const cx = canvas.width * (options.cx ?? 0.5);
      const cy = canvas.height * (options.cy ?? 0.42);
      const isLegend = Boolean(options.isLegend);

      particles = [];
      sparks = [];

      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.55;
        const speed = 1.8 + Math.random() * (isLegend ? 7.2 : 5.8);
        const kind = Math.random() < (isLegend ? 0.28 : 0.16) ? "star" : "dot";
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (isLegend ? 1.6 : 1.1),
          life: 1,
          decay: 0.008 + Math.random() * 0.016,
          size: kind === "star" ? 3 + Math.random() * 5 : 1.5 + Math.random() * 3.5,
          kind,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.18,
          color: accent
        });
      }

      for (let i = 0; i < (isLegend ? 36 : 24); i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 10;
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.018 + Math.random() * 0.02,
          len: 8 + Math.random() * 18,
          color: accent
        });
      }

      shockwaves = [
        { x: cx, y: cy, r: 0, max: Math.min(canvas.width, canvas.height) * 0.42, alpha: 0.55, color: accent },
        { x: cx, y: cy, r: 0, max: Math.min(canvas.width, canvas.height) * 0.28, alpha: 0.38, color: "#ffffff", delay: 6 }
      ];

      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    }

    function drawStar(x, y, radius, rot, color, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const b = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        ctx.lineTo(Math.cos(b) * (radius * 0.42), Math.sin(b) * (radius * 0.42));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const wave of shockwaves) {
        if (wave.delay > 0) {
          wave.delay -= 1;
          continue;
        }
        wave.r += Math.max(4, wave.max * 0.028);
        const fade = 1 - wave.r / wave.max;
        if (fade <= 0) continue;
        ctx.globalAlpha = wave.alpha * fade;
        ctx.strokeStyle = rgba(wave.color, 0.85);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      shockwaves = shockwaves.filter((w) => w.r < w.max);

      for (const s of sparks) {
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.life -= s.decay;
        if (s.life <= 0) continue;
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 1.6, s.y - s.vy * 1.6);
        ctx.stroke();
      }
      sparks = sparks.filter((s) => s.life > 0);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035;
        p.vx *= 0.992;
        p.life -= p.decay;
        p.rot += p.spin;
        if (p.life <= 0) continue;
        const alpha = Math.max(0, p.life);
        if (p.kind === "star") {
          drawStar(p.x, p.y, p.size, p.rot, p.color, alpha);
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      particles = particles.filter((p) => p.life > 0);
      ctx.globalAlpha = 1;

      if (particles.length || sparks.length || shockwaves.length) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      particles = [];
      sparks = [];
      shockwaves = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    resize();
    return { resize, burst, stop };
  }

  return { createEngine, hexToRgb, rgba };
});
