"use strict";

/**
 * MIA Remote Dev Mode — hlas/text z telefonu → úkol pro Cursor na domácím PC.
 *
 * Vrstvy:
 * 1) Telefon (mia-remote-dev.html) — diktování / text
 * 2) MIA API — fronta, klasifikace, bezpečný admin guard
 * 3) PC — inbox soubory + volitelné lokální akce (testy, status)
 * 4) Cursor — čte LATEST_PROMPT.md / inbox (nebo budoucí agent runner)
 *
 * Není to náhrada RustDesk (plocha). Je to „mluvíš → MIA připraví práci pro Cursor“.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = process.env.MIA_REMOTE_DEV_DATA_DIR
  ? path.resolve(process.env.MIA_REMOTE_DEV_DATA_DIR)
  : path.join(ROOT, "data", "remote-dev");
const INBOX_PATH = path.join(DATA_DIR, "inbox.jsonl");
const LATEST_PROMPT_PATH = path.join(DATA_DIR, "LATEST_PROMPT.md");
const STATE_PATH = path.join(DATA_DIR, "state.json");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nowMs() {
  return Date.now();
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadState() {
  ensureDir();
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return { jobs: [], updatedAt: 0 };
    }
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    return {
      jobs: Array.isArray(raw.jobs) ? raw.jobs.slice(-40) : [],
      updatedAt: toNumber(raw.updatedAt, 0)
    };
  } catch {
    return { jobs: [], updatedAt: 0 };
  }
}

function saveState(state) {
  ensureDir();
  const next = {
    jobs: (state.jobs || []).slice(-40),
    updatedAt: nowMs()
  };
  fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function appendInbox(job) {
  ensureDir();
  fs.appendFileSync(INBOX_PATH, `${JSON.stringify(job)}\n`, "utf8");
}

function writeLatestPrompt(job) {
  ensureDir();
  const body = [
    `# MIA Remote Dev — úkol pro Cursor`,
    ``,
    `- **id:** ${job.id}`,
    `- **at:** ${new Date(job.at).toISOString()}`,
    `- **source:** ${job.source}`,
    `- **kind:** ${job.kind}`,
    ``,
    `## Úkol (proveď v repozitáři MIA)`,
    ``,
    job.prompt,
    ``,
    `## Pravidla`,
    ``,
    `- Priorita: nerozbít stream runtime.`,
    `- Minimální diff, žádný User Mode mimo zadání.`,
    `- Overlay nikdy neukazuje coins — jen MIA body.`,
    `- Po změně spusť relevantní testy (\`npm run test:gift-map\` pokud jde o gift mapu).`,
    `- Na konci stručně shrň co jsi změnil.`,
    ``
  ].join("\n");
  fs.writeFileSync(LATEST_PROMPT_PATH, body, "utf8");
}

function buildAgentPrompt(rawText = "") {
  const text = safeString(rawText);
  return [
    "Jsi Cursor agent v projektu MIA (Stream Mode: TikFinity → MIA → OBS).",
    "Uživatel diktoval z telefonu (Remote Dev Mode). Proveď následující úkol:",
    "",
    text,
    "",
    "Dodrž kánon v docs/KANON_SOUCASNY_PREHLED.md a .cursor/rules/mia-canon.mdc."
  ].join("\n");
}

function classifyCommand(rawText = "") {
  const text = safeString(rawText);
  const lower = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!text) {
    return { kind: "invalid", error: "empty_text" };
  }

  if (
    /test.*paint|paint.*test|otestuj paint|test:mia-paint|mia.?paint test/.test(lower)
  ) {
    return {
      kind: "run_tests",
      script: "test:mia-paint",
      prompt: buildAgentPrompt(`Spusť npm run test:mia-paint a shrň výsledek. Původní: ${text}`)
    };
  }

  if (
    /spust test|spustit test|run test|otestuj gift|test gift|test:gift/.test(lower)
  ) {
    return {
      kind: "run_tests",
      script: "test:gift-map",
      prompt: buildAgentPrompt(`Spusť testy gift mapy a shrň výsledek. Původní požadavek: ${text}`)
    };
  }

  if (/preflight|test preflight/.test(lower)) {
    return {
      kind: "run_tests",
      script: "test:preflight:fast",
      prompt: buildAgentPrompt(`Spusť rychlý preflight a shrň výsledek. Původní: ${text}`)
    };
  }

  if (/paint smoke|smoke paint|paint:smoke/.test(lower)) {
    return {
      kind: "run_tests",
      script: "paint:smoke",
      prompt: buildAgentPrompt(`Spusť npm run paint:smoke (MIA musí běžet) a shrň výsledek. Původní: ${text}`)
    };
  }

  if (/stav paint|paint status|status paint|mia paint stav/.test(lower)) {
    return {
      kind: "status",
      prompt: buildAgentPrompt(
        `Zjisti stav MIA Paint — GET /mia/paint/status, /mia/paint/ws/status a /mia/paint/agent/snapshot. Původní: ${text}`
      )
    };
  }

  if (/otevri paint|open paint|mia paint editor|editor paint/.test(lower)) {
    return {
      kind: "cursor_task",
      prompt: buildAgentPrompt(
        `Otevři MIA Paint na http://127.0.0.1:3000/mia-paint/ a ověř že editor běží. Původní: ${text}`
      )
    };
  }

  if (/paint tauri|tauri paint|nativni paint/.test(lower)) {
    return {
      kind: "cursor_task",
      prompt: buildAgentPrompt(
        `Spusť MIA Paint Tauri shell (npm run paint:tauri) — vyžaduje Rust + běžící MIA server. Původní: ${text}`
      )
    };
  }

  if (/stav gift|gift.?map status|status gift|jaky je stav/.test(lower)) {
    return {
      kind: "status",
      prompt: buildAgentPrompt(`Zjisti stav gift mapy a stream runtime. Původní: ${text}`)
    };
  }

  if (/restart mia|restartuj mia|mia restart/.test(lower)) {
    return {
      kind: "restart_mia",
      prompt: buildAgentPrompt(`Restartuj MIA službu bezpečně. Původní: ${text}`)
    };
  }

  return {
    kind: "cursor_task",
    prompt: buildAgentPrompt(text)
  };
}

function createJob(input = {}) {
  const text = safeString(input.text);
  const classified = classifyCommand(text);
  if (classified.error) {
    return { ok: false, error: classified.error };
  }

  const job = {
    id: `rd_${nowMs().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    at: nowMs(),
    source: safeString(input.source, "text"),
    text,
    kind: classified.kind,
    script: classified.script || null,
    prompt: classified.prompt,
    status: "queued",
    result: null,
    error: null
  };

  const state = loadState();
  state.jobs.unshift(job);
  saveState(state);
  appendInbox(job);
  writeLatestPrompt(job);

  return { ok: true, job, latestPromptPath: LATEST_PROMPT_PATH };
}

function listJobs(limit = 12) {
  const state = loadState();
  return state.jobs.slice(0, Math.max(1, limit));
}

function getJob(id = "") {
  const key = safeString(id);
  return loadState().jobs.find((row) => row.id === key) || null;
}

function updateJob(id, patch = {}) {
  const state = loadState();
  const idx = state.jobs.findIndex((row) => row.id === safeString(id));
  if (idx < 0) return null;
  state.jobs[idx] = { ...state.jobs[idx], ...patch, updatedAt: nowMs() };
  saveState(state);
  return state.jobs[idx];
}

function getStatus() {
  const state = loadState();
  const latest = state.jobs[0] || null;
  return {
    ok: true,
    mode: "remote_dev",
    dataDir: DATA_DIR,
    latestPromptPath: LATEST_PROMPT_PATH,
    inboxPath: INBOX_PATH,
    latest,
    queueLength: state.jobs.filter((j) => j.status === "queued" || j.status === "running")
      .length,
    jobs: state.jobs.slice(0, 8)
  };
}

function runLocalJob(job, options = {}) {
  if (!job || job.kind !== "run_tests" || !job.script) {
    return Promise.resolve({
      ok: false,
      error: "not_local_runnable",
      hint: "Otevři data/remote-dev/LATEST_PROMPT.md v Cursoru na PC."
    });
  }

  updateJob(job.id, { status: "running" });

  return new Promise((resolve) => {
    const child = spawn(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", job.script],
      {
        cwd: ROOT,
        env: process.env,
        windowsHide: true
      }
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const timeoutMs = toNumber(options.timeoutMs, 120000);
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch (_err) {
        /* ignore */
      }
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      const ok = code === 0;
      const summary = (stdout || stderr).trim().slice(-2000);
      const updated = updateJob(job.id, {
        status: ok ? "done" : "failed",
        result: {
          exitCode: code,
          summary
        },
        error: ok ? null : `exit_${code}`
      });
      resolve({ ok, job: updated });
    });
  });
}

