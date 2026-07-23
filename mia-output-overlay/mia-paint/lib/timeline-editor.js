(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.MIA_TIMELINE_EDITOR = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const KF_SNAP_MS = 70;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  class MiaTimelineEditor {
    constructor(hostEl, options = {}) {
      this.host = hostEl;
      this.getContext = options.getContext || (() => ({}));
      this.selected = null;
      this._scrubEl = null;
      this._render();
      this.host.addEventListener("click", (e) => this._onClick(e));
      this.host.addEventListener("input", (e) => this._onInput(e));
      this.host.addEventListener("pointerdown", (e) => this._onPointerDown(e));
      this.host.addEventListener("pointermove", (e) => this._onPointerMove(e));
      this.host.addEventListener("pointerup", (e) => this._onPointerUp(e));
      this.host.addEventListener("pointercancel", (e) => this._onPointerUp(e));
    }

    _ctx() {
      return this.getContext() || {};
    }

    _collectKeyframeTimes(tl, layers) {
      const { core } = this._ctx();
      const times = [];
      for (const track of core.listMotionTracks?.(tl, layers || []) || []) {
        for (const kf of track.keyframes || []) {
          times.push(Number(kf.timeMs) || 0);
        }
      }
      return times;
    }

    /** Snap scrub to nearest KF (≤70ms) else fps step (13p). */
    _snapMs(ms, duration) {
      const { paintDoc, core } = this._ctx();
      const tl = paintDoc?.timeline;
      if (!tl || !core) return ms;
      const times = this._collectKeyframeTimes(tl, paintDoc.layers);
      let best = ms;
      let bestDist = KF_SNAP_MS + 1;
      for (const t of times) {
        const d = Math.abs(t - ms);
        if (d < bestDist) {
          bestDist = d;
          best = t;
        }
      }
      if (bestDist <= KF_SNAP_MS) return clamp(best, 0, duration);
      const fps = Math.max(1, Number(tl.fps) || 12);
      const step = Math.max(1, Math.round(1000 / fps));
      return clamp(Math.round(ms / step) * step, 0, duration);
    }

    _tickHtml(duration) {
      if (!(duration > 0)) return "";
      const major = duration > 5000 ? 1000 : duration > 2000 ? 500 : 250;
      const parts = [];
      for (let t = 0; t <= duration + 0.5; t += major) {
        const left = (t / duration) * 100;
        parts.push(
          `<span class="tl-tick" style="left:${left}%"><i>${Math.round(t)}</i></span>`
        );
      }
      return parts.join("");
    }

    _render() {
      const { paintDoc, core } = this._ctx();
      const tl = paintDoc?.timeline;
      if (!tl || !core) {
        this.host.innerHTML = '<div class="tl-empty">Timeline — otevři dokument s animací</div>';
        return;
      }
      core.ensureMotion?.(tl);
      const duration = core.unifiedDurationMs?.(tl) || tl.motion.durationMs || 2000;
      const playhead = tl.motion.playheadMs || 0;
      const tracks = core.listMotionTracks?.(tl, paintDoc.layers || []) || [];
      const particleTracks = (paintDoc.fxParticles || []).map((fx) => ({
        kind: "particle",
        id: fx.id,
        label: `FX ${fx.preset}`,
        keyframes: [{ timeMs: 0, trackKind: "particle", trackId: fx.id, preset: fx.preset }]
      }));
      const allTracks = [...tracks, ...particleTracks];
      const pct = duration > 0 ? (playhead / duration) * 100 : 0;

      let html = `<div class="tl-head">
        <span class="tl-time">${Math.round(playhead)} / ${Math.round(duration)} ms</span>
        <div class="tl-ruler" data-action="scrub" data-duration="${duration}">
          ${this._tickHtml(duration)}
          <div class="tl-playhead" style="left:${pct}%"></div>
        </div>
      </div>`;

      html += `<div class="tl-tracks">`;
      for (const track of allTracks) {
        const markers = (track.keyframes || [])
          .map((kf) => {
            const left = duration > 0 ? (kf.timeMs / duration) * 100 : 0;
            const sel =
              this.selected &&
              this.selected.trackKind === kf.trackKind &&
              this.selected.trackId === kf.trackId &&
              Math.abs(this.selected.timeMs - kf.timeMs) < 1
                ? " selected"
                : "";
            return `<button type="button" class="tl-kf${sel}" style="left:${left}%"
              data-action="select-kf" data-kind="${kf.trackKind}" data-track="${kf.trackId}"
              data-bone="${kf.boneId || ""}" data-time="${kf.timeMs}" title="${Math.round(kf.timeMs)}ms"></button>`;
          })
          .join("");
        html += `<div class="tl-row" data-track-kind="${track.kind}">
          <div class="tl-label" title="${track.label}">${track.label}</div>
          <div class="tl-lane" data-action="scrub-lane" data-duration="${duration}">
            ${markers}
          </div>
        </div>`;
      }
      html += `</div>`;

      html += `<div class="tl-inspector" id="tlInspector">`;
      if (this.selected) {
        html += this._inspectorHtml(this.selected, duration);
      } else {
        html += `<span class="tl-hint">Klikni / táhni lane · snap na KF</span>`;
      }
      html += `</div>`;

      html += `<div class="tl-actions">
        <button type="button" data-action="del-kf" ${this.selected ? "" : "disabled"}>Smazat KF</button>
        <button type="button" data-action="bone-kf">Bone KF</button>
        <button type="button" data-action="viseme-kf">Viseme</button>
        <button type="button" data-action="add-fx">+ FX</button>
      </div>`;

      this.host.innerHTML = html;
    }

    _inspectorHtml(sel, duration) {
      const EASING_OPTS = ["linear", "ease", "ease-in", "ease-out", "ease-in-out"];
      const fields =
        sel.trackKind === "lip"
          ? [
              { key: "viseme", label: "Viseme", type: "text" },
              { key: "mouthOpen", label: "Open" },
              { key: "mouthWide", label: "Wide" },
              { key: "timeMs", label: "Čas ms" }
            ]
          : sel.trackKind === "bone"
          ? [{ key: "angle", label: "Úhel" }, { key: "timeMs", label: "Čas ms" }]
          : sel.trackKind === "camera"
            ? [
                { key: "panX", label: "Pan X" },
                { key: "panY", label: "Pan Y" },
                { key: "zoom", label: "Zoom" },
                { key: "easing", label: "Ease", type: "select", options: EASING_OPTS },
                { key: "timeMs", label: "Čas ms" }
              ]
            : [
                { key: "x", label: "X" },
                { key: "y", label: "Y" },
                { key: "rotation", label: "Rot" },
                { key: "opacity", label: "Alpha" },
                { key: "easing", label: "Ease", type: "select", options: EASING_OPTS },
                { key: "timeMs", label: "Čas ms" }
              ];
      return fields
        .map((f) => {
          const val = sel[f.key] != null ? sel[f.key] : f.type === "select" ? "linear" : "";
          if (f.type === "select") {
            const opts = (f.options || [])
              .map((o) => `<option value="${o}"${String(val) === o ? " selected" : ""}>${o}</option>`)
              .join("");
            return `<label>${f.label}<select data-field="${f.key}">${opts}</select></label>`;
          }
          const inputType = f.type === "text" ? "text" : "number";
          const step = f.type === "text" ? "" : ' step="any"';
          return `<label>${f.label}<input type="${inputType}"${step} data-field="${f.key}" value="${val}" /></label>`;
        })
        .join("");
    }

    refresh() {
      this._render();
    }

    _scrubTo(clientX, laneEl, opts = {}) {
      const { core, paintDoc, onScrub, engine } = this._ctx();
      const tl = paintDoc?.timeline;
      if (!tl || !core || !laneEl) return;
      const rect = laneEl.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const duration = core.unifiedDurationMs?.(tl) || tl.motion.durationMs || 2000;
      let ms = Math.round(ratio * duration);
      if (opts.snap !== false) ms = this._snapMs(ms, duration);
      core.setUnifiedPlayhead?.(tl, ms) || core.setPlayhead?.(tl, ms);
      engine?.setMotionPlayhead?.(ms);
      if (typeof onScrub === "function") onScrub(ms);
      this.refresh();
    }

    _scrubTarget(e) {
      if (e.target.closest(".tl-kf") || e.target.closest("input") || e.target.closest("button[data-action='del-kf']")) {
        return null;
      }
      const el = e.target.closest("[data-action='scrub'], [data-action='scrub-lane']");
      return el || null;
    }

    _onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      const target = this._scrubTarget(e);
      if (!target) return;
      this._scrubEl = target;
      try {
        target.setPointerCapture?.(e.pointerId);
      } catch (_err) {
        /* ignore */
      }
      this._scrubTo(e.clientX, target);
      e.preventDefault();
    }

    _onPointerMove(e) {
      if (!this._scrubEl) return;
      this._scrubTo(e.clientX, this._scrubEl, { snap: false });
    }

    _onPointerUp(e) {
      if (!this._scrubEl) return;
      this._scrubTo(e.clientX, this._scrubEl, { snap: true });
      this._scrubEl = null;
    }

    _onClick(e) {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      // Scrub handled by pointer events (avoids double-fire)
      if (action === "scrub" || action === "scrub-lane") return;

      const { core, paintDoc, onScrub, onChange, engine } = this._ctx();
      const tl = paintDoc?.timeline;

      if (action === "select-kf") {
        this.selected = {
          trackKind: btn.getAttribute("data-kind"),
          trackId: btn.getAttribute("data-track"),
          boneId: btn.getAttribute("data-bone") || null,
          timeMs: Number(btn.getAttribute("data-time")) || 0
        };
        const track = (core.listMotionTracks?.(tl, paintDoc.layers) || [])
          .flatMap((tr) => tr.keyframes || [])
          .find(
            (kf) =>
              kf.trackKind === this.selected.trackKind &&
              kf.trackId === this.selected.trackId &&
              Math.abs(kf.timeMs - this.selected.timeMs) < 1
          );
        if (track) this.selected = { ...track };
        core.setUnifiedPlayhead?.(tl, this.selected.timeMs);
        engine?.setMotionPlayhead?.(this.selected.timeMs);
        if (typeof onScrub === "function") onScrub(this.selected.timeMs);
        this.refresh();
        return;
      }

      if (action === "del-kf" && this.selected && tl) {
        const s = this.selected;
        let res;
        if (s.trackKind === "layer") res = core.deleteLayerKeyframe?.(tl, s.trackId, s.timeMs);
        else if (s.trackKind === "camera") res = core.deleteCameraKeyframe?.(tl, s.timeMs);
        else if (s.trackKind === "bone") res = core.deleteBoneKeyframe?.(tl, s.trackId, s.boneId, s.timeMs);
        else if (s.trackKind === "lip") res = core.deleteVisemeKeyframe?.(tl, s.timeMs);
        if (res?.ok) {
          this.selected = null;
          if (typeof onChange === "function") onChange();
          this.refresh();
        }
        return;
      }

      if (action === "bone-kf" && tl) {
        const rig = tl.motion?.rigs?.[0];
        const boneId = rig?.bones?.[1]?.id || "mid";
        if (rig) {
          core.motionAddBoneKeyframe?.(tl, rig.id, boneId, { timeMs: tl.motion.playheadMs, angle: 15 });
          if (typeof onChange === "function") onChange();
          this.refresh();
        }
        return;
      }

      if (action === "viseme-kf" && tl) {
        const layer = paintDoc?.layers?.find((l) => l.id === paintDoc.activeLayerId) || paintDoc?.layers?.[0];
        core.addVisemeKeyframe?.(tl, {
          layerId: layer?.id,
          timeMs: tl.motion.playheadMs,
          viseme: "A"
        });
        if (typeof onChange === "function") onChange();
        this.refresh();
        return;
      }

      if (action === "add-fx" && paintDoc) {
        core.createParticleEmitter?.(paintDoc, {
          preset: "sparkle_blue",
          x: Math.round(paintDoc.width / 2),
          y: Math.round(paintDoc.height / 2)
        });
        if (typeof onChange === "function") onChange();
        this.refresh();
      }
    }

    _onInput(e) {
      const field = e.target.getAttribute("data-field");
      if (!field || !this.selected) return;
      const { core, paintDoc, onChange } = this._ctx();
      const tl = paintDoc?.timeline;
      if (!tl) return;
      const raw = e.target.value;
      const val = e.target.tagName === "SELECT" || field === "viseme" || field === "easing" ? raw : Number(raw);
      const s = this.selected;
      const props = { [field]: val };
      let res;
      if (s.trackKind === "layer") res = core.updateLayerKeyframe?.(tl, s.trackId, s.timeMs, props);
      else if (s.trackKind === "camera") res = core.updateCameraKeyframe?.(tl, s.timeMs, props);
      else if (s.trackKind === "bone") res = core.updateBoneKeyframe?.(tl, s.trackId, s.boneId, s.timeMs, props);
      else if (s.trackKind === "lip") res = core.updateVisemeKeyframe?.(tl, s.timeMs, props);
      if (res?.ok) {
        this.selected = { ...s, ...props };
        if (typeof onChange === "function") onChange();
      }
    }
  }

  return { MiaTimelineEditor };
});
