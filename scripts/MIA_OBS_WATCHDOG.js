"use strict";

/**
 * MIA OBS Watchdog
 *
 * Reconnect smyčka v index.js se umí připojit jen k BĚŽÍCÍMU OBS. Když OBS
 * spadne (proces zmizí — typicky libcef/CrBrowserMain crash na slabém APU),
 * MIA donekonečna zkouší mrtvý port 4455 a OBS sám nikdy nenahodí → stream
 * zůstane potichu bez obrazu, dokud člověk OBS ručně nespustí.
 *
 * Tenhle modul tu mezeru zaceluje: detekuje, že proces obs64 neběží, a čistě
 * ho spustí (s --disable-shutdown-check, aby nevyskočil crash dialog). Má
 * cooldown a strop pokusů, aby nevznikla relaunch smyčka, když je problém
 * trvalý (např. vadná instalace).
 *
 * Záměrně NEspouští OBS, pokud proces běží (tehdy je to jen WebSocket/safe
 * mode — to řeší reconnect, ne relaunch).
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_EXE_CANDIDATES = [
  "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe",
  "C:\\Program Files (x86)\\obs-studio\\bin\\64bit\\obs64.exe"
];

function resolveObsExePath(configuredPath) {
  const configured = typeof configuredPath === "string" ? configuredPath.trim() : "";
  if (configured && fs.existsSync(configured)) return configured;
  for (const candidate of DEFAULT_EXE_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return "";
}

function createObsWatchdog(options = {}) {
  const config = options.config || {};
  const enabled = config.enabled !== false;
  const cooldownMs = Number.isFinite(config.cooldownMs) ? config.cooldownMs : 60000;
  const maxAttempts = Number.isFinite(config.maxAttempts) ? config.maxAttempts : 5;
  const exePath = resolveObsExePath(config.exePath);

  // Zpětně injektovatelné závislosti kvůli testovatelnosti.
  const isProcessRunning =
    typeof options.isProcessRunning === "function"
      ? options.isProcessRunning
      : () => false;
  const log = typeof options.log === "function" ? options.log : () => {};
  const spawnImpl = typeof options.spawn === "function" ? options.spawn : spawn;
  const now = typeof options.now === "function" ? options.now : () => Date.now();

  const state = {
    attempts: 0,
    lastAttemptAt: 0,
    everAttempted: false,
    lastResult: null
  };

  function status() {
    return {
      enabled,
      exePath,
      exeFound: Boolean(exePath),
      attempts: state.attempts,
      lastAttemptAt: state.lastAttemptAt,
      cooldownMs,
      maxAttempts
    };
  }

  /**
   * Zajistí běžící OBS. Spustí ho jen když: je povoleno, proces NEběží,
   * uplynul cooldown a nedosáhli jsme stropu pokusů.
   * @returns {object} výsledek { ok, action, reason }
   */
  function ensureRunning() {
    if (!enabled) return { ok: false, action: "skip", reason: "disabled" };
    if (!exePath) return { ok: false, action: "skip", reason: "exe_not_found" };

    if (isProcessRunning()) {
      // Proces žije → relaunch nepotřeba (řeší reconnect / safe mode jinde).
      state.attempts = 0;
      return { ok: true, action: "noop", reason: "process_running" };
    }

    const ts = now();
    if (state.everAttempted && ts - state.lastAttemptAt < cooldownMs) {
      return { ok: false, action: "skip", reason: "cooldown" };
    }
    if (state.attempts >= maxAttempts) {
      return { ok: false, action: "skip", reason: "max_attempts" };
    }

    state.lastAttemptAt = ts;
    state.everAttempted = true;
    state.attempts += 1;

    try {
      // OBS spouštíme VIDITELNĚ (bez --minimize-to-tray), aby streamer hned
      // viděl okno. --disable-shutdown-check potlačí bezpečnostní hlášku.
      const child = spawnImpl(
        exePath,
        ["--disable-shutdown-check"],
        {
          cwd: path.dirname(exePath),
          detached: true,
          stdio: "ignore",
          windowsHide: false
        }
      );
      if (child && typeof child.unref === "function") child.unref();
      log(
        `[OBS_WATCHDOG] OBS spadlo nebo neběží — spouštím (pokus ${state.attempts}/${maxAttempts})`
      );
      state.lastResult = { ok: true, action: "launched", reason: "spawned" };
      return state.lastResult;
    } catch (err) {
      log(`[OBS_WATCHDOG] spuštění selhalo: ${err && err.message}`);
      state.lastResult = { ok: false, action: "error", reason: err && err.message };
      return state.lastResult;
    }
  }

  /** Reset počítadla pokusů — volat při úspěšném připojení k OBS. */
  function noteConnected() {
    state.attempts = 0;
    state.everAttempted = false;
    state.lastResult = { ok: true, action: "connected", reason: "obs_connected" };
  }

  return { ensureRunning, noteConnected, status, resolveObsExePath };
}

module.exports = { createObsWatchdog, resolveObsExePath };
