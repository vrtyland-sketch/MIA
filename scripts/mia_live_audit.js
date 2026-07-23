"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const OBSWebSocket = require("obs-websocket-js").default;
const { loadCatalog, buildObsSourceAudioMap, tierRequiresEmbeddedAudio } = require("./MIA_MEDIA_CATALOG");
const storyArcRegistry = require("./MIA_STORY_ARC_REGISTRY");
const graphicReference = require("./MIA_GRAPHIC_REFERENCE");
const { collectDesiredSlots } = require("./obs_add_gift_video_slots");

const ROOT = path.resolve(__dirname, "..");

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = val;
    }
  }
}

function check(name, ok, detail = "", fix = "") {
  return { name, ok: Boolean(ok), detail, fix: fix || undefined, severity: ok ? "ok" : "fail" };
}

function warn(name, detail = "", fix = "") {
  return { name, ok: true, detail, fix: fix || undefined, severity: "warn" };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url, opts = {}, timeoutMs = 8000) {
  return fetchTimed(url, { ...opts, maxBody: 0 }, timeoutMs).then((res) => {
    if (res.error) {
      return { ...res, ok: false, data: null };
    }
    try {
      const data = JSON.parse(res.body || "{}");
      return { ...res, ok: res.status === 200, data };
    } catch (err) {
      return { ...res, ok: false, data: null, parseError: err.message };
    }
  });
}

function buildIngestHeaders(body = "") {
  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body)
  };
  const ingestSecret = String(process.env.MIA_INGEST_SECRET || "").trim();
  if (ingestSecret) {
    headers["x-mia-ingest-secret"] = ingestSecret;
  }
  return headers;
}

function evaluateStatusPayload(data = {}) {
  const session = data.streamSession || null;
  const phase = String(session?.phase || "").toUpperCase();
  return {
    ok: data.ok === true && data.service === "MIA",
    hasGiftMap: Boolean(data.giftMap),
    hasStreamSession: Boolean(session && phase),
    streamPhase: phase || null,
    obsConnected: Boolean(data.obs?.connected),
    detail: data.ok === true ? "status OK" : "status payload invalid"
  };
}

function evaluateStreamSessionPayload(data = {}) {
  const phase = String(data?.session?.phase || data?.phase || "").toUpperCase();
  return {
    ok: data.ok === true && ["PRELIVE", "LIVE", "ENDED"].includes(phase),
    phase,
    detail: phase ? `phase=${phase}` : "missing stream session phase"
  };
}

function evaluateGiftMapStatusPayload(data = {}) {
  return {
    ok:
      data.ok === true &&
      data.giftMap !== undefined &&
      Array.isArray(data.catalogKeys) &&
      data.catalogKeys.length > 0,
    hasSpamWave: data.spamWave !== undefined,
    hasUserThrottle: data.userThrottle !== undefined,
    detail:
      data.catalogKeys?.length > 0
        ? `${data.catalogKeys.length} catalog keys`
        : "gift-map/status incomplete"
  };
}

function evaluateGiftMapMapping(data = {}, expectedGift = "rose") {
  const mapping = data?.lastMapping || null;
  const key = String(mapping?.giftKey || mapping?.giftName || "").toLowerCase();
  const needle = String(expectedGift || "rose").toLowerCase();
  return {
    ok: key.includes(needle),
    mapping,
    detail: mapping
      ? `${mapping.giftKey || mapping.giftName || "?"} tier=${mapping.streamTier || "?"}`
      : "no lastMapping yet"
  };
}

function evaluateRemoteDevStatusPayload(data = {}) {
  return {
    ok: data.ok === true && data.mode === "remote_dev",
    detail: data.ok ? `queue=${data.queueLength ?? "?"}` : "remote dev unavailable"
  };
}

function evaluateCareIngestBody(body = "") {
  return {
    ok: /"accepted"\s*:\s*true/.test(body || ""),
    detail: body?.slice(0, 120) || "empty body"
  };
}

function evaluateGraphicsBodyStatePayload(data = {}) {
  const bodyLiveAudit = require("../shared/mia-graphics-studio/bodyLiveAudit");
  return bodyLiveAudit.evaluateBodyStatePayload(data);
}

function evaluateOverlayPublicCoinSanitized(snapshot = {}) {
  const bodyLiveAudit = require("../shared/mia-graphics-studio/bodyLiveAudit");
  return bodyLiveAudit.evaluateOverlayPublicSanitized(snapshot);
}

