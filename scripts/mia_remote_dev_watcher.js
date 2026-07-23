"use strict";

/**
 * MIA Remote Dev Watcher — běží na domácím PC vedle Cursoru.
 *
 * Sleduje frontu remote-dev. Při novém cursor_task:
 * - Windows toast/balloon
 * - otevře data/remote-dev/LATEST_PROMPT.md (Cursor / výchozí editor)
 * - označí job jako notified
 *
 * Použití:
 *   npm run remote:dev-watch
 *   node scripts/mia_remote_dev_watcher.js --once
 */

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const remoteDev = require("./MIA_REMOTE_DEV");

const ROOT = path.resolve(__dirname, "..");
const POLL_MS = Math.max(1000, Number(process.env.MIA_REMOTE_DEV_POLL_MS) || 2000);
const OPEN_PROMPT = process.env.MIA_REMOTE_DEV_OPEN !== "0";
const TOAST = process.env.MIA_REMOTE_DEV_TOAST !== "0";

function log(msg) {
  const line = `[remote-dev-watch ${new Date().toISOString()}] ${msg}`;
  console.log(line);
}

function findCursorExe() {
  const candidates = [
    process.env.CURSOR_PATH,
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs", "cursor", "Cursor.exe")
      : "",
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Programs", "Cursor", "Cursor.exe")
      : "",
    "C:\\Program Files\\Cursor\\Cursor.exe"
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (_err) {
      /* ignore */
    }
  }
  return null;
}

function openPromptFile(filePath) {
  if (!OPEN_PROMPT) return { ok: false, reason: "open_disabled" };

  const cursorExe = findCursorExe();
  if (cursorExe) {
    try {
      spawn(cursorExe, [filePath], {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      }).unref();
      return { ok: true, via: "cursor", path: cursorExe };
    } catch (err) {
      log(`Cursor open failed: ${err.message}`);
    }
  }

  // PATH: cursor / code
  for (const bin of ["cursor", "cursor.cmd", "code", "code.cmd"]) {
    try {
      const probe = spawnSync(bin, ["--version"], {
        encoding: "utf8",
        timeout: 3000,
        windowsHide: true
      });
      if (probe.status === 0 || probe.status === null) {
        spawn(bin, [filePath], {
          detached: true,
          stdio: "ignore",
          windowsHide: true,
          shell: true
        }).unref();
        return { ok: true, via: bin };
      }
    } catch (_err) {
      /* try next */
    }
  }

  if (process.platform === "win32") {
    try {
      spawn("cmd", ["/c", "start", "", filePath], {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      }).unref();
      return { ok: true, via: "start" };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  try {
    spawn("xdg-open", [filePath], { detached: true, stdio: "ignore" }).unref();
    return { ok: true, via: "xdg-open" };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function showWindowsToast(title, body) {
  if (!TOAST || process.platform !== "win32") {
    return { ok: false, reason: "toast_skipped" };
  }

  const safeTitle = String(title || "MIA").replace(/'/g, "''").slice(0, 80);
  const safeBody = String(body || "").replace(/'/g, "''").slice(0, 180);

  const ps = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$n = New-Object System.Windows.Forms.NotifyIcon
$n.Icon = [System.Drawing.SystemIcons]::Information
$n.Visible = $true
$n.BalloonTipTitle = '${safeTitle}'
$n.BalloonTipText = '${safeBody}'
$n.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
$n.ShowBalloonTip(8000)
Start-Sleep -Seconds 9
$n.Dispose()
`.trim();

  try {
    spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
      { detached: true, stdio: "ignore", windowsHide: true }
    ).unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

function writeNotifySidecar(job) {
  const file = path.join(remoteDev.DATA_DIR, "NOTIFY.txt");
  const text = [
    `MIA Remote Dev — nový úkol`,
    `id: ${job.id}`,
    `kind: ${job.kind}`,
    `status: ${job.status}`,
    `at: ${new Date(job.at).toISOString()}`,
    ``,
    job.text,
    ``,
    `Prompt: ${remoteDev.LATEST_PROMPT_PATH}`,
    ``
  ].join("\n");
  fs.writeFileSync(file, text, "utf8");
  return file;
}

function listAwaitingCursorJobs() {
  const jobs =
    typeof remoteDev.listJobs === "function"
      ? remoteDev.listJobs(64)
      : remoteDev.getStatus().jobs || [];
  return jobs.filter(
    (job) =>
      job &&
      (job.kind === "cursor_task" || job.kind === "restart_mia") &&
      (job.status === "awaiting_cursor" || job.status === "queued") &&
      !job.notifiedAt
  );
}

function notifyJob(job) {
  writeNotifySidecar(job);
  const toast = showWindowsToast(
    "MIA Remote Dev",
    `${job.kind}: ${String(job.text || "").slice(0, 100)}`
  );
  const opened = openPromptFile(remoteDev.LATEST_PROMPT_PATH);

  remoteDev.updateJob(job.id, {
    status: "awaiting_cursor",
    notifiedAt: Date.now(),
    notify: {
      toast: toast.ok === true,
      opened: opened.ok === true,
      openVia: opened.via || null
    }
  });

  log(
    `notified ${job.id} toast=${toast.ok} open=${opened.ok}${opened.via ? ` via ${opened.via}` : ""}`
  );

  return { toast, opened };
}

function tick() {
  const pending = listAwaitingCursorJobs();
  if (!pending.length) return { notified: 0 };

  // Nejnovější první (jobs jsou unshift)
  let count = 0;
  for (const job of pending) {
    notifyJob(job);
    count += 1;
  }
  return { notified: count };
}

function main() {
  const once = process.argv.includes("--once");
  remoteDev.getStatus(); // ensure dirs
  log(`watching ${remoteDev.DATA_DIR} (poll ${POLL_MS}ms)`);
  log(`prompt: ${remoteDev.LATEST_PROMPT_PATH}`);

  const first = tick();
  if (first.notified) log(`startup notified=${first.notified}`);

  if (once) {
    process.exit(0);
    return;
  }

  setInterval(() => {
    try {
      const result = tick();
      if (result.notified) log(`tick notified=${result.notified}`);
    } catch (err) {
      log(`tick error: ${err.message || err}`);
    }
  }, POLL_MS);
}

if (require.main === module) {
  main();
}

module.exports = {
  tick,
  notifyJob,
  listAwaitingCursorJobs,
  openPromptFile,
  findCursorExe
};
