/**
 * Koj continuous live motion — drives MiaPartRig joints primarily.
 * Root: subtle weight shift. Head: independent yaw/nod.
 * Whole-sprite squash is intentionally tiny (not “breathing life”).
 * Shared timing language with MiaHoloMotion.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.KojLiveMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TICK_MS = 36;
  /** Readable on phone; life comes from head joints, not squash amp */
  const LIVE_AMP = 2.4;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    const x = clamp(t, 0, 1);
    return 1 - Math.pow(1 - x, 3);
  }

  /**
   * @param {object} opts
   * @param {HTMLElement} [opts.el] — fallback single-element target (root)
   * @param {object} [opts.rig] — MiaPartRig instance (root / body / head)
   * @param {() => boolean} [opts.isSpeaking]
   * @param {() => boolean} [opts.isEnabled]
   * @param {() => void} [opts.onTick] — e.g. belly layout sync each frame
   */
  function create(opts) {
    const el = opts && opts.el;
    const rig = opts && opts.rig;
    const onTick = typeof opts?.onTick === "function" ? opts.onTick : null;
    if (!el && !rig) {
      return { start() {}, stop() {}, setSpeaking() {}, pulse() {}, destroy() {} };
    }

    const isSpeaking = typeof opts.isSpeaking === "function" ? opts.isSpeaking : () => false;
    const isHype =
      typeof opts.isHype === "function"
        ? opts.isHype
        : () => false;
    const isEnabled = typeof opts.isEnabled === "function" ? opts.isEnabled : () => true;

    const phase = {
      breath: Math.random() * Math.PI * 2,
      weight: Math.random() * Math.PI * 2,
      sway: Math.random() * Math.PI * 2,
      nod: Math.random() * Math.PI * 2,
      yaw: Math.random() * Math.PI * 2
    };

    let speakAmp = 0;
    let speakTarget = 0;
    let speakRampFrom = 0;
    let speakRampAt = 0;
    const SPEAK_RAMP_MS = 480;

    let pulse = { y: 0, sx: 0, sy: 0, headYaw: 0, until: 0 };
    let timer = null;
    let running = false;

    function samplePulse(now) {
      if (now >= pulse.until) {
        pulse.y *= 0.78;
        pulse.sx *= 0.78;
        pulse.sy *= 0.78;
        pulse.headYaw *= 0.78;
        if (Math.abs(pulse.y) < 0.01) pulse.y = 0;
        if (Math.abs(pulse.sx) < 0.001) pulse.sx = 0;
        if (Math.abs(pulse.sy) < 0.001) pulse.sy = 0;
        if (Math.abs(pulse.headYaw) < 0.01) pulse.headYaw = 0;
        return pulse;
      }
      const life = clamp((pulse.until - now) / 420, 0, 1);
      const k = Math.sin((1 - life) * Math.PI);
      return {
        y: pulse.y * k,
        sx: pulse.sx * k,
        sy: pulse.sy * k,
        headYaw: pulse.headYaw * k
      };
    }

    function updateSpeakAmp(now) {
      const want = isSpeaking() ? 1 : 0;
      if (want !== speakTarget) {
        speakRampFrom = speakAmp;
        speakTarget = want;
        speakRampAt = now;
      }
      const u = clamp((now - speakRampAt) / SPEAK_RAMP_MS, 0, 1);
      speakAmp = lerp(speakRampFrom, speakTarget, easeOutCubic(u));
    }

    function clearFallback() {
      if (el && el.style.transform) el.style.transform = "";
      if (rig) {
        rig.setLocal("root", { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
        if (rig.getPart("body")) {
          rig.setLocal("body", { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
        }
        if (rig.getPart("head")) {
          rig.setLocal("head", { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
        }
        rig.update();
      }
    }

    function tick() {
      if (!running) return;
      const now = performance.now();

      if (!isEnabled()) {
        clearFallback();
        if (onTick) onTick();
        return;
      }

      updateSpeakAmp(now);
      const t = now / 1000;
      const s = speakAmp;
      const hype = isHype() ? 1 : 0;
      const A = LIVE_AMP * lerp(1, 1.14, hype);

      const breath = Math.sin(t * 1.08 + phase.breath);
      const weight = Math.sin(t * 0.34 + phase.weight);
      const swayA = Math.sin(t * 0.46 + phase.sway);
      const swayB = Math.sin(t * 0.9 + phase.sway * 1.25);
      const nodWave =
        Math.sin(t * 1.15 + phase.nod) * 0.55 + Math.sin(t * 0.55 + phase.nod) * 0.45;
      const yawWave =
        Math.sin(t * 0.62 + phase.yaw) * 0.65 + Math.sin(t * 1.05 + phase.yaw * 1.1) * 0.35;
      const swayAsymmetric = swayA >= 0 ? swayA * 0.7 : swayA;

      // Root: grounded weight + tiny bob — not floaty breathe
      const weightX = weight * 0.45 * A;
      const rootRot = (swayAsymmetric * 0.28 + swayB * 0.08) * A;
      const speakBob = Math.sin(t * 3.05 + phase.breath) * 0.9 * s;
      const leanY = -0.85 * s + speakBob;
      const leanX = Math.sin(t * 1.35 + phase.weight) * 0.4 * s;
      const speakRot = Math.sin(t * 2.1 + phase.sway) * 0.35 * s;

      const tickPulse = samplePulse(now);
      const liveMul = lerp(1, 1.18, s) * lerp(1, 1.1, hype);

      const tx = (weightX + leanX) * liveMul;
      const ty = (breath * 0.12 * A + leanY + tickPulse.y) * liveMul;
      const r = (rootRot + speakRot) * liveMul;

      // Minimal residual squash (was primary “life” — now near-neutral)
      const sx = 1 + breath * 0.004 * (1 - s * 0.2) + tickPulse.sx * 0.35;
      const sy = 1 + breath * -0.005 + tickPulse.sy * 0.35;

      // Head joints — independent micro yaw / nod (degrees)
      const headYaw =
        yawWave * 2.4 * liveMul +
        Math.sin(t * 2.4 + phase.yaw) * 1.1 * s +
        Math.sin(t * 3.6 + phase.yaw) * 0.9 * hype +
        tickPulse.headYaw;
      const headNod =
        nodWave * 1.6 * liveMul + Math.sin(t * 2.8 + phase.nod) * 0.85 * s + hype * 0.35;

      if (rig) {
        const headPart = rig.getPart("head");
        const bodyPart = rig.getPart("body") || rig.getPart("torso");
        // Whole-sprite mode (no head clip): fold micro yaw/nod into body so
        // character stays one piece without a visible seam.
        const foldHeadIntoBody = !headPart || !headPart.el;

        rig.setLocal("root", {
          x: tx,
          y: ty,
          rot: r,
          sx: sx,
          sy: sy
        });
        if (bodyPart) {
          const bodyId = bodyPart.id;
          rig.setLocal(bodyId, {
            x: foldHeadIntoBody ? headYaw * 0.08 : 0,
            y: breath * 0.15 + (foldHeadIntoBody ? headNod * 0.12 : 0),
            rot:
              weight * 0.15 * A +
              (foldHeadIntoBody ? headYaw * 0.22 + headNod * 0.1 : 0),
            sx: 1,
            sy: 1
          });
        }
        if (headPart && headPart.el) {
          // Independent micro yaw / nod (degrees + slight translate)
          rig.setLocal("head", {
            x: headYaw * 0.15,
            y: headNod * 0.35,
            rot: headYaw * 0.55 + headNod * 0.25,
            sx: 1,
            sy: 1
          });
        }
        rig.update();
      } else if (el) {
        el.style.transform =
          "translate(" +
          tx.toFixed(3) +
          "px, " +
          ty.toFixed(3) +
          "px) rotate(" +
          r.toFixed(3) +
          "deg) scale(" +
          sx.toFixed(4) +
          ", " +
          sy.toFixed(4) +
          ")";
      }

      if (onTick) onTick();
    }

    function start() {
      if (running) return;
      running = true;
      tick();
      timer = setInterval(tick, TICK_MS);
    }

    function stop() {
      running = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function setSpeaking(on) {
      const want = on ? 1 : 0;
      if (want === speakTarget) return;
      speakRampFrom = speakAmp;
      speakTarget = want;
      speakRampAt = performance.now();
    }

    function pulseGift() {
      const now = performance.now();
      pulse = {
        y: -2.2,
        sx: 0.02,
        sy: -0.015,
        headYaw: 4.5,
        until: now + 420
      };
    }

    function destroy() {
      stop();
      clearFallback();
    }

    return { start, stop, setSpeaking, pulse: pulseGift, destroy, tickMs: TICK_MS, rig };
  }

  return { create, TICK_MS, LIVE_AMP };
});
