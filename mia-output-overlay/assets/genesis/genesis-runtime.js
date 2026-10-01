/**
 * MIA Genesis Mode — isolated client runtime.
 * Does NOT import gift/video/voice Core queues or /overlay-state gift payloads.
 */
(function (root) {
  "use strict";

  const DEMO_URL = "/assets/genesis/genesis-state.demo.json";
  let state = null;
  let phase = "A"; // A skeleton → B panels → E cadence

  function $(id) {
    return document.getElementById(id);
  }

  function statusClass(value) {
    const v = String(value || "").toUpperCase();
    if (v.includes("WARN") || v.includes("FAIL")) return "g-status-warning";
    if (v.includes("VERIFY") || v.includes("CHECK")) return "g-status-verifying";
    if (v.includes("LOCK") || v.includes("STANDBY")) return "g-status-locked";
    if (v.includes("ONLINE") || v.includes("LIVE") || v.includes("CONNECTED") || v.includes("OK") || v.includes("BUILD")) {
      return "g-status-online";
    }
    return "g-status-standby";
  }

  function setReadiness(n) {
    const el = $("readiness");
    if (!el) return;
    el.textContent = Math.max(0, Math.min(100, Math.round(Number(n) || 0))) + "%";
  }

  function setDailyNote(text) {
    const el = $("dailyNote");
    if (el) el.textContent = text || "";
  }

  function setAvatarMood(mood) {
    const img = $("avatar");
    if (!img) return;
    const map = {
      idle: "/assets/mia/parts/head/idle.png",
      listening: "/assets/mia/parts/head/think.png",
      speaking: "/assets/mia/cyber/speak.png",
      greeting: "/assets/mia/parts/head/wave.png",
      thinking: "/assets/mia/parts/head/think.png",
      happy: "/assets/mia/parts/head/happy.png",
      surprised: "/assets/mia/parts/head/combo.png",
      system_alert: "/assets/mia/parts/head/duel.png",
      thank_you: "/assets/mia/parts/head/gift.png"
    };
    img.src = map[mood] || map.idle;
  }

  /** Phase B — panels */
  function renderStatus(status) {
    const host = $("panelStatus");
    if (!host) return;
    const rows = Object.entries(status || {});
    host.innerHTML =
      '<p class="g-title">System Status</p><div class="rows">' +
      rows
        .map(([k, v]) => {
          const dots = ".".repeat(Math.max(2, 16 - k.length));
          return `<div><span>${k} ${dots} </span><span class="${statusClass(v)}">${v}</span></div>`;
        })
        .join("") +
      "</div>";
  }

  function renderMilestones(s) {
    const host = $("panelMilestones");
    if (!host) return;
    const yt = s.youtube || { current: 0, goal: 1000 };
    host.innerHTML =
      '<p class="g-title">Community Milestones</p>' +
      `<div>YouTube ........ ${yt.current} / ${yt.goal}</div>` +
      `<div>Genesis Day .... ${s.genesisDay || 1}</div>` +
      `<div>Modules Online . ${s.modulesOnline || 0} / ${s.modulesTotal || 12}</div>`;
  }

  const TERMINAL_POOL = [
    "Loading Voice Engine...",
    "Checking Assets...",
    "Synchronizing Memory...",
    "Overlay verified...",
    "Genesis Sequence stable...",
    "Listening...",
    "Network monitoring active...",
    "Calibrating presence...",
    "Daily note applied...",
    "Memory scan step OK...",
    "Platform strip synced...",
    "Readiness drift +0.1...",
    "Diagnostics queue advanced...",
    "Community milestone check...",
    "Voice path isolated from gift queue...",
    "OBS layer MIA_GENESIS healthy...",
    "Anti-repeat terminal pool OK...",
    "Awaiting next cadence event...",
    "Asset verification soft-pass...",
    "Genesis Mode heartbeat..."
  ];
  const terminalSeen = [];
  const terminalLines = [];

  function pushTerminal(line) {
    const host = $("panelTerminal");
    if (!host) return;
    terminalLines.push("> " + line);
    if (terminalLines.length > 8) terminalLines.shift();
    host.innerHTML =
      '<p class="g-title">Live Log</p><pre style="margin:0;font:13px var(--g-mono);line-height:1.45;color:#cfe8ff;white-space:pre-wrap;">' +
      terminalLines.join("\n") +
      "</pre>";
  }

  function pickTerminalLine() {
    const available = TERMINAL_POOL.filter((l) => !terminalSeen.includes(l));
    const pool = available.length ? available : TERMINAL_POOL.slice();
    const line = pool[Math.floor(Math.random() * pool.length)];
    terminalSeen.push(line);
    if (terminalSeen.length > 12) terminalSeen.shift();
    return line;
  }

  const DIAG_QUEUE = [
    "Memory scan",
    "Asset verification",
    "Overlay calibration",
    "Voice calibration",
    "Network monitoring"
  ];
  let diagIndex = 0;

  function renderDiag(stepLabel, stateLabel) {
    const host = $("panelDiag");
    if (!host) return;
    const items = DIAG_QUEUE.map((name, i) => {
      let st = "QUEUED";
      if (i < diagIndex) st = "DONE";
      if (i === diagIndex) st = stateLabel || "RUNNING";
      return `<div>${name} · <span class="${statusClass(st)}">${st}</span></div>`;
    });
    host.innerHTML = '<p class="g-title">Active Diagnostics</p>' + items.join("");
  }

  /** Phase D — audio (WebAudio stubs; files optional) */
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  function playSfx(kind) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    const table = {
      boot: [220, 440, 0.12],
      confirm: [520, 780, 0.1],
      notification: [660, 880, 0.08],
      loading: [180, 200, 0.05],
      online: [300, 600, 0.1],
      error: [120, 90, 0.15],
      reconnect: [240, 360, 0.1]
    };
    const [f0, f1, dur] = table[kind] || table.notification;
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  let bgmMode = "ambient";
  function setBgmMode(mode) {
    bgmMode = mode || "ambient";
    // File-based BGM hooked later; mode is observable for operators.
    const note = $("dailyNote");
    if (note && note.dataset) note.dataset.bgm = bgmMode;
  }

  /** Phase E — cadence: one significant event per tick */
  const EVENT_TYPES = ["terminal", "diagnostics", "status", "fx", "voice"];
  let lastEventAt = 0;
  let eventCursor = 0;
  let voiceCooldownUntil = 0;
  let platformCooldownUntil = 0;

  function significantEvent() {
    const now = Date.now();
    if (now - lastEventAt < 20000) return;
    lastEventAt = now;
    const type = EVENT_TYPES[eventCursor % EVENT_TYPES.length];
    eventCursor += 1;

    if (type === "terminal") {
      pushTerminal(pickTerminalLine());
      return;
    }
    if (type === "diagnostics") {
      renderDiag(DIAG_QUEUE[diagIndex], "RUNNING");
      setTimeout(() => {
        diagIndex = (diagIndex + 1) % DIAG_QUEUE.length;
        renderDiag(DIAG_QUEUE[diagIndex], "RUNNING");
      }, 1200);
      setBgmMode("diagnostics");
      playSfx("loading");
      return;
    }
    if (type === "status" && state && state.status) {
      // Soft visual refresh only — no Core mutation
      renderStatus(state.status);
      setBgmMode("ambient");
      return;
    }
    if (type === "fx") {
      try {
        if (window.parent && window.parent.MIA_GENESIS_FX) window.parent.MIA_GENESIS_FX.pulse();
      } catch (_) {}
      if (typeof window.MIA_GENESIS_FX !== "undefined") window.MIA_GENESIS_FX.pulse();
      if (state) {
        state.readinessPercent = Math.min(92, (Number(state.readinessPercent) || 0) + 0.2);
        setReadiness(state.readinessPercent);
      }
      return;
    }
    if (type === "voice") {
      if (now < voiceCooldownUntil) {
        pushTerminal(pickTerminalLine());
        return;
      }
      voiceCooldownUntil = now + 35000;
      setAvatarMood("speaking");
      playSfx("notification");
      setBgmMode("cyber");
      const line = pickVoiceLine();
      pushTerminal("VOICE: " + line);
      showSubtitle(line);
      setTimeout(() => setAvatarMood("listening"), 2200);
      setTimeout(() => setBgmMode("ambient"), 4000);
    }
  }

  function pickVoiceLine() {
    const bank = (root.MIA_GENESIS_VOICE && root.MIA_GENESIS_VOICE.pick) || null;
    if (bank) return bank(state && state.lang);
    return (state && state.dailyNote) || "Genesis Sequence aktivní.";
  }

  function showSubtitle(text, holdMs) {
    let el = $("genesisSub");
    if (!el) {
      el = document.createElement("div");
      el.id = "genesisSub";
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.opacity = "1";
    setTimeout(() => {
      el.style.opacity = "0";
    }, Number(holdMs) > 0 ? holdMs : 4500);
  }

  function applyState(s) {
    state = s;
    setReadiness(s.readinessPercent);
    setDailyNote(s.dailyNote);
    setAvatarMood("listening");
    setBgmMode(s.bgmMode || "startup");
    if (phase !== "A") {
      renderStatus(s.status);
      renderMilestones(s);
      renderDiag(DIAG_QUEUE[0], "RUNNING");
    }
  }

  function enablePhaseB() {
    phase = "B";
    if (state) {
      renderStatus(state.status);
      renderMilestones(state);
      renderDiag(DIAG_QUEUE[0], "RUNNING");
      pushTerminal("Genesis Sequence aktivní.");
      playSfx("boot");
    }
  }

  function enablePhaseE() {
    phase = "E";
    lastEventAt = Date.now();
    setInterval(significantEvent, 5000);
    // First cadence after Sequence settle
    setTimeout(significantEvent, 25000);
  }

  async function boot() {
    try {
      const res = await fetch(DEMO_URL + "?t=" + Date.now());
      const json = await res.json();
      applyState(json);
    } catch (err) {
      applyState({
        readinessPercent: 5,
        dailyNote: "Genesis Sequence aktivní.",
        genesisDay: 1,
        youtube: { current: 0, goal: 1000 },
        modulesOnline: 1,
        modulesTotal: 12,
        status: { Voice: "ONLINE", OBS: "ONLINE", Memory: "CHECKING" }
      });
    }
    // Auto-advance panels when runtime script loaded with full build
    if (root.MIA_GENESIS_BUILD >= 2) enablePhaseB();
    const birthParam =
      typeof root.location !== "undefined" &&
      root.location.search &&
      /[?&]birth=/.test(root.location.search);
    if (root.MIA_GENESIS_BUILD >= 5 && !birthParam) enablePhaseE();
  }

  const ANNOUNCE = {
    Voice: "Hlasový modul úspěšně prošel ověřením.",
    Chat: "Chat modul byl aktivován.",
    "Gift Engine": "Gift Engine byl úspěšně připojen.",
    Bowl: "Bowl modul byl aktivován.",
    Video: "Video modul byl úspěšně připojen.",
    Overlay: "Overlay vrstva je stabilní.",
    default: "Nový modul byl úspěšně aktivován. Děkuji, že jste u mého vývoje."
  };

  function renderPublicModules(modules) {
    const wrap = $("publicModules");
    const body = $("publicModuleBody");
    if (!wrap || !body || !modules) return;
    const live = Object.entries(modules).filter(
      ([id, m]) => id !== "GENESIS" && m && String(m.state).toUpperCase() === "LIVE"
    );
    if (!live.length) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "block";
    body.innerHTML = live
      .map(([id, m]) => {
        let extra = "";
        if (id === "Chat") extra = " · naslouchám komunitě";
        if (id === "Gift Engine") extra = " · připraven na první podporu";
        if (id === "Voice") extra = " · hlas LIVE";
        if (id === "Video") extra = " · media path připravena";
        if (id === "Bowl") extra = " · miska připravena";
        return `<div><span class="g-status-online">●</span> ${id}${extra}</div>`;
      })
      .join("");
  }

  function syncModulesFromBus(modules) {
    if (!state) state = { status: {}, modulesOnline: 0, modulesTotal: 12 };
    if (!state.status) state.status = {};
    Object.entries(modules || {}).forEach(([id, m]) => {
      if (id === "GENESIS" || id === "Overlay") return;
      const st = String((m && m.state) || "LOCKED").toUpperCase();
      if (st === "LIVE") state.status[id] = "LIVE";
      else if (st === "TEST") state.status[id] = "VERIFYING";
      else if (st === "OFF") state.status[id] = "LOCKED";
      else state.status[id] = st;
    });
    const liveCount = Object.values(modules || {}).filter(
      (m) => String(m.state).toUpperCase() === "LIVE"
    ).length;
    state.modulesOnline = liveCount;
    renderStatus(state.status);
    renderMilestones(state);
    renderPublicModules(modules);
  }

  function unlockCeremony(moduleName, opts) {
    if (!state || !state.status) return;
    const key = moduleName || "Chat";
    const silent = opts && opts.silent;
    const fromBus = opts && opts.fromBus;
    state.status[key] = "VERIFYING";
    renderStatus(state.status);
    pushTerminal("Verifying " + key + "...");
    if (root.MIA_GENESIS_AUDIO) root.MIA_GENESIS_AUDIO.onSystemState("diagnostics");
    setTimeout(() => {
      state.status[key] = "LIVE";
      if (!fromBus && root.MIA_GENESIS_BUS) {
        try {
          root.MIA_GENESIS_BUS.setModuleState(key, "LIVE", { ceremony: true });
        } catch (_) {}
      }
      state.modulesOnline = Math.min(
        state.modulesTotal || 12,
        (Number(state.modulesOnline) || 0) + 1
      );
      state.readinessPercent = Math.min(92, (Number(state.readinessPercent) || 0) + 2);
      renderStatus(state.status);
      renderMilestones(state);
      if (root.MIA_GENESIS_BUS) renderPublicModules(root.MIA_GENESIS_BUS.getModules());
      setReadiness(state.readinessPercent);
      pushTerminal(key + " → LIVE");
      setAvatarMood("happy");
      if (root.MIA_GENESIS_AUDIO) root.MIA_GENESIS_AUDIO.onSystemState("unlock");
      else playSfx("confirm");
      if (!silent) {
        const line = ANNOUNCE[key] || ANNOUNCE.default;
        showSubtitle(line);
        pushTerminal("VOICE: " + line);
      }
      setTimeout(() => setAvatarMood("listening"), 2500);
    }, 2000);
  }

  function bindGenesisBus() {
    if (!root.MIA_GENESIS_BUS) return;
    syncModulesFromBus(root.MIA_GENESIS_BUS.getModules());
    root.MIA_GENESIS_BUS.onMessage((msg) => {
      if (!msg) return;
      if (msg.type === "module_unlock" && msg.moduleId) {
        unlockCeremony(msg.moduleId, { silent: false, fromBus: true });
        return;
      }
      if (msg.type === "module_state" || msg.type === "sync") {
        const modules =
          msg.modules || (msg.store && msg.store.modules) || root.MIA_GENESIS_BUS.getModules();
        syncModulesFromBus(modules);
      }
    });
  }

  root.MIA_GENESIS = {
    boot,
    enablePhaseB,
    enablePhaseE,
    playSfx,
    setBgmMode,
    setAvatarMood,
    pushTerminal,
    unlockCeremony,
    syncModulesFromBus,
    showSubtitle,
    setReadiness,
    getState: () => state,
    getPhase: () => phase,
    getBgmMode: () => bgmMode
  };

  root.MIA_GENESIS_BUILD = root.MIA_GENESIS_BUILD || 1;
  function start() {
    boot();
    bindGenesisBus();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