function fetchTimed(url, opts = {}, timeoutMs = 8000) {
  // maxBody: kolik těla si necháme. Default 400 stačí na peek (health/tts),
  // ale JSON.parse velkých odpovědí (/overlay-state ~21 KB) potřebuje plné tělo,
  // jinak parse spadne a check falešně hlásí „nedostupný".
  const maxBody = Number.isFinite(opts.maxBody) ? opts.maxBody : 400;
  return new Promise((resolve) => {
    const t0 = Date.now();
    const req = http.request(url, { ...opts, timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        resolve({
          ms: Date.now() - t0,
          status: res.statusCode,
          body: maxBody > 0 ? body.slice(0, maxBody) : body
        });
      });
    });
    req.on("error", (err) =>
      resolve({ ms: Date.now() - t0, error: err.message })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ms: Date.now() - t0, error: "timeout" });
    });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function tailJsonl(filePath, limit = 5) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { raw: line.slice(0, 120) };
    }
  });
}

function countRecentErrors(filePath, sinceIso) {
  if (!fs.existsSync(filePath)) return 0;
  const since = Date.parse(sinceIso);
  let count = 0;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (Date.parse(row.ts) >= since) count += 1;
    } catch {
      /* ignore */
    }
  }
  return count;
}

async function auditObs() {
  const checks = [];
  const obs = new OBSWebSocket();
  const password = process.env.OBS_WS_PASSWORD || "";

  try {
    await obs.connect(
      process.env.OBS_WS_URL || "ws://127.0.0.1:4455",
      password ? { password } : undefined
    );

    const scenes = (await obs.call("GetSceneList")).scenes.map((s) => s.sceneName);
    const current = (await obs.call("GetCurrentProgramScene"))
      .currentProgramSceneName;
    const inputs = (await obs.call("GetInputList")).inputs.map((i) => i.inputName);
    const inputSet = new Set(inputs);

    const required = [
      "MIA_VOICE",
      "KOJNOZROUT_RUNTIME",
      "KOJNOZROUT_BOWL_V2",
      "NOTEBOOK_CAMERA"
    ];
    const bubbleNames = ["MIA_BUBBLE", "CHAT_OVERLAY", "speech-overlay"];
    const hasBubble = bubbleNames.some((n) => inputSet.has(n));

    for (const name of required) {
      checks.push(
        check(`obs_source_${name}`, inputSet.has(name), inputSet.has(name) ? "OK" : "chybí")
      );
    }

    checks.push(
      check(
        "obs_bubble_source",
        hasBubble,
        hasBubble
          ? bubbleNames.filter((n) => inputSet.has(n)).join(", ")
          : "žádný MIA_BUBBLE / CHAT_OVERLAY",
        "Přidej Browser Source → speech-overlay.html (MIA_BUBBLE)"
      )
    );

    const mainScene = process.env.MIA_SOLO_STREAM_MAIN_SCENE || "SPINAK_ENGINE_GIFTS";
    checks.push(
      check(
        "obs_main_scene",
        scenes.includes(mainScene),
        current === mainScene ? `${mainScene} (aktivní)` : `aktivní=${current}, očekáváno=${mainScene}`,
        `OBS program scene = ${mainScene}`
      )
    );

    const ghostSceneNames = [
      process.env.MIA_SOLO_STREAM_SCENE_IDLE || "SPINAK_AFK",
      process.env.MIA_SOLO_STREAM_SCENE_LOBBY || "SPINAK_LOBBY",
      process.env.MIA_SOLO_STREAM_SCENE_MIA || "MIA_HOST_SCENE"
    ].filter(Boolean);
    const ghostScenes = ghostSceneNames.filter((s) => !scenes.includes(s));
    const sceneSwitchOn =
      String(process.env.MIA_SOLO_STREAM_OBS_SCENE_SWITCH || "").toLowerCase() ===
      "on";

    if (sceneSwitchOn && ghostScenes.length) {
      checks.push(
        warn(
          "solo_stream_ghost_scenes",
          `MIA se snaží přepínat na neexistující scény: ${ghostScenes.join(", ")}`,
          "V .env vypni MIA_SOLO_STREAM_OBS_SCENE_SWITCH=off NEBO vytvoř scény v OBS"
        )
      );
    } else if (sceneSwitchOn) {
      checks.push(check("solo_stream_scenes", true, "idle/lobby/mia scény existují"));
    } else {
      checks.push(
        check(
          "solo_stream_scene_switch",
          true,
          "vypnuto — MIA zůstává na SPINAK_ENGINE_GIFTS"
        )
      );
    }

    const videoSlots = collectDesiredSlots().map((s) => s.sourceName);
    const missingVideo = videoSlots.filter((n) => !inputSet.has(n));
    checks.push(
      check(
        "obs_gift_videos",
        missingVideo.length === 0,
        missingVideo.length
          ? `chybí ${missingVideo.length}: ${missingVideo.slice(0, 4).join(", ")}`
          : `${videoSlots.length}/${videoSlots.length} slotů`,
        "npm run media:add-obs-slots && npm run media:apply-obs"
      )
    );

    if (scenes.includes(mainScene)) {
      const items = (await obs.call("GetSceneItemList", { sceneName: mainScene }))
        .sceneItems;
      // NOTEBOOK_CAMERA se legitimně skrývá: MIA_EYES auto-hide bez signálu
      // a obs:prepare-tiktok ji vypíná kvůli konfliktu zařízení s TikTok Virtual Camera.
      // Musí existovat (kontrola výš), ale skrytá není chyba.
      const mayBeHidden = new Set(["NOTEBOOK_CAMERA"]);
      const hiddenCritical = [];
      for (const item of items) {
        const name = item.sourceName;
        if (videoSlots.includes(name)) continue;
        if (!required.includes(name)) continue;
        if (mayBeHidden.has(name)) continue;
        if (!item.sceneItemEnabled) hiddenCritical.push(name);
      }
      checks.push(
        check(
          "obs_main_scene_layers",
          hiddenCritical.length === 0,
          hiddenCritical.length
            ? `skryté: ${hiddenCritical.join(", ")}`
            : `${items.length} vrstev, MIA_VOICE + overlay OK (gift videa jsou skrytá idle — normální)`,
          "V OBS zapni oči u MIA_VOICE a bubliny"
        )
      );
    }

    await obs.disconnect();
  } catch (err) {
    checks.push(
      check("obs_websocket", false, err.message, "Spusť OBS + WebSocket 4455")
    );
  }

  return checks;
}

