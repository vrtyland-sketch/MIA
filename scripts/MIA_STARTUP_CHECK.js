"use strict";

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INBOX = path.join(PROJECT_ROOT, "incoming-images");

const READINESS_WEIGHTS = {
  server: 5,
  obs: 25,
  video_engine: 15,
  media_catalog: 15,
  overlays: 10,
  tts: 15,
  media_files: 5,
  kick_bridge: 5,
  ingest_auth: 5
};

const STREAM_READY_REQUIRED = new Set([
  "server",
  "obs",
  "video_engine",
  "media_catalog",
  "overlays",
  "tts"
]);

const OVERLAY_MANIFEST = [
  { id: "startup", label: "Startup check", file: "startup-check.html", obs: true },
  { id: "speech", label: "Speech bubliny", file: "speech-overlay.html", obs: true },
  { id: "entity", label: "LIVE badge", file: "entity-overlay.html", obs: true },
  { id: "combo", label: "COMBO + spam", file: "combo-overlay.html", obs: true },
  { id: "boss_cinematic", label: "Boss cinematic", file: "boss-cinematic-overlay.html", obs: true },
  { id: "immersive_scene", label: "Immersive scene", file: "immersive-scene-overlay.html", obs: true },
  { id: "host_mode", label: "HOST / NEJSEM TU", file: "host-mode-overlay.html", obs: true },
  { id: "away_loop", label: "Away loop pozadí", file: "away-loop-overlay.html", obs: true },
  { id: "bowl", label: "Koj miska", file: "kojnozrout-bowl-overlay.html", obs: true },
  { id: "runtime", label: "Koj runtime", file: "kojnozrout-runtime.html", obs: true },
  { id: "voice", label: "TTS voice", file: "mia-voice-overlay.html", obs: true },
  { id: "gift_moment", label: "Gift moment", file: "gift-moment-overlay.html", obs: true },
  { id: "gift_animation", label: "Gift animation", file: "gift-animation-overlay.html", obs: true },
  { id: "evolution", label: "Evolution toast", file: "evolution-toast-overlay.html", obs: true },
  { id: "backpack", label: "Koj batoh", file: "kojnozrout-backpack-overlay.html", obs: true },
  { id: "story", label: "Story moment", file: "story-moment-overlay.html", obs: true },
  { id: "t0_flyby", label: "T0 flyby", file: "t0-flyby-overlay.html", obs: true },
  { id: "duel", label: "Duel bar", file: "kojnozrout-duel-overlay.html", obs: true },
  { id: "viewer_strip", label: "Viewer strip", file: "viewer-strip-overlay.html", obs: true },
  { id: "graphics_preview", label: "Graphics preview", file: "mia-graphics-preview.html", obs: true },
  { id: "mia_torso", label: "MIA torso", file: "mia-body-part-overlay.html", obs: true },
  { id: "mia_head", label: "MIA hlava", file: "mia-body-part-overlay.html", obs: true },
  { id: "mia_eyes", label: "MIA oči", file: "mia-body-part-overlay.html", obs: true },
  { id: "mia_hands", label: "MIA ruce", file: "mia-body-part-overlay.html", obs: true },
  { id: "mia_feet", label: "MIA nohy", file: "mia-body-part-overlay.html", obs: true },
  { id: "chat", label: "Chat overlay", file: "chat-overlay.html", obs: false },
  { id: "dashboard", label: "Streamer dashboard", file: "mia-streamer-dashboard.html", obs: false }
];

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function countMedia(kind) {
  const dir = path.join(INBOX, kind);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((n) => !n.startsWith(".")).length;
}

function fileExists(rel) {
  return fs.existsSync(path.join(PROJECT_ROOT, rel));
}

function checkItem(id, label, ok, detail = "", group = "system") {
  return {
    id,
    label,
    ok: Boolean(ok),
    status: ok ? "ok" : "fail",
    detail: safeString(detail),
    group
  };
}

function buildOverlayManifest(ctx = {}) {
  const baseUrl = safeString(ctx.baseUrl, "http://127.0.0.1:3000").replace(/\/$/, "");

  return OVERLAY_MANIFEST.map((entry) => {
    const rel = `mia-output-overlay/${entry.file}`;
    const exists = fileExists(rel);
    return {
      id: entry.id,
      label: entry.label,
      file: entry.file,
      url: `${baseUrl}/${entry.file}`,
      obsRecommended: entry.obs === true,
      ok: exists,
      detail: exists ? "soubor OK" : "chybí HTML"
    };
  });
}

