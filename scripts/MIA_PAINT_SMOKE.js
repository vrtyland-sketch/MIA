"use strict";

/**
 * MIA Paint live smoke — ověří runtime API + statické assety editoru.
 * Vyžaduje běžící MIA server (localhost).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAINT_DIR = path.join(ROOT, "mia-output-overlay", "mia-paint");

const REQUIRED_LIBS = [
  "lib/mia-paint-core.js",
  "lib/mia-paint-gpu.js",
  "lib/mia-paint-io-browser.js",
  "lib/mia-paint-plugin-host.js",
  "lib/mia-paint-native-shell.js",
  "lib/mia-svg-primitives.js",
  "lib/mia-graphics-client.js",
  "app.js",
  "index.html"
];

const REQUIRED_HTML_SCRIPTS = [
  "mia-paint-native-shell.js",
  "mia-paint-core.js",
  "mia-paint-gpu.js",
  "mia-paint-io-browser.js",
  "mia-paint-plugin-host.js",
  "app.js"
];

function check(name, ok, detail = "", fix = "") {
  return { name, ok: Boolean(ok), detail, fix: fix || undefined, severity: ok ? "ok" : "fail" };
}

function warn(name, detail = "", fix = "") {
  return { name, ok: true, detail, fix: fix || undefined, severity: "warn" };
}

function resolveBaseUrl(env = process.env) {
  const port = Number(env.PORT || 3000);
  return `http://127.0.0.1:${port}`;
}

async function fetchJson(url, opts = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const body = await res.text();
    let data = null;
    try {
      data = JSON.parse(body);
    } catch (_err) {
      data = null;
    }
    return { ok: res.ok, status: res.status, data, body, error: res.ok ? null : `http_${res.status}` };
  } catch (err) {
    return { ok: false, status: 0, data: null, body: "", error: err?.message || "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}

function evaluatePaintStatusPayload(data = {}) {
  const doc = data.document || null;
  return {
    ok: data.ok === true && Boolean(doc?.layerCount != null),
    hasDocument: Boolean(doc),
    layerCount: doc?.layerCount ?? null,
    connected: !!data.connected,
    agentCommands: Array.isArray(data.agentCommands) ? data.agentCommands.length : 0
  };
}

function evaluatePaintWsPayload(data = {}) {
  return {
    ok: data.ok === true && data.path === "/mia/paint/ws",
    attached: !!data.attached,
    clients: Number(data.clients) || 0
  };
}

function evaluatePaintPluginsPayload(data = {}) {
  const plugins = Array.isArray(data.plugins) ? data.plugins : [];
  return {
    ok: data.ok === true && plugins.length >= 2,
    count: plugins.length,
    ids: plugins.map((p) => p.id).filter(Boolean)
  };
}

function evaluatePaintAgentSnapshot(data = {}) {
  return {
    ok: data.ok === true && Boolean(data.document?.id || data.document?.name),
    hasLayers: Array.isArray(data.document?.layers),
    tool: data.activeTool || null
  };
}

function evaluatePaintCommandResult(data = {}) {
  return {
    ok: data.ok === true,
    action: data.action || null,
    projects: Array.isArray(data.projects) ? data.projects.length : null
  };
}

function evaluatePaintTauriInfo(data = {}) {
  return {
    ok: data.ok === true && String(data.scaffold || "").includes("mia-paint-tauri"),
    launch: data.launch || null
  };
}

function evaluatePaintEditorHtml(html = "") {
  const missing = REQUIRED_HTML_SCRIPTS.filter((s) => !html.includes(s));
  return {
    ok: missing.length === 0 && html.includes("gpuCanvas") && html.includes("layerList"),
    missing,
    byteLength: Buffer.byteLength(html, "utf8")
  };
}

function auditStaticAssets() {
  const checks = [];
  for (const rel of REQUIRED_LIBS) {
    const full = path.join(PAINT_DIR, rel);
    checks.push(
      check(
        `paint_asset_${rel.replace(/[^\w]+/g, "_")}`,
        fs.existsSync(full),
        fs.existsSync(full) ? `${Math.round(fs.statSync(full).size / 1024)} KB` : "missing",
        "npm run build:mia-paint"
      )
    );
  }

  if (fs.existsSync(path.join(PAINT_DIR, "index.html"))) {
    const html = fs.readFileSync(path.join(PAINT_DIR, "index.html"), "utf8");
    const evalHtml = evaluatePaintEditorHtml(html);
    checks.push(
      check(
        "paint_editor_html",
        evalHtml.ok,
        evalHtml.ok ? `${evalHtml.byteLength} B` : `missing scripts: ${evalHtml.missing.join(", ")}`,
        "mia-output-overlay/mia-paint/index.html"
      )
    );
  }

  const tauriIcons = path.join(ROOT, "tools", "mia-paint-tauri", "src-tauri", "icons", "128x128.png");
  checks.push(
    warn(
      "paint_tauri_icons",
      fs.existsSync(tauriIcons) ? "icons ready for release build" : "run npm run paint:tauri:icons",
      "npm run paint:tauri:icons"
    )
  );

  return checks;
}

async function auditLiveRuntime(base = resolveBaseUrl()) {
  const checks = [];

  const statusRes = await fetchJson(`${base}/mia/paint/status`);
  const statusEval = evaluatePaintStatusPayload(statusRes.data || {});
  checks.push(
    check(
      "paint_status",
      statusRes.ok && statusEval.ok,
      statusRes.error || `layers=${statusEval.layerCount} agentCmds=${statusEval.agentCommands}`,
      `${base}/mia-paint/`
    )
  );

  const wsRes = await fetchJson(`${base}/mia/paint/ws/status`);
  const wsEval = evaluatePaintWsPayload(wsRes.data || {});
  checks.push(
    check(
      "paint_ws_status",
      wsRes.ok && wsEval.ok,
      wsRes.error || `attached=${wsEval.attached} clients=${wsEval.clients}`,
      "restart MIA — MIA_PAINT_WS attach"
    )
  );

  const pluginsRes = await fetchJson(`${base}/mia/paint/plugins`);
  const pluginsEval = evaluatePaintPluginsPayload(pluginsRes.data || {});
  checks.push(
    check(
      "paint_plugins",
      pluginsRes.ok && pluginsEval.ok,
      pluginsRes.error || `count=${pluginsEval.count} [${pluginsEval.ids.join(", ")}]`,
      "plugins/mia-paint/"
    )
  );

  const snapRes = await fetchJson(`${base}/mia/paint/agent/snapshot`);
  const snapEval = evaluatePaintAgentSnapshot(snapRes.data || {});
  checks.push(
    check(
      "paint_agent_snapshot",
      snapRes.ok && snapEval.ok,
      snapRes.error || `tool=${snapEval.tool}`,
      `${base}/mia/paint/agent/snapshot`
    )
  );

  const cmdRes = await fetchJson(`${base}/mia/paint/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list_projects" })
  });
  const cmdEval = evaluatePaintCommandResult(cmdRes.data || {});
  checks.push(
    check(
      "paint_command_bridge",
      cmdRes.ok && cmdEval.ok,
      cmdRes.error || `projects=${cmdEval.projects}`,
      "scripts/MIA_PAINT_BRIDGE.js"
    )
  );

  const tauriRes = await fetchJson(`${base}/mia/paint/native/tauri`);
  const tauriEval = evaluatePaintTauriInfo(tauriRes.data || {});
  checks.push(
    check(
      "paint_tauri_info",
      tauriRes.ok && tauriEval.ok,
      tauriRes.error || tauriEval.launch,
      "npm run paint:tauri"
    )
  );

  const coreRes = await fetchJson(`${base}/mia-paint/lib/mia-paint-core.js`, {}, 10000);
  checks.push(
    check(
      "paint_core_bundle_served",
      coreRes.ok && (coreRes.body || "").includes("createDocument"),
      coreRes.error || `${Math.round((coreRes.body || "").length / 1024)} KB`,
      "npm run build:mia-paint"
    )
  );

  const editorRes = await fetchJson(`${base}/mia-paint/`, {}, 8000);
  const editorEval = evaluatePaintEditorHtml(editorRes.body || "");
  checks.push(
    check(
      "paint_editor_served",
      editorRes.ok && editorEval.ok,
      editorRes.error || `${editorEval.byteLength} B`,
      `${base}/mia-paint/`
    )
  );

  return checks;
}

async function runPaintSmoke(options = {}) {
  const base = options.baseUrl || resolveBaseUrl();
  const staticOnly = options.staticOnly === true;
  const checks = auditStaticAssets();

  if (!staticOnly) {
    const live = await auditLiveRuntime(base);
    checks.push(...live);
  }

  const failed = checks.filter((c) => !c.ok);
  const warnings = checks.filter((c) => c.severity === "warn");

  return {
    ok: failed.length === 0,
    base,
    staticOnly,
    passed: checks.filter((c) => c.ok && c.severity !== "warn").length,
    failed: failed.length,
    warnings: warnings.length,
    checks
  };
}

function printReport(report) {
  const lines = [
    "",
    "=== MIA Paint Smoke ===",
    report.ok ? "PASS" : "FAIL",
    `base: ${report.base}${report.staticOnly ? " (static only)" : ""}`,
    `checks: ${report.checks.length} | failed: ${report.failed} | warnings: ${report.warnings}`,
    "",
    ...report.checks.map((c) => {
      const mark = !c.ok ? "FAIL" : c.severity === "warn" ? "WARN" : " OK ";
      return `[${mark}] ${c.name}${c.detail ? ` — ${c.detail}` : ""}`;
    }),
    ""
  ];
  console.log(lines.join("\n"));
}

async function main(argv = process.argv) {
  const staticOnly = argv.includes("--static");
  const report = await runPaintSmoke({ staticOnly });
  printReport(report);
  if (!report.ok) process.exit(1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.stack || err);
    process.exit(1);
  });
}

module.exports = {
  ROOT,
  PAINT_DIR,
  REQUIRED_LIBS,
  resolveBaseUrl,
  evaluatePaintStatusPayload,
  evaluatePaintWsPayload,
  evaluatePaintPluginsPayload,
  evaluatePaintAgentSnapshot,
  evaluatePaintCommandResult,
  evaluatePaintTauriInfo,
  evaluatePaintEditorHtml,
  auditStaticAssets,
  auditLiveRuntime,
  runPaintSmoke,
  printReport
};
