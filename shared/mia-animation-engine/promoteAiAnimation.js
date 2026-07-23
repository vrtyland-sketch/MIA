"use strict";

/**
 * Phase 12w — promote AI true-alpha staging clips into Animation Bank.
 * Default quality: ai | procedural. Never auto-marks production (live gift sheets).
 */

const fs = require("fs");
const path = require("path");
const { packClipDirectory } = require("./spriteSheetPack");
const { DEFAULT_BANK_ROOT, loadBankIndex } = require("./AnimationBank");

const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_STAGING_ROOT = path.join(ROOT, "data", "mia-ai-animations");

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeClipId(clipId = "", category = "ai") {
  const id = safeString(clipId, "clip")
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
  if (!id) return `${category}/clip`;
  if (!id.includes("/")) return `${category}/${id}`;
  return id;
}

function listFrameFiles(framesDir) {
  if (!fs.existsSync(framesDir)) return [];
  return fs
    .readdirSync(framesDir)
    .filter((f) => /\.png$/i.test(f))
    .sort();
}

function resolveStagingDir(input = {}) {
  if (input.stagingDir) return path.resolve(input.stagingDir);
  const stagingRoot = input.stagingRoot || DEFAULT_STAGING_ROOT;
  const stagingId = safeString(input.stagingId || input.clipId || input.id);
  if (!stagingId) return null;
  return path.join(stagingRoot, stagingId.split("/").pop());
}

