/**
 * MiaTechEnergy — stream FX: sharp sparks, electrons, ember flecks, rare arcs.
 * Tuned for dark TikTok portrait readability (v32 gfx-whole) — purple-tech sparks, not soft pastel glow pads.
 */
(function (global) {
  "use strict";

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function create(opts) {
    const host = opts && opts.host;
    if (!host) return null;

    let canvas = opts.canvas || host.querySelector("canvas.tech-fx-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "tech-fx-canvas";
      canvas.setAttribute("aria-hidden", "true");
      host.appendChild(canvas);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const density = clamp(Number(opts.density) || 1, 0.35, 1.6);
    const speakingFn = typeof opts.isSpeaking === "function" ? opts.isSpeaking : () => false;
    const hypeFn = typeof opts.isHype === "function" ? opts.isHype : () => false;
    const hotspots = Array.isArray(opts.hotspots) ? opts.hotspots.slice() : [
      { x: 0.52, y: 0.22, w: 0.18, h: 0.14 }, // eye / face
      { x: 0.5, y: 0.58, w: 0.28, h: 0.2 }     // belly / core
    ];

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let running = false;
    const sparks = [];
    const electrons = [];
    const embers = [];
    let arcs = [];
    let nextArcAt = 0;

    function resize() {
      const rect = host.getBoundingClientRect();
      dpr = Math.min(2, global.devicePixelRatio || 1);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pickHotspot() {
      return hotspots[(Math.random() * hotspots.length) | 0] || { x: 0.5, y: 0.5, w: 0.2, h: 0.2 };
    }

    function spawnSpark(boost) {
      const hs = pickHotspot();
      const x = (hs.x + (Math.random() - 0.5) * hs.w) * w;
      const y = (hs.y + (Math.random() - 0.5) * hs.h) * h;
      const ang = Math.random() * Math.PI * 2;
      const spd = (40 + Math.random() * 90) * (boost ? 1.35 : 1);
      sparks.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 20,
        life: 0.28 + Math.random() * 0.45,
        age: 0,
        r: 0.6 + Math.random() * 1.4,
        cold: Math.random() > 0.35
      });
    }

    function spawnElectron() {
      const hs = pickHotspot();
      electrons.push({
        x: (hs.x + (Math.random() - 0.5) * hs.w) * w,
        y: (hs.y + (Math.random() - 0.5) * hs.h) * h,
        vx: (Math.random() - 0.5) * 28,
        vy: -12 - Math.random() * 36,
        life: 1.1 + Math.random() * 1.4,
        age: 0,
        r: 1.1 + Math.random() * 1.2
      });
    }

    function spawnEmber(boost) {
      const hs = hotspots[1] || pickHotspot();
      embers.push({
        x: (hs.x + (Math.random() - 0.5) * hs.w * 0.8) * w,
        y: (hs.y + (Math.random() - 0.35) * hs.h) * h,
        vx: (Math.random() - 0.5) * 18,
        vy: -20 - Math.random() * 40,
        life: 0.5 + Math.random() * 0.7,
        age: 0,
        r: 0.8 + Math.random() * 1.6,
        boost: !!boost
      });
    }

    function spawnArc(boost) {
      const hs = pickHotspot();
      const x0 = (hs.x - hs.w * 0.35) * w;
      const y0 = (hs.y - hs.h * 0.2) * h;
      const x1 = (hs.x + hs.w * 0.4) * w;
      const y1 = (hs.y + hs.h * 0.35) * h;
      const mid = 2 + ((Math.random() * 3) | 0);
      const pts = [{ x: x0, y: y0 }];
      for (let i = 1; i <= mid; i++) {
        const t = i / (mid + 1);
        pts.push({
          x: x0 + (x1 - x0) * t + (Math.random() - 0.5) * 18,
          y: y0 + (y1 - y0) * t + (Math.random() - 0.5) * 14
        });
      }
      pts.push({ x: x1, y: y1 });
      arcs.push({
        pts,
        age: 0,
        life: boost ? 0.22 : 0.14,
        alpha: boost ? 0.55 : 0.38
      });
    }

    function tick(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      const speaking = speakingFn();
      const hype = hypeFn();
      const boost = speaking || hype;
      const rate = density * (speaking ? 1.45 : 0.85) * (hype ? 1.28 : 1);

      if (Math.random() < dt * 4.2 * rate) spawnSpark(boost);
      if (Math.random() < dt * 1.6 * rate) spawnElectron();
      if (Math.random() < dt * 1.1 * rate) spawnEmber(boost);
      if (now >= nextArcAt) {
        spawnArc(boost);
        nextArcAt = now + (boost ? 1900 : 4800) + Math.random() * 3500;
      }

      ctx.clearRect(0, 0, w, h);

      // faint scan tick
      const scanY = ((now / 2800) % 1.2) * h;
      ctx.fillStyle = "rgba(140,200,255,0.045)";
      ctx.fillRect(0, scanY, w, 2);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.age += dt;
        if (p.age >= p.life) {
          sparks.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt;
        const a = 1 - p.age / p.life;
        ctx.beginPath();
        ctx.fillStyle = p.cold
          ? `rgba(210,235,255,${0.72 * a})`
          : `rgba(255,200,120,${0.68 * a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.cold && a > 0.45) {
          ctx.fillStyle = `rgba(230,245,255,${0.45 * a})`;
          ctx.fillRect(p.x - p.r * 1.6, p.y - 0.4, p.r * 3.2, 0.9);
        }
      }

      for (let i = electrons.length - 1; i >= 0; i--) {
        const p = electrons[i];
        p.age += dt;
        if (p.age >= p.life) {
          electrons.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = Math.sin((p.age / p.life) * Math.PI);
        ctx.beginPath();
        ctx.fillStyle = `rgba(170,150,255,${0.58 * a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = `rgba(140,220,255,${0.38 * a})`;
        ctx.lineWidth = 1.15;
        ctx.moveTo(p.x - 3, p.y);
        ctx.lineTo(p.x + 3, p.y);
        ctx.stroke();
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const p = embers[i];
        p.age += dt;
        if (p.age >= p.life) {
          embers.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = 1 - p.age / p.life;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,${120 + (p.boost ? 40 : 0)},60,${0.4 * a})`;
        ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        arc.age += dt;
        if (arc.age >= arc.life) {
          arcs.splice(i, 1);
          continue;
        }
        const a = (1 - arc.age / arc.life) * arc.alpha;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(190,220,255,${a})`;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = `rgba(140,180,255,${a * 0.5})`;
        ctx.shadowBlur = 4;
        const pts = arc.pts;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // cap particle counts
      if (sparks.length > 48) sparks.splice(0, sparks.length - 48);
      if (electrons.length > 24) electrons.splice(0, electrons.length - 24);
      if (embers.length > 20) embers.splice(0, embers.length - 20);

      raf = global.requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      last = performance.now();
      nextArcAt = last + 1800;
      raf = global.requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      if (raf) global.cancelAnimationFrame(raf);
      raf = 0;
      ctx.clearRect(0, 0, w, h);
    }

    function setHotspots(next) {
      if (Array.isArray(next) && next.length) {
        hotspots.length = 0;
        for (const hspot of next) hotspots.push(hspot);
      }
    }

    const onResize = () => resize();
    global.addEventListener("resize", onResize);

    start();

    return {
      canvas,
      start,
      stop,
      resize,
      setHotspots,
      destroy() {
        stop();
        global.removeEventListener("resize", onResize);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  global.MiaTechEnergy = { create };
})(typeof window !== "undefined" ? window : globalThis);
