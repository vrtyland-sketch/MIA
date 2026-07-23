"use strict";

/**
 * Phase 4 — lightweight MIA setup (not a Windows EXE installer).
 * Checks Node, copies .env.example → .env if missing, creates data dirs.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const DATA_DIRS = [
  "data",
  "data/streamer-profiles",
  "logs"
];

function ensureDir(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fs.mkdirSync(abs, { recursive: true });
    return { path: rel, created: true };
  }
  return { path: rel, created: false };
}

function copyEnvExample() {
  const example = path.join(ROOT, ".env.example");
  const dest = path.join(ROOT, ".env");
  if (fs.existsSync(dest)) {
    return { ok: true, skipped: true, reason: "env_exists" };
  }
  if (!fs.existsSync(example)) {
    return { ok: false, error: "env_example_missing" };
  }
  fs.copyFileSync(example, dest);
  return { ok: true, created: true, path: ".env" };
}

function checkNode() {
  const major = Number(String(process.versions.node || "0").split(".")[0]);
  const ok = Number.isFinite(major) && major >= 18;
  return {
    ok,
    version: process.versions.node,
    major,
    requiredMajor: 18
  };
}

function runSetup() {
  const node = checkNode();
  const dirs = DATA_DIRS.map(ensureDir);
  const env = copyEnvExample();
  const ok = node.ok && env.ok !== false;
  return {
    ok,
    node,
    dirs,
    env,
    next: [
      "Uprav .env (OBS_WS_*, TikFinity / ingest dle potřeby)",
      "npm start  (nebo node server.js)",
      "Control Center: http://localhost:3000/mia-admin",
      "Viz docs/MIA_INSTALLER.md"
    ]
  };
}

if (require.main === module) {
  const result = runSetup();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

module.exports = {
  runSetup,
  checkNode,
  copyEnvExample,
  ensureDir,
  DATA_DIRS
};