async function enqueueAndMaybeRun(input = {}, options = {}) {
  const created = createJob(input);
  if (!created.ok) return created;

  const autoRun = options.autoRun !== false;
  if (autoRun && created.job.kind === "run_tests") {
    const ran = await runLocalJob(created.job, options);
    return {
      ...created,
      job: ran.job || created.job,
      ranLocally: true,
      runOk: ran.ok === true
    };
  }

  if (created.job.kind === "status" && typeof options.getStatusPayload === "function") {
    const payload = options.getStatusPayload();
    const updated = updateJob(created.job.id, {
      status: "done",
      result: { summary: JSON.stringify(payload).slice(0, 2000) }
    });
    return { ...created, job: updated, ranLocally: true, runOk: true };
  }

  updateJob(created.job.id, { status: "awaiting_cursor", notifiedAt: null });
  return {
    ...created,
    job: getJob(created.job.id) || created.job,
    ranLocally: false,
    hint:
      "Úkol čeká na Cursor. Na PC spusť `npm run remote:dev-watch` — watcher otevře LATEST_PROMPT.md a dá toast. Pak v Cursor Agentu potvrď úkol."
  };
}

module.exports = {
  DATA_DIR,
  LATEST_PROMPT_PATH,
  INBOX_PATH,
  classifyCommand,
  createJob,
  listJobs,
  getJob,
  updateJob,
  getStatus,
  runLocalJob,
  enqueueAndMaybeRun,
  buildAgentPrompt
};
