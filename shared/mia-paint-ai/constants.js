"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "paint-ai.jsonl");

const KOJ_FACTORY_DIR = path.join(
  __dirname,
  "..",
  "mia-output-overlay",
  "assets",
  "kojnozrout",
  "custom"
);

const AGENT_COMMANDS = [
  "new_document",
  "add_layer",
  "add_vector_layer",
  "set_active_layer",
  "set_tool",
  "set_document_name",
  "set_canvas_size",
  "rename_layer",
  "remove_layer",
  "save_project",
  "load_project",
  "list_projects",
  "export_svg",
  "export_image",
  "export_koj_factory",
  "import_image",
  "autosave"
];

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logPaintAi(entry = {}) {
  ensureLogDir();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...entry
  });
  fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
}

function hashPrompt(prompt) {
  return crypto.createHash("sha256").update(String(prompt || "")).digest("hex").slice(0, 8);
}

function ensureKojFactoryDir() {
  if (!fs.existsSync(KOJ_FACTORY_DIR)) {
    fs.mkdirSync(KOJ_FACTORY_DIR, { recursive: true });
  }
  return KOJ_FACTORY_DIR;
}

function safeExportName(name) {
  const base = String(name || "export")
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return base || "export";
}

module.exports = {
  LOG_FILE,
  KOJ_FACTORY_DIR,
  AGENT_COMMANDS,
  logPaintAi,
  hashPrompt,
  ensureKojFactoryDir,
  safeExportName
};