function readStagingMetadata(stagingDir) {
  const metaPath = path.join(stagingDir, "metadata.json");
  if (!fs.existsSync(metaPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (_err) {
    return {};
  }
}

/**
 * Phase 12z — list AI staging clips under data/mia-ai-animations.
 */
function listAiStagingClips(input = {}) {
  const stagingRoot = input.stagingRoot || DEFAULT_STAGING_ROOT;
  const { evaluateProductionReadiness } = require("./productionGate");
  if (!fs.existsSync(stagingRoot)) {
    return { ok: true, phase: "12z", stagingRoot, clipCount: 0, clips: [] };
  }

  const clips = [];
  for (const name of fs.readdirSync(stagingRoot)) {
    const dir = path.join(stagingRoot, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const framesDir = path.join(dir, "frames");
    const frames = listFrameFiles(framesDir);
    if (!frames.length) continue;
    const meta = readStagingMetadata(dir);
    const gate = evaluateProductionReadiness(meta);
    clips.push({
      stagingId: name,
      frameCount: frames.length,
      quality: meta.quality || null,
      source: meta.source || null,
      motion: meta.motion || null,
      avgAlphaRatio: meta.avgAlphaRatio ?? null,
      trueAlpha: meta.trueAlpha !== false,
      prompt: meta.prompt || null,
      productionReady: gate.ready,
      blockers: gate.blockers,
      warnings: gate.warnings,
      sheetUrl: fs.existsSync(path.join(dir, "built", "sprite_sheet.png"))
        ? `/mia/animation/staging/${encodeURIComponent(name)}/sheet`
        : null,
      paintUrl: `/mia-paint/?aiStaging=${encodeURIComponent(name)}`,
      path: path.relative(ROOT, dir).replace(/\\/g, "/")
    });
  }

  clips.sort((a, b) => String(b.stagingId).localeCompare(String(a.stagingId)));
  return {
    ok: true,
    phase: "12z",
    stagingRoot: path.relative(ROOT, stagingRoot).replace(/\\/g, "/"),
    clipCount: clips.length,
    clips
  };
}

/**
 * Phase 13j — load one AI staging clip (frames for Paint timeline / dashboard polish).
 */
function getAiStagingClip(input = {}) {
  const stagingDir = resolveStagingDir(input);
  if (!stagingDir || !fs.existsSync(stagingDir)) {
    return { ok: false, error: "staging_not_found", phase: "13j" };
  }
  const stagingId = path.basename(stagingDir);
  const framesDir = path.join(stagingDir, "frames");
  const files = listFrameFiles(framesDir);
  if (!files.length) {
    return { ok: false, error: "no_frames", stagingId, phase: "13j" };
  }

  const meta = readStagingMetadata(stagingDir);
  const maxFrames = Math.max(1, Math.min(24, Number(input.maxFrames) || 24));
  const selected = files.slice(0, maxFrames);
  const includeFramesBase64 = input.includeFramesBase64 !== false;
  const framesBase64 = includeFramesBase64
    ? selected.map((file) => fs.readFileSync(path.join(framesDir, file)).toString("base64"))
    : null;

  let sheetUrl = null;
  let publicSheetUrl = null;
  let publicManifestUrl = null;
  const sheetPath = path.join(stagingDir, "built", "sprite_sheet.png");
  if (fs.existsSync(sheetPath)) {
    sheetUrl = `/mia/animation/staging/${encodeURIComponent(stagingId)}/sheet`;
    publicSheetUrl = `/assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/sprite_sheet.png`;
    if (fs.existsSync(path.join(stagingDir, "built", "sprite.json"))) {
      publicManifestUrl = `/assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/sprite.json`;
    }
  }

  const fps = Math.max(1, Math.min(30, Number(meta.fps) || 12));
  return {
    ok: true,
    phase: "13j",
    stagingId,
    prompt: meta.prompt || null,
    motion: meta.motion || null,
    quality: meta.quality || null,
    provider: meta.provider || null,
    trueAlpha: meta.trueAlpha !== false,
    avgAlphaRatio: meta.avgAlphaRatio ?? null,
    fps,
    width: meta.width || null,
    height: meta.height || null,
    frameCount: selected.length,
    frameFiles: selected,
    framesBase64,
    sheetUrl,
    publicSheetUrl,
    publicManifestUrl,
    paintUrl: `/mia-paint/?aiStaging=${encodeURIComponent(stagingId)}`,
    path: path.relative(ROOT, stagingDir).replace(/\\/g, "/"),
    metadata: meta
  };
}

/**
 * Phase 13k — write polished Paint timeline frames back into AI staging + rebuild sheet.
 * Does not promote or mark production.
 */
async function writeAiStagingFrames(input = {}) {
  const stagingIdRaw = safeString(input.stagingId || input.clipId || input.id);
  if (!stagingIdRaw) {
    return { ok: false, error: "missing_staging_id", phase: "13k" };
  }
  const stagingId = stagingIdRaw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!stagingId) {
    return { ok: false, error: "invalid_staging_id", phase: "13k" };
  }

  const framesBase64 = Array.isArray(input.framesBase64)
    ? input.framesBase64.filter((x) => typeof x === "string" && x.length > 20)
    : [];
  if (!framesBase64.length) {
    return { ok: false, error: "missing_frames", phase: "13k", stagingId };
  }
  if (framesBase64.length > 24) {
    return { ok: false, error: "too_many_frames", phase: "13k", stagingId, max: 24 };
  }

  const stagingRoot = input.stagingRoot || DEFAULT_STAGING_ROOT;
  const stagingDir = path.join(stagingRoot, stagingId);
  const framesDir = path.join(stagingDir, "frames");
  const builtDir = path.join(stagingDir, "built");
  ensureDir(framesDir);
  ensureDir(builtDir);

  // Clear previous PNGs so promote uses only polished set
  for (const file of listFrameFiles(framesDir)) {
    fs.unlinkSync(path.join(framesDir, file));
  }

  const framePaths = [];
  for (let i = 0; i < framesBase64.length; i += 1) {
    const file = path.join(framesDir, `${String(i).padStart(4, "0")}.png`);
    fs.writeFileSync(file, Buffer.from(framesBase64[i], "base64"));
    framePaths.push(file);
  }

  const prevMeta = readStagingMetadata(stagingDir);
  const fps = Math.max(1, Math.min(30, Number(input.fps || prevMeta.fps) || 12));
  let width = Number(input.width) || Number(prevMeta.width) || null;
  let height = Number(input.height) || Number(prevMeta.height) || null;
  let avgAlphaRatio = prevMeta.avgAlphaRatio ?? null;

  try {
    const sharp = require("sharp");
    const sample = await sharp(framePaths[0]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    width = sample.info.width;
    height = sample.info.height;
    let transparent = 0;
    for (let i = 3; i < sample.data.length; i += 4) {
      if (sample.data[i] < 8) transparent += 1;
    }
    avgAlphaRatio = transparent / (sample.info.width * sample.info.height);
  } catch (_err) {
    /* keep previous size/alpha */
  }

  const meta = {
    ...prevMeta,
    id: stagingId,
    phase: "13k",
    fps,
    frameCount: framePaths.length,
    width,
    height,
    avgAlphaRatio,
    trueAlpha: prevMeta.trueAlpha !== false,
    quality: prevMeta.quality || "procedural",
    source: "paint_polish",
    polishSource: "paint_timeline",
    polishedAt: new Date().toISOString(),
    prompt: safeString(input.prompt, prevMeta.prompt || ""),
    motion: safeString(input.motion, prevMeta.motion || "idle")
  };
  fs.writeFileSync(path.join(stagingDir, "metadata.json"), `${JSON.stringify(meta, null, 2)}\n`);

  const { packSpriteSheet } = require("./spriteSheetPack");
  const packed = await packSpriteSheet(framePaths, {
    clipId: stagingId,
    fps,
    metadata: {
      id: stagingId,
      label: (meta.prompt || stagingId).slice(0, 64),
      quality: meta.quality,
      source: "paint_polish",
      trueAlpha: meta.trueAlpha !== false
    }
  });

  let sheet = null;
  if (packed.ok) {
    const sheetPath = path.join(builtDir, "sprite_sheet.png");
    const manifestPath = path.join(builtDir, "sprite.json");
    fs.writeFileSync(sheetPath, packed.sheetBuffer);
    fs.writeFileSync(manifestPath, `${JSON.stringify(packed.manifest, null, 2)}\n`);
    sheet = {
      ok: true,
      sheetPath: path.relative(ROOT, sheetPath).replace(/\\/g, "/"),
      manifestPath: path.relative(ROOT, manifestPath).replace(/\\/g, "/"),
      sheetWidth: packed.sheetWidth,
      sheetHeight: packed.sheetHeight,
      frameCount: packed.frameCount
    };
  } else {
    sheet = packed;
  }

  let gif = null;
  if (input.encodeGif === true) {
    try {
      const { encodeGifFromPngBuffers } = require("../mia-graphics-studio/animationEncoder");
      const buffers = framePaths.map((p) => fs.readFileSync(p));
      gif = await encodeGifFromPngBuffers(buffers, { fps, loop: 0 });
      if (gif.ok) {
        const gifPath = path.join(builtDir, "preview.gif");
        fs.writeFileSync(gifPath, gif.buffer);
        gif = { ok: true, path: path.relative(ROOT, gifPath).replace(/\\/g, "/") };
      }
    } catch (err) {
      gif = { ok: false, error: err.message };
    }
  }

  return {
    ok: true,
    phase: "13k",
    stagingId,
    frameCount: framePaths.length,
    fps,
    width,
    height,
    avgAlphaRatio,
    sheet,
    gif,
    sheetUrl: `/mia/animation/staging/${encodeURIComponent(stagingId)}/sheet`,
    publicSheetUrl: `/assets/mia-ai-staging/${encodeURIComponent(stagingId)}/built/sprite_sheet.png`,
    paintUrl: `/mia-paint/?aiStaging=${encodeURIComponent(stagingId)}`,
    path: path.relative(ROOT, stagingDir).replace(/\\/g, "/"),
    metadata: meta
  };
}

function resolvePromoteQuality(stagingMeta = {}, input = {}) {
  if (input.asProduction === true && input.confirmProduction === true) {
    return "production";
  }
  const q = safeString(input.quality || stagingMeta.quality).toLowerCase();
  if (q === "ai" || q === "procedural" || q === "production") {
    if (q === "production" && input.confirmProduction !== true) return "ai";
    return q;
  }
  if (safeString(stagingMeta.provider || input.provider).toLowerCase() === "openai") return "ai";
  if (safeString(stagingMeta.quality).toLowerCase() === "ai") return "ai";
  return "procedural";
}

/**
 * Copy staging frames into bank clip dir (1-based 0001.png…).
 */
function copyFramesToBank(stagingFramesDir, bankFramesDir) {
  const files = listFrameFiles(stagingFramesDir);
  ensureDir(bankFramesDir);
  // clear previous frames
  for (const old of listFrameFiles(bankFramesDir)) {
    fs.unlinkSync(path.join(bankFramesDir, old));
  }
  const written = [];
  files.forEach((file, index) => {
    const destName = `${String(index + 1).padStart(4, "0")}.png`;
    const dest = path.join(bankFramesDir, destName);
    fs.copyFileSync(path.join(stagingFramesDir, file), dest);
    written.push(dest);
  });
  return written;
}

async function promoteAiAnimationToBank(input = {}) {
  const stagingDir = resolveStagingDir(input);
  if (!stagingDir || !fs.existsSync(stagingDir)) {
    return { ok: false, error: "staging_missing", stagingDir };
  }

  const stagingFramesDir = path.join(stagingDir, "frames");
  const frameFiles = listFrameFiles(stagingFramesDir);
  if (!frameFiles.length) {
    return { ok: false, error: "no_frames", stagingDir };
  }

  const stagingMeta = readStagingMetadata(stagingDir);
  const minAlpha = Number(input.minAlphaRatio);
  if (Number.isFinite(minAlpha) && Number(stagingMeta.avgAlphaRatio) < minAlpha) {
    return {
      ok: false,
      error: "alpha_too_low",
      avgAlphaRatio: stagingMeta.avgAlphaRatio,
      minAlphaRatio: minAlpha
    };
  }

  const quality = resolvePromoteQuality(stagingMeta, input);
  if (quality === "production" && input.confirmProduction !== true) {
    return { ok: false, error: "production_requires_confirm" };
  }

  const bankRoot = input.bankRoot || DEFAULT_BANK_ROOT;
  const category = safeString(input.category, quality === "production" ? "gift" : "ai");
  const clipId = normalizeClipId(
    input.bankClipId || input.targetClipId || input.clipId || stagingMeta.id,
    category
  );
  const clipDir = path.join(bankRoot, ...clipId.split("/"));
  const framesDir = path.join(clipDir, "frames");
  const written = copyFramesToBank(stagingFramesDir, framesDir);

  const tags = Array.isArray(input.tags)
    ? [...input.tags]
    : Array.isArray(stagingMeta.tags)
      ? [...stagingMeta.tags]
      : [];
  if (!tags.includes("ai-true-alpha")) tags.push("ai-true-alpha");
  if (quality === "production" && !tags.includes("production")) tags.push("production");
  if (quality !== "production") {
    const idx = tags.indexOf("production");
    if (idx >= 0) tags.splice(idx, 1);
  }

  const metadata = {
    id: clipId,
    category: clipId.split("/")[0],
    label: safeString(input.label || stagingMeta.label, clipId.split("/").pop()),
    fps: Math.max(1, Math.min(60, Number(input.fps || stagingMeta.fps) || 12)),
    loop: input.loop !== false && stagingMeta.loop !== false,
    emotion: safeString(input.emotion || stagingMeta.emotion || stagingMeta.motion, "idle"),
    effectProgram: safeString(input.effectProgram || stagingMeta.effectProgram),
    giftKeys: Array.isArray(input.giftKeys)
      ? input.giftKeys
      : Array.isArray(stagingMeta.giftKeys)
        ? stagingMeta.giftKeys
        : [],
    tags,
    frameCount: written.length,
    frameWidth: stagingMeta.width || undefined,
    frameHeight: stagingMeta.height || undefined,
    anchor: input.anchor || stagingMeta.anchor || { x: 0.5, y: 1 },
    quality,
    source: safeString(input.source || stagingMeta.source, "ai_true_alpha_anim"),
    spriteHint: safeString(input.spriteHint || stagingMeta.spriteHint || stagingMeta.motion, "happy"),
    trueAlpha: stagingMeta.trueAlpha !== false,
    avgAlphaRatio: stagingMeta.avgAlphaRatio ?? null,
    stagingId: path.basename(stagingDir),
    phase: "12w"
  };

  ensureDir(clipDir);
  fs.writeFileSync(path.join(clipDir, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);

  const packed = await packClipDirectory(clipDir, { bankRoot, clipId });
  if (!packed.ok) return { ...packed, clipId, stagingDir };

  const { buildAnimationBank } = require("../../scripts/build_animation_bank");
  await buildAnimationBank({ bankRoot, seed: false, force: true });
  const bank = loadBankIndex(bankRoot);
  const clip = bank.clips.find((c) => c.id === clipId);

  return {
    ok: true,
    phase: "12w",
    clipId,
    quality,
    liveSheetEligible: quality === "production",
    frameCount: written.length,
    stagingDir: path.relative(ROOT, stagingDir).replace(/\\/g, "/"),
    bankDir: path.relative(ROOT, clipDir).replace(/\\/g, "/"),
    sheetUrl: clip?.sheetUrl || `/assets/animation-bank/${clipId}/built/sprite_sheet.png`,
    manifestUrl: clip?.manifestUrl || `/assets/animation-bank/${clipId}/built/sprite.json`,
    metadata,
    packed
  };
}

/**
 * Explicit admin step: mark an existing bank clip as production (live gift sheets).
 * Phase 12z: blocks procedural / low-alpha unless forceProduction+confirmForceProduction.
 */
async function markBankClipProduction(input = {}) {
  if (input.confirmProduction !== true) {
    return { ok: false, error: "production_requires_confirm" };
  }
  const bankRoot = input.bankRoot || DEFAULT_BANK_ROOT;
  const clipId = normalizeClipId(input.clipId || input.bankClipId, "ai");
  const clipDir = path.join(bankRoot, ...clipId.split("/"));
  const metaPath = path.join(clipDir, "metadata.json");
  if (!fs.existsSync(metaPath)) {
    return { ok: false, error: "clip_missing", clipId };
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const { evaluateProductionReadiness } = require("./productionGate");
  const forceProduction =
    input.forceProduction === true && input.confirmForceProduction === true;
  const gate = evaluateProductionReadiness(meta, {
    minAlphaRatio: input.minAlphaRatio,
    forceProduction
  });

  if (!gate.ready) {
    return {
      ok: false,
      error: "production_gate_failed",
      phase: "12z",
      clipId,
      blockers: gate.blockers,
      warnings: gate.warnings,
      checks: gate.checks,
      hint: gate.hint
    };
  }

  meta.quality = "production";
  meta.tags = Array.isArray(meta.tags) ? meta.tags : [];
  if (!meta.tags.includes("production")) meta.tags.push("production");
  meta.markedProductionAt = new Date().toISOString();
  meta.phase = forceProduction ? "12z" : meta.phase === "12y" ? "12y" : "12z";
  if (forceProduction) {
    meta.forceProduction = true;
    meta.forceProductionAt = new Date().toISOString();
    if (!meta.tags.includes("force-production")) meta.tags.push("force-production");
  }
  if (gate.warnings.length) meta.productionWarnings = gate.warnings;
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);

  const packed = await packClipDirectory(clipDir, { bankRoot, clipId });
  if (!packed.ok) return packed;
  const { buildAnimationBank } = require("../../scripts/build_animation_bank");
  await buildAnimationBank({ bankRoot, seed: false, force: true });

  return {
    ok: true,
    phase: "12z",
    clipId,
    quality: "production",
    liveSheetEligible: true,
    forced: forceProduction,
    warnings: gate.warnings,
    checks: gate.checks,
    sheetUrl: `/assets/animation-bank/${clipId}/built/sprite_sheet.png`,
    manifestUrl: `/assets/animation-bank/${clipId}/built/sprite.json`
  };
}

/**
 * Phase 12x/12y — bind giftKeys on an existing bank clip.
 * With overrideHardcoded + confirmOverride, production clips beat GIFT_ANIMATION_IDS.
 */
async function bindGiftKeysToClip(input = {}) {
  const bankRoot = input.bankRoot || DEFAULT_BANK_ROOT;
  const clipId = normalizeClipId(input.clipId || input.bankClipId, "ai");
  const clipDir = path.join(bankRoot, ...clipId.split("/"));
  const metaPath = path.join(clipDir, "metadata.json");
  if (!fs.existsSync(metaPath)) {
    return { ok: false, error: "clip_missing", clipId, phase: "12x" };
  }

  const giftKeys = Array.isArray(input.giftKeys)
    ? input.giftKeys.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
    : String(input.giftKey || "")
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

  if (!giftKeys.length) {
    return { ok: false, error: "missing_gift_keys", phase: "12x" };
  }

  const { HARDCODED_GIFT_KEYS } = require("./effectProgramPresets");
  const hardcodedHit = giftKeys.filter((k) => HARDCODED_GIFT_KEYS.includes(k));
  const wantOverride = input.overrideHardcoded === true || input.giftOverride === true;

  if (wantOverride && hardcodedHit.length && input.confirmOverride !== true) {
    return {
      ok: false,
      error: "override_requires_confirm",
      phase: "12y",
      hardcodedKeys: hardcodedHit,
      hint: "Pošli confirmOverride: true — live gift sheets použijí tento clip místo gift/rose atd. (jen pokud quality=production)"
    };
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const existing = Array.isArray(meta.giftKeys) ? meta.giftKeys.map((k) => String(k).toLowerCase()) : [];
  const merged = input.replace === true ? giftKeys : [...new Set([...existing, ...giftKeys])];
  meta.giftKeys = merged;
  if (input.emotion) meta.emotion = String(input.emotion);
  if (input.effectProgram) meta.effectProgram = String(input.effectProgram);
  if (input.spriteHint) meta.spriteHint = String(input.spriteHint);
  meta.boundGiftKeysAt = new Date().toISOString();

  if (wantOverride && input.confirmOverride === true) {
    meta.giftOverride = true;
    meta.tags = Array.isArray(meta.tags) ? meta.tags : [];
    if (!meta.tags.includes("gift-override")) meta.tags.push("gift-override");
    meta.phase = "12y";
    meta.giftOverrideAt = new Date().toISOString();

    // Clear conflicting overrides for the same keys on other clips
    clearConflictingGiftOverrides(bankRoot, clipId, merged);
  } else if (input.giftOverride === false || input.clearOverride === true) {
    meta.giftOverride = false;
    meta.tags = Array.isArray(meta.tags) ? meta.tags.filter((t) => t !== "gift-override") : [];
    meta.phase = meta.phase || "12x";
  } else {
    meta.phase = meta.phase || "12x";
  }

  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);

  const packed = await packClipDirectory(clipDir, { bankRoot, clipId });
  if (!packed.ok) return { ...packed, phase: meta.phase || "12x" };
  const { buildAnimationBank } = require("../../scripts/build_animation_bank");
  await buildAnimationBank({ bankRoot, seed: false, force: true });

  const isProduction = String(meta.quality || "").toLowerCase() === "production";
  const overrideActive = meta.giftOverride === true && isProduction;
  const overridePending = meta.giftOverride === true && !isProduction;

  let warning = null;
  if (hardcodedHit.length && !wantOverride) {
    warning = `giftKeys ${hardcodedHit.join(",")} are shadowed by hardcoded GIFT_ANIMATION_IDS — use overrideHardcoded+confirmOverride (12y)`;
  } else if (overridePending) {
    warning = "giftOverride set, but clip is not production yet — Mark production to activate live sheets";
  }

  return {
    ok: true,
    phase: meta.giftOverride ? "12y" : "12x",
    clipId,
    giftKeys: merged,
    quality: meta.quality || null,
    giftOverride: meta.giftOverride === true,
    overrideActive,
    overridePending,
    liveSheetEligible: isProduction,
    warning,
    sheetUrl: `/assets/animation-bank/${clipId}/built/sprite_sheet.png`,
    manifestUrl: `/assets/animation-bank/${clipId}/built/sprite.json`
  };
}

function clearConflictingGiftOverrides(bankRoot, keepClipId, giftKeys = []) {
  const keys = new Set(giftKeys.map((k) => String(k).toLowerCase()));
  if (!keys.size || !fs.existsSync(bankRoot)) return;

  function walk(dir, rel = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const hasMeta = entries.some((e) => e.isFile() && e.name === "metadata.json");
    const hasFrames = entries.some((e) => e.isDirectory() && e.name === "frames");
    if (hasMeta && hasFrames) {
      const id = rel.replace(/\\/g, "/");
      if (id === keepClipId) return;
      const metaPath = path.join(dir, "metadata.json");
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        if (meta.giftOverride !== true) return;
        const clipKeys = Array.isArray(meta.giftKeys)
          ? meta.giftKeys.map((k) => String(k).toLowerCase())
          : [];
        if (!clipKeys.some((k) => keys.has(k))) return;
        meta.giftOverride = false;
        meta.tags = Array.isArray(meta.tags) ? meta.tags.filter((t) => t !== "gift-override") : [];
        meta.giftOverrideClearedAt = new Date().toISOString();
        fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
      } catch (_err) {
        /* ignore */
      }
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "built" || entry.name === "frames") continue;
      walk(path.join(dir, entry.name), rel ? `${rel}/${entry.name}` : entry.name);
    }
  }

  walk(bankRoot);
}

module.exports = {
  DEFAULT_STAGING_ROOT,
  normalizeClipId,
  resolvePromoteQuality,
  listAiStagingClips,
  getAiStagingClip,
  writeAiStagingFrames,
  promoteAiAnimationToBank,
  markBankClipProduction,
  bindGiftKeysToClip,
  clearConflictingGiftOverrides
};