function buildPreflightSuiteRows(preflight = null) {
  if (!preflight || !Array.isArray(preflight.results)) {
    return [];
  }

  return preflight.results.map((row) =>
    checkItem(
      `preflight_${row.name}`,
      row.name,
      row.ok === true,
      `${row.ms || 0} ms`,
      "preflight"
    )
  );
}

function resolvePreflightPhase(preflight = null, includePreflight = false) {
  if (!includePreflight) return "done";
  if (!preflight) return "pending";
  if (preflight.running === true) return "running";
  if (preflight.finishedAt) return preflight.ok === false ? "failed" : "done";
  return "pending";
}

function computeReadiness(checks = [], ctx = {}) {
  const scored = [];
  let earned = 0;
  let total = 0;

  for (const check of checks) {
    const weight = READINESS_WEIGHTS[check.id];
    if (!weight) continue;
    if (check.id === "kick_bridge" && ctx.kickBridgeEnabled !== true) {
      earned += weight;
      total += weight;
      scored.push({ id: check.id, label: check.label, ok: true, weight, detail: "vypnuto" });
      continue;
    }
    total += weight;
    if (check.ok) earned += weight;
    scored.push({
      id: check.id,
      label: check.label,
      ok: check.ok,
      weight,
      detail: check.detail
    });
  }

  const readinessPercent = total > 0 ? Math.round((earned / total) * 100) : 0;
  const streamReady = [...STREAM_READY_REQUIRED].every((id) => {
    const row = checks.find((check) => check.id === id);
    return row?.ok === true;
  });

  return {
    readinessPercent,
    streamReady,
    streamReadyLabel: streamReady ? "Připravena streamovat" : "Ještě ne připravena",
    scored,
    earned,
    total
  };
}