async function main() {
  loadLocalEnv();
  const port = process.env.PORT || 3000;
  const base = `http://127.0.0.1:${port}`;
  const checks = [];

  const health = await fetchTimed(`${base}/health`);
  checks.push(
    check(
      "health",
      health.status === 200 && health.ms < 3000,
      health.error || `${health.ms}ms status=${health.status}`,
      "npm run restart"
    )
  );

  const ingestBody = JSON.stringify({
    type: "gift",
    platform: "tiktok",
    giftName: "Rose",
    coins: 1,
    nickname: "LiveAudit",
    username: "liveaudit",
    content: "audit ping"
  });

  const ingestHeaders = buildIngestHeaders(ingestBody);

  const statusRes = await fetchJson(`${base}/status`, {}, 8000);
  const statusEval = evaluateStatusPayload(statusRes.data || {});
  checks.push(
    check(
      "status_endpoint",
      statusRes.ok && statusEval.ok,
      statusRes.error ||
        `${statusEval.detail}; giftMap=${statusEval.hasGiftMap}; obs=${statusEval.obsConnected}; session=${statusEval.streamPhase || "?"}`,
      "npm run restart"
    )
  );

  const streamSessionRes = await fetchJson(`${base}/stream/session`, {}, 8000);
  const streamSessionEval = evaluateStreamSessionPayload(streamSessionRes.data || {});
  checks.push(
    check(
      "stream_session",
      streamSessionRes.ok && streamSessionEval.ok,
      streamSessionRes.error || streamSessionEval.detail,
      "GET /stream/session → PRELIVE|LIVE|ENDED"
    )
  );

  const giftMapRes = await fetchJson(`${base}/gift-map/status`, {}, 8000);
  const giftMapEval = evaluateGiftMapStatusPayload(giftMapRes.data || {});
  checks.push(
    check(
      "gift_map_status",
      giftMapRes.ok && giftMapEval.ok,
      giftMapRes.error || giftMapEval.detail,
      "http://127.0.0.1:3000/gift-map/status"
    )
  );

  const remoteDevRes = await fetchJson(`${base}/mia/remote/dev/status`, {}, 8000);
  const remoteDevEval = evaluateRemoteDevStatusPayload(remoteDevRes.data || {});
  checks.push(
    check(
      "remote_dev_status",
      remoteDevRes.ok && remoteDevEval.ok,
      remoteDevRes.error || remoteDevEval.detail,
      "npm run remote:dev-watch na PC + /mia-remote-dev.html"
    )
  );

  const paintSmoke = require("./MIA_PAINT_SMOKE");
  const paintChecks = await paintSmoke.auditLiveRuntime(base);
  checks.push(...paintChecks);

  const ingest = await fetchTimed(
    `${base}/ingest`,
    {
      method: "POST",
      headers: ingestHeaders,
      body: ingestBody
    },
    5000
  );

  const ingestOk =
    ingest.status === 200 &&
    ingest.ms < 1500 &&
    /"accepted"\s*:\s*true/.test(ingest.body || "");

  checks.push(
    check(
      "ingest_fast_ack",
      ingestOk,
      ingest.error || `${ingest.ms}ms → ${ingest.body?.slice(0, 80)}`,
      "TikFinity URL = http://127.0.0.1:3000/ingest ; npm run restart"
    )
  );

  if (ingestOk) {
    await sleep(1200);
    const giftMapAfter = await fetchJson(`${base}/gift-map/status`, {}, 8000);
    const mappingEval = evaluateGiftMapMapping(giftMapAfter.data || {}, "rose");
    checks.push(
      check(
        "gift_map_last_mapping",
        giftMapAfter.ok && mappingEval.ok,
        mappingEval.detail,
        "Po gift ingest musí /gift-map/status mít lastMapping"
      )
    );
  }

  const careBody = JSON.stringify({
    type: "comment",
    platform: "tiktok",
    content: "podrbi kojnozouta",
    nickname: "LiveAuditCare",
    username: "liveauditcare"
  });
  const careIngest = await fetchTimed(
    `${base}/ingest`,
    {
      method: "POST",
      headers: buildIngestHeaders(careBody),
      body: careBody
    },
    5000
  );
  const careEval = evaluateCareIngestBody(careIngest.body || "");
  checks.push(
    check(
      "care_chat_ingest",
      careEval.ok && careIngest.status === 200,
      careIngest.error || careEval.detail,
      "Chat péče: podrbi kojnozouta / pece"
    )
  );

  const videoTest = await fetchJson(`${base}/video/test?tier=T1`, {}, 25000);
  checks.push(
    videoTest.ok && videoTest.data?.ok === true
      ? check(
          "video_test_t1",
          true,
          videoTest.data?.sourceName
            ? `${videoTest.data.sourceName} (${videoTest.ms}ms)`
            : `${videoTest.ms}ms`
        )
      : warn(
          "video_test_t1",
          videoTest.error ||
            videoTest.data?.error ||
            videoTest.data?.hint ||
            `status=${videoTest.status}`,
          "http://127.0.0.1:3000/video/test?tier=T1 — OBS musí běžet"
        )
  );

  const tts = await fetchTimed(`${base}/tts/test`, {}, 20000);
  checks.push(
    check(
      "tts_test",
      tts.status === 200,
      tts.error || `${tts.ms}ms`,
      "http://127.0.0.1:3000/tts/test — slyš MIA v repro"
    )
  );

  try {
    const overlayRes = await fetchTimed(`${base}/overlay-state`, { maxBody: 0 }, 8000);
    if (overlayRes.error) throw new Error(overlayRes.error);
    const overlayState = JSON.parse(overlayRes.body || "{}");
    const queueLength = Number(overlayState?.voicePlayback?.queueLength || 0);
    const overlaySanitized = evaluateOverlayPublicCoinSanitized(overlayState);
    checks.push(
      check(
        "overlay_state_no_coins",
        overlaySanitized.ok,
        overlaySanitized.detail,
        "Public /overlay-state nesmí expozovat coins — MIA_OVERLAY_PUBLIC_RESPONSE"
      )
    );
    checks.push(
      queueLength >= 3
        ? warn(
            "voice_queue_depth",
            `fronta=${queueLength} — odpovědi zpozděné až o ${queueLength * 15}s`,
            "Počkej na doplnění fronty nebo npm run restart ; TikFinity netestuj spamem"
          )
        : check(
            "voice_queue_depth",
            true,
            `fronta=${queueLength}`,
            "MIA_VOICE Control audio ON v OBS"
          )
    );
  } catch (_err) {
    checks.push(
      warn("overlay_state_no_coins", "overlay-state nedostupný", "npm run restart")
    );
    checks.push(
      warn("voice_queue_depth", "overlay-state nedostupný", "npm run restart")
    );
  }

  const bodyStateRes = await fetchJson(`${base}/mia/graphics/body/state`, {}, 8000);
  const bodyStateEval = evaluateGraphicsBodyStatePayload(bodyStateRes.data || {});
  checks.push(
    check(
      "graphics_body_state",
      bodyStateRes.ok && bodyStateEval.ok,
      bodyStateRes.error || bodyStateEval.detail,
      "GET /mia/graphics/body/state — hybrid sync kanál pro MIA_HEAD…MIA_FEET"
    )
  );

  const catalog = loadCatalog();
  const audioMap = buildObsSourceAudioMap(catalog);
  const musicCount = Object.values(audioMap).filter(Boolean).length;
  const silentCount = Object.values(audioMap).filter((v) => v === false).length;

  checks.push(
    check(
      "gift_video_audio_map",
      Object.keys(audioMap).length >= 31,
      `hudba=${musicCount}, ticho=${silentCount}, celkem=${Object.keys(audioMap).length}`,
      "npm run media:scan pro ffprobe detekci audia"
    )
  );

  const silentHighTier = (catalog?.obsAssignments || []).filter(
    (row) => tierRequiresEmbeddedAudio(row.tier) && row.hasEmbeddedAudio === false
  );
  checks.push(
    silentHighTier.length
      ? warn(
          "gift_video_t2plus_silent",
          `${silentHighTier.length} T2+ slotů bez audia: ${silentHighTier
            .slice(0, 4)
            .map((r) => r.obsSource)
            .join(", ")}`,
          "npm run media:scan — od T2 jen videa se zvukem (bublina)"
        )
      : check(
          "gift_video_t2plus_silent",
          true,
          "T2+ OBS sloty mají embedded audio",
          "T1 může být tiché (Koj mluví); T2+ musí mít hudbu"
        )
  );

  const narrativeArcs =
    catalog?.narrativeArcs ||
    storyArcRegistry.buildNarrativeArcs(
      (catalog?.items || []).filter((row) => row.kind === "videos")
    );
  const bossArcs = narrativeArcs.filter((arc) => arc.bossMissionReady).length;
  const graphicPool =
    catalog?.graphicReferencePool ||
    graphicReference.buildGraphicReferencePool(
      (catalog?.items || []).filter((row) => row.kind === "videos")
    );
  checks.push(
    check(
      "narrative_boss_arcs",
      bossArcs > 0,
      `bossMissionArcs=${bossArcs}`,
      "npm run media:scan — seskupí podobná videa do příběhových oblouků"
    )
  );
  checks.push(
    check(
      "graphic_reference_prague_pool",
      graphicPool.length >= 1,
      `graphicReferencePool=${graphicPool.length}`,
      "Označ animovaná Praha videa v media-intake-overrides (theme prague_pixverse / tags prague+pixverse)"
    )
  );

  checks.push(...(await auditObs()));

  const recentIngest = tailJsonl(
    path.join(ROOT, "logs", `ingest-${new Date().toISOString().slice(0, 10)}.jsonl`),
    3
  );
  const recentEvents = tailJsonl(
    path.join(ROOT, "logs", `mia-events-${new Date().toISOString().slice(0, 10)}.jsonl`),
    5
  );

  const failed = checks.filter((c) => !c.ok);
  const warnings = checks.filter((c) => c.severity === "warn");

  const report = {
    ok: failed.length === 0,
    generatedAt: new Date().toISOString(),
    passed: checks.filter((c) => c.ok && c.severity !== "warn").length,
    failed: failed.length,
    warnings: warnings.length,
    checks,
    recentIngest: recentIngest.map((r) => ({
      ts: r.ts,
      eventType: r.eventType,
      user: r.user?.nickname || r.user?.username,
      gift: r.rawEvent?.giftName
    })),
    recentPipeline: recentEvents.map((r) => ({
      stage: r.stage,
      speaker: r.speaker,
      tier: r.tier,
      sourceName: r.sourceName
    })),
    tikfinity: {
      url: `${base}/ingest`,
      hint: "V TikFinity → API / Webhook → POST na ingest. Chyba problikne když MIA neběží nebo odpovídá >5s."
    }
  };

  const summary = [
    "",
    "=== MIA Live Smoke Checklist ===",
    report.ok ? "PASS" : "FAIL",
    `checks: ${checks.length} | failed: ${failed.length} | warnings: ${warnings.length}`,
    "",
    ...checks.map((c) => {
      const mark = !c.ok ? "FAIL" : c.severity === "warn" ? "WARN" : " OK ";
      return `[${mark}] ${c.name}${c.detail ? ` — ${c.detail}` : ""}`;
    }),
    ""
  ].join("\n");

  console.log(summary);
  console.log(JSON.stringify(report, null, 2));
  process.exit(failed.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err?.stack || err);
    process.exit(1);
  });
}

module.exports = {
  evaluateStatusPayload,
  evaluateStreamSessionPayload,
  evaluateGiftMapStatusPayload,
  evaluateGiftMapMapping,
  evaluateRemoteDevStatusPayload,
  evaluateCareIngestBody,
  evaluateGraphicsBodyStatePayload,
  evaluateOverlayPublicCoinSanitized
};
