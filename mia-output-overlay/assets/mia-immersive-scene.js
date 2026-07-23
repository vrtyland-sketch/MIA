(function (global) {
  "use strict";

  const POLL_MS = 400;
  const OVERLAY_URL = "/overlay-state";
  const MATTE_URL = "/mia/scene/matte-state";

  let scene = null;
  let matte = null;
  let matteImage = null;
  let matteImageUrl = "";
  let t0 = performance.now();

  function drawStarfield(ctx, w, h, speed, phase) {
    ctx.fillStyle = scene?.backdrop || "#050814";
    ctx.fillRect(0, 0, w, h);
    const count = 120;
    for (let i = 0; i < count; i += 1) {
      const seed = i * 9973;
      const bx = (seed % 1000) / 1000;
      const by = ((seed * 3) % 1000) / 1000;
      const depth = 0.3 + ((seed % 7) / 10);
      const x = ((bx + phase * speed * depth) % 1) * w;
      const y = by * h * 0.85;
      const r = 0.6 + depth * 1.4;
      ctx.fillStyle = `rgba(220,235,255,${0.25 + depth * 0.55})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWindow(ctx, win, w, h, phase) {
    const x = win.x * w;
    const y = win.y * h;
    const ww = win.w * w;
    const wh = win.h * h;
    ctx.save();
    ctx.strokeStyle = "rgba(120,180,255,0.35)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(8,16,32,0.55)";
    ctx.fillRect(x, y, ww, wh);
    ctx.strokeRect(x, y, ww, wh);

    if (win.layer === "planet_pass") {
      const px = x + ww * 0.65 + Math.sin(phase * 0.4) * 12;
      const py = y + wh * 0.55;
      const pr = Math.min(ww, wh) * 0.22;
      const grad = ctx.createRadialGradient(px, py, pr * 0.1, px, py, pr);
      grad.addColorStop(0, "#8ec5ff");
      grad.addColorStop(0.6, "#3a6ea5");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    } else if (win.layer === "nebula_slow") {
      const grad = ctx.createLinearGradient(x, y, x + ww, y + wh);
      grad.addColorStop(0, "rgba(120,40,180,0.25)");
      grad.addColorStop(0.5, "rgba(40,120,220,0.18)");
      grad.addColorStop(1, "rgba(255,120,180,0.12)");
      ctx.fillStyle = grad;
      ctx.fillRect(x + 4, y + 4, ww - 8, wh - 8);
    } else if (win.layer === "warp_streaks") {
      ctx.strokeStyle = "rgba(180,220,255,0.35)";
      for (let i = 0; i < 18; i += 1) {
        const sx = x + ((i * 47 + phase * 120) % ww);
        ctx.beginPath();
        ctx.moveTo(sx, y + wh);
        ctx.lineTo(sx + 8, y);
        ctx.stroke();
      }
    } else if (win.layer === "arena_grid") {
      ctx.strokeStyle = "rgba(255,64,160,0.25)";
      const step = 24;
      for (let gx = x; gx < x + ww; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + wh);
        ctx.stroke();
      }
      for (let gy = y; gy < y + wh; gy += step) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + ww, gy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawMattePlaceholder(ctx, x, y, sw, sh, creature) {
    ctx.save();
    if (creature?.params) {
      const [r, g, b] = creature.params.skinTint || [38, 120, 88];
      const [er, eg, eb] = creature.params.edgeGlow || [0, 255, 180];
      const grad = ctx.createLinearGradient(x, y, x + sw, y + sh);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
      grad.addColorStop(1, `rgba(${Math.round(r * 0.5)},${Math.round(g * 0.5)},${Math.round(b * 0.5)},0.9)`);
      ctx.fillStyle = grad;
      ctx.shadowColor = `rgba(${er},${eg},${eb},0.75)`;
      ctx.shadowBlur = 18 + (creature.params.plateStrength || 0.5) * 24;
    } else {
      ctx.fillStyle = "rgba(40,180,120,0.18)";
    }
    ctx.fillRect(x, y, sw, sh);
    ctx.strokeStyle = creature ? "rgba(0,255,180,0.55)" : "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, sw, sh);
    ctx.restore();
  }

  function drawStreamerSlot(ctx, w, h) {
    const slot = scene?.streamerSlot || { x: 0.32, y: 0.22, w: 0.36, h: 0.62 };
    const x = slot.x * w;
    const y = slot.y * h;
    const sw = slot.w * w;
    const sh = slot.h * h;
    const creature = scene?.creature;

    if (matte?.active && matteImage && matteImage.complete && matteImage.naturalWidth > 0) {
      ctx.save();
      const scale = Math.min(sw / matteImage.naturalWidth, sh / matteImage.naturalHeight);
      const dw = matteImage.naturalWidth * scale;
      const dh = matteImage.naturalHeight * scale;
      const dx = x + (sw - dw) / 2;
      const dy = y + (sh - dh) / 2;
      if (creature?.params) {
        ctx.shadowColor = `rgba(${creature.params.edgeGlow?.[0] || 0},${creature.params.edgeGlow?.[1] || 255},${creature.params.edgeGlow?.[2] || 180},0.65)`;
        ctx.shadowBlur = 16;
      }
      ctx.drawImage(matteImage, dx, dy, dw, dh);
      ctx.restore();
      return;
    }

    drawMattePlaceholder(ctx, x, y, sw, sh, creature);
  }

  function renderFrame(canvas, ctx) {
    const w = canvas.width;
    const h = canvas.height;
    const phase = (performance.now() - t0) / 1000;
    const speed = scene?.parallaxSpeed ?? 0.2;
    ctx.clearRect(0, 0, w, h);
    if (!scene?.active) return;

    drawStarfield(ctx, w, h, speed, phase);
    for (const win of scene.windows || []) {
      drawWindow(ctx, win, w, h, phase);
    }
    drawStreamerSlot(ctx, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "600 14px Segoe UI, system-ui, sans-serif";
    ctx.fillText(scene.environmentLabel || scene.environmentId || "Immersive", 16, 28);
    if (scene.mode === "combat" && scene.creature?.label) {
      ctx.fillStyle = "rgba(255,120,180,0.9)";
      ctx.fillText(scene.creature.label, 16, 48);
    }
    const bossMission = global.__miaBossMissionSnapshot;
    if (bossMission?.active && bossMission.title) {
      ctx.fillStyle = "rgba(255,210,96,0.95)";
      ctx.font = "700 18px Segoe UI, system-ui, sans-serif";
      ctx.fillText(bossMission.title, 16, bossMission.subtitle ? 74 : 68);
      if (bossMission.subtitle) {
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.font = "500 12px Segoe UI, system-ui, sans-serif";
        ctx.fillText(bossMission.subtitle, 16, 92);
      }
    }
    if (matte?.active) {
      ctx.fillStyle = "rgba(120,220,255,0.85)";
      ctx.fillText(`Matte ${matte.cameraId || ""} · ${matte.activeCameraCount || 1} cam`, 16, 68);
    }
  }

  function syncMatteImage() {
    const url = matte?.matteDataUrl || "";
    if (!url || url === matteImageUrl) return;
    matteImageUrl = url;
    const img = new Image();
    img.onload = () => {
      matteImage = img;
    };
    img.src = url;
  }

  async function pollOverlay() {
    try {
      const res = await fetch(OVERLAY_URL, { cache: "no-store" });
      const data = await res.json();
      scene = data?.immersiveScene || null;
      global.__miaBossMissionSnapshot = data?.bossMission || null;
      const root = document.getElementById("root");
      if (root) root.classList.toggle("visible", !!scene?.active);
    } catch (_err) {
      scene = null;
    }
  }

  async function pollMatte() {
    try {
      const res = await fetch(MATTE_URL, { cache: "no-store" });
      matte = await res.json();
      syncMatteImage();
    } catch (_err) {
      matte = null;
    }
  }

  function boot() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      canvas.width = Math.round(global.innerWidth * dpr);
      canvas.height = Math.round(global.innerHeight * dpr);
      canvas.style.width = `${global.innerWidth}px`;
      canvas.style.height = `${global.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    global.addEventListener("resize", resize);

    function loop() {
      renderFrame(canvas, ctx);
      requestAnimationFrame(loop);
    }
    loop();

    pollOverlay();
    pollMatte();
    setInterval(pollOverlay, POLL_MS);
    setInterval(pollMatte, POLL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