function buildStartupCheck(ctx = {}) {
  const checks = [];
  const warnings = [];
  const includePreflight = ctx.includePreflight === true;
  const preflight = includePreflight ? ctx.preflight || null : null;
  const phase = resolvePreflightPhase(preflight, includePreflight);
  const baseUrl = safeString(ctx.baseUrl, `http://127.0.0.1:${ctx.port || 3000}`);

  checks.push(checkItem("server", "MIA server", true, `online · port ${ctx.port || 3000}`));
  checks.push(
    checkItem("obs", "OBS WebSocket", ctx.obsConnected === true, ctx.obsConnected ? "připojeno" : "offline")
  );

  const video = ctx.videoSnapshot || {};
  const tierCounts = video.tierSources || {};
  const tierTotal = Object.values(tierCounts).reduce(
    (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
    0
  );
  checks.push(
    checkItem(
      "video_engine",
      "Video engine",
      tierTotal >= 4,
      `sloty ${tierTotal}, fronta ${video.pendingJobs ?? 0}`
    )
  );

  const catalog = ctx.mediaCatalog || null;
  const obsAssigned = catalog?.obsAssignments?.length || 0;
  checks.push(
    checkItem(
      "media_catalog",
      "Media katalog",
      obsAssigned >= 10,
      catalog
        ? `${obsAssigned}/31 OBS, ${catalog.totalPhotos || 0} fotek, ${catalog.totalVideos || 0} videí`
        : "chybí — spusť npm run media:scan"
    )
  );

  const photos = countMedia("photos");
  const videos = countMedia("videos");
  checks.push(
    checkItem("media_files", "Soubory v inboxu", photos >= 1 && videos >= 1, `${photos} fotek, ${videos} videí`)
  );

  const overlays = buildOverlayManifest({ baseUrl });
  const obsOverlaysOk = overlays.filter((o) => o.obsRecommended).every((o) => o.ok);
  checks.push(
    checkItem(
      "overlays",
      "Overlay HTML",
      obsOverlaysOk,
      `${overlays.filter((o) => o.ok).length}/${overlays.length} souborů`
    )
  );

  checks.push(
    checkItem(
      "tts",
      "TTS hlas",
      ctx.ttsEnabled === true,
      ctx.ttsEnabled ? safeString(ctx.ttsSpeaker, "enabled") : "vypnuto v .env"
    )
  );

  checks.push(
    checkItem(
      "kick_bridge",
      "Kick / chat bridge",
      !ctx.kickBridgeEnabled || ctx.kickBridgeConnected === true,
      ctx.kickBridgeEnabled
        ? ctx.kickBridgeConnected
          ? "připojeno"
          : "offline"
        : "vypnuto"
    )
  );

  const bindHost = safeString(ctx.bindHost, "127.0.0.1");
  checks.push(
    checkItem(
      "ingest_auth",
      "Bezpečnost ingestu",
      bindHost !== "0.0.0.0" && bindHost !== "::",
      ctx.ingestSecretConfigured ? "secret + localhost" : "localhost only"
    )
  );

  const preflightSuites = includePreflight ? buildPreflightSuiteRows(preflight) : [];

  if (includePreflight) {
    if (phase === "pending" || phase === "running") {
      warnings.push(
        phase === "running"
          ? "Preflight testy právě běží…"
          : "Preflight testy se spustí po startu serveru"
      );
    } else if (preflight?.ok === false) {
      checks.push(
        checkItem(
          "preflight_tests",
          "Preflight souhrn",
          false,
          `${preflight.failed || 0} selhalo · ${preflight.passed || 0}/${preflight.total || 0} OK`
        )
      );
      warnings.push(`Selhalo: ${(preflight.results || []).filter((r) => !r.ok).map((r) => r.name).join(", ")}`);
    } else if (preflight?.ok === true) {
      checks.push(
        checkItem(
          "preflight_tests",
          "Preflight souhrn",
          true,
          `${preflight.passed || 0}/${preflight.total || 0} OK · ${preflight.durationMs || 0} ms · ${preflight.mode || "full"}`
        )
      );
    }
  }

  const readiness = computeReadiness(checks, ctx);
  const failed = checks.filter((c) => !c.ok);
  const failedPreflight = preflightSuites.filter((c) => !c.ok);
  const ok = readiness.streamReady && failedPreflight.length === 0;

  if (!readiness.streamReady && failed.length) {
    warnings.push(
      `Chybí: ${failed
        .filter((row) => STREAM_READY_REQUIRED.has(row.id))
        .map((row) => row.label)
        .join(", ")}`
    );
  }

  return {
    ok,
    phase,
    online: true,
    readinessPercent: readiness.readinessPercent,
    streamReady: readiness.streamReady,
    streamReadyLabel: readiness.streamReadyLabel,
    readiness: readiness.scored,
    generatedAt: new Date().toISOString(),
    checks,
    preflightSuites,
    overlays,
    warnings,
    summary: {
      readinessPercent: readiness.readinessPercent,
      streamReady: readiness.streamReady,
      passed: checks.filter((c) => c.ok).length,
      total: checks.length,
      failed: failed.map((c) => c.id).concat(failedPreflight.map((c) => c.id)),
      preflightPassed: preflight?.passed || 0,
      preflightTotal: preflight?.total || 0,
      overlaysOk: overlays.filter((o) => o.ok).length,
      overlaysTotal: overlays.length
    },
    preflight: includePreflight && preflight
      ? {
          ok: preflight.ok,
          passed: preflight.passed,
          failed: preflight.failed,
          total: preflight.total,
          durationMs: preflight.durationMs,
          mode: preflight.mode || "full",
          finishedAt: preflight.finishedAt,
          running: preflight.running === true
        }
      : null,
    urls: {
      startupSlide: ctx.startupSlideUrl || "",
      diagnose: ctx.diagnoseUrl || "",
      videoTest: ctx.videoTestUrl || "",
      mediaSummary: ctx.mediaSummaryUrl || "",
      dashboard: `${baseUrl}/mia-streamer-dashboard.html`
    },
    slideDurationMs: Math.max(60000, Number(ctx.slideDurationMs || 360000)),
    media: catalog
      ? {
          obsAssigned,
          totalPhotos: catalog.totalPhotos,
          totalVideos: catalog.totalVideos,
          profilePool: catalog.profilePool?.length || 0
        }
      : null
  };
}

module.exports = {
  buildStartupCheck,
  buildOverlayManifest,
  computeReadiness,
  countMedia,
  INBOX,
  OVERLAY_MANIFEST,
  READINESS_WEIGHTS,
  STREAM_READY_REQUIRED
};
