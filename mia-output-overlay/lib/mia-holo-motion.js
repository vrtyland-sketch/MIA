/**
 * Phase 14e / v24 — living-robot holo motion.
 * Prefers MiaPartRig joints (root / torso / head). Whole-image squash is residual only.
 * Shared by speech-overlay hero (#miaHolo). Body-part overlays stay separate.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MiaHoloMotion = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TICK_MS = 36;
  const SPEAK_RAMP_MS = 520;
  /** Soft Neon: readable on phone; life from head yaw/nod, not squash */
  const LIVE_AMP = 2.15;

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
   * @param {HTMLElement} [opts.el] — motion wrapper fallback (root)
   * @param {object} [opts.rig] — MiaPartRig (root / torso / head)
   * @param {() => boolean} [opts.isSpeaking]
   * @param {() => boolean} [opts.isEnabled] — false when body-hero hides holo
   */
  function create(opts) {
    const el = opts && opts.el;
    const rig = opts && opts.rig;
    if (!el && !rig) {
      return { start() {}, stop() {}, setSpeaking() {}, pulse() {}, destroy() {} };
    }

    const isSpeaking = typeof opts.isSpeaking === "function" ? opts.isSpeaking : () => false;
    const isEnabled = typeof opts.isEnabled === "function" ? opts.isEnabled : () => true;

    const phase = {
      breath: Math.random() * Math.PI * 2,
      weight: Math.random() * Math.PI * 2,
      sway: Math.random() * Math.PI * 2,
      nod: Math.random() * Math.PI * 2,
      yaw: Math.random() * Math.PI * 2,
      mech: Math.random() * Math.PI * 2
    };

    let speakAmp = 0;
    let speakTarget = 0;
    let speakRampFrom = 0;
    let speakRampAt = 0;

    let servo = { x: 0, y: 0, rot: 0, until: 0 };
    let nextServoAt = performance.now() + 5500 + Math.random() * 4500;

    let pulse = { y: 0, sx: 0, sy: 0, headYaw: 0, until: 0 };

    let timer = null;
    let running = false;

    function scheduleServo(now) {
      nextServoAt = now + 6800 + Math.random() * 7200;
      const side = Math.random() < 0.62 ? 1 : -1;
      const mag = 0.28 + Math.random() * 0.42;
      servo = {
        x: side * mag * 0.18,
        y: (Math.random() - 0.35) * 0.08,
        rot: side * mag * 0.22,
        until: now + 160 + Math.random() * 140
      };
    }

    function sampleServo(now) {
      if (now >= nextServoAt) scheduleServo(now);
      if (now >= servo.until) {
        servo.x *= 0.82;
        servo.y *= 0.82;
        servo.rot *= 0.78;
        if (Math.abs(servo.x) < 0.002) servo.x = 0;
        if (Math.abs(servo.y) < 0.002) servo.y = 0;
        if (Math.abs(servo.rot) < 0.002) servo.rot = 0;
        return servo;
      }
      const life = clamp((servo.until - now) / 220, 0, 1);
      const k = easeOutCubic(life);
      return {
        x: servo.x * k,
        y: servo.y * k,
        rot: servo.rot * k
      };
    }

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

    function clearMotion() {
      if (el) el.style.transform = "";
      if (rig) {
        rig.setLocal("root", { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
        if (rig.getPart("torso")) {
          rig.setLocal("torso", { x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
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
        clearMotion();
        return;
      }

      updateSpeakAmp(now);
      const t = now / 1000;
      const s = speakAmp;
      const A = LIVE_AMP;

      const breath = Math.sin(t * 1.05 + phase.breath);
      const weight = Math.sin(t * 0.36 + phase.weight);
      const swayA = Math.sin(t * 0.48 + phase.sway);
      const swayB = Math.sin(t * 0.88 + phase.sway * 1.3);
      const nodWave =
        Math.sin(t * 1.35 + phase.nod) * 0.55 + Math.sin(t * 0.62 + phase.nod) * 0.45;
      const yawWave =
        Math.sin(t * 0.58 + phase.yaw) * 0.65 + Math.sin(t * 1.1 + phase.yaw) * 0.35;
      const swayAsymmetric = swayA >= 0 ? swayA * 0.72 : swayA;

      const weightX = weight * 0.35 * A;
      const rootRot =
        (swayAsymmetric * 0.28 +
          swayB * 0.1 +
          Math.sin(t * 0.2 + phase.mech) * 0.04) *
        A;

      const leanX = Math.sin(t * 1.4 + phase.weight) * 0.4 * s;
      const speakBob = Math.sin(t * 3.15 + phase.breath) * 0.85 * s;
      const leanY = -0.85 * s + speakBob;
      const speakRot = Math.sin(t * 2.05 + phase.sway) * 0.35 * s;
      const speakScale = 1 + 0.02 * s;

      const tickSrv = sampleServo(now);
      const tickPulse = samplePulse(now);
      const liveMul = lerp(1, 1.2, s);

      const tx = (weightX + leanX + tickSrv.x) * liveMul;
      const ty = (breath * 0.1 * A + leanY + tickSrv.y + tickPulse.y) * liveMul;
      const r = (rootRot + speakRot + tickSrv.rot) * liveMul;
      // Residual squash only — joints carry “alive”
      const sx =
        (1 + breath * 0.004 * (1 - s * 0.2) + tickPulse.sx * 0.35) * speakScale;
      const sy = (1 + breath * -0.005 + tickPulse.sy * 0.35) * speakScale;

      const headYaw =
        yawWave * 2.2 * liveMul +
        Math.sin(t * 2.5 + phase.yaw) * 1.2 * s +
        tickPulse.headYaw +
        tickSrv.rot * 2;
      const headNod =
        nodWave * 1.5 * liveMul + Math.sin(t * 2.9 + phase.nod) * 0.9 * s;

      if (rig) {
        // Root uses % like legacy holo for layout stability inside #miaMotion
        const unit = el && el.clientHeight ? el.clientHeight / 100 : 4;
        const headPart = rig.getPart("head");
        const torsoPart = rig.getPart("torso") || rig.getPart("body");
        const foldHeadIntoBody = !headPart || !headPart.el;

        rig.setLocal("root", {
          x: tx * unit * 0.35,
          y: ty * unit * 0.35,
          rot: r,
          sx: sx,
          sy: sy
        });
        if (torsoPart) {
          rig.setLocal(torsoPart.id, {
            x: foldHeadIntoBody ? headYaw * 0.06 : 0,
            y: breath * 0.2 + (foldHeadIntoBody ? headNod * 0.1 : 0),
            rot:
              weight * 0.12 * A +
              (foldHeadIntoBody ? headYaw * 0.2 + headNod * 0.08 : 0),
            sx: 1,
            sy: 1
          });
        }
        if (headPart && headPart.el) {
          rig.setLocal("head", {
            x: headYaw * 0.12,
            y: headNod * 0.28,
            rot: headYaw * 0.5 + headNod * 0.22,
            sx: 1,
            sy: 1
          });
        }
        rig.update();
      } else if (el) {
        el.style.transform =
          "translate(" +
          tx.toFixed(3) +
          "%, " +
          ty.toFixed(3) +
          "%) rotate(" +
          r.toFixed(3) +
          "deg) scale(" +
          sx.toFixed(4) +
          ", " +
          sy.toFixed(4) +
          ")";
      }
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

    /** Gift/combo one-shot — same bounce language as Koj gift */
    function pulseGift() {
      const now = performance.now();
      pulse = {
        y: -2.0,
        sx: 0.02,
        sy: -0.014,
        headYaw: 3.8,
        until: now + 420
      };
    }

    function destroy() {
      stop();
      clearMotion();
    }

    return { start, stop, setSpeaking, pulse: pulseGift, destroy, tickMs: TICK_MS, rig };
  }

  return { create, TICK_MS, LIVE_AMP };
});
