"use strict";

/**
 * ASSET PASS 03A — retention simulation (DRY RUN, no deletes)
 * → docs/ASSET_PASS_03A_RETENTION_DESIGN.md (simulation section)
 * Usage: node scripts/simulate_asset_retention.js
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "ASSET_PASS_03A_RETENTION_DESIGN.md");

/** Policy constants (also documented in ASSET_PASS_03A_RETENTION_DESIGN.md) */
const POLICY = {
  eyes: {
    hotMaxAgeMs: 48 * 60 * 60 * 1000,
    routineMaxAgeMs: 24 * 60 * 60 * 1000,
    diagnosticMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
    keepLastPerSourceRoutine: 2,
    keepLastPerSourceDiagnostic: 5,
    maxDirBytes: 256 * 1024 * 1024,
    routinePrefixes: [
      "KOJNOZROUT_RUNTIME",
      "SPINAK_ENGINE_GIFTS"
    ],
    routinePrefixPatterns: [/^T[1-5]_VIDEO_/]
  },
  audio: {
    maxAgeMs: 14 * 24 * 60 * 60 * 1000,
    hotMaxAgeMs: 24 * 60 * 60 * 1000,
    minKeepCount: 50,
    maxDirBytes: 128 * 1024 * 1024
  },
  giftsCache: {
    giftAnimationsMaxAgeMs: 3 * 24 * 60 * 60 * 1000,
    orphanOutputMaxAgeMs: 14 * 24 * 60 * 60 * 1000,
    hotMaxAgeMs: 72 * 60 * 60 * 1000
  }
};

const CODE_GLOBS = [
  path.join(ROOT, "index.js"),
  path.join(ROOT, "scripts"),
  path.join(ROOT, "shared"),
  path.join(ROOT, "mia-output-overlay"),
  path.join(ROOT, "config"),
  path.join(ROOT, "core"),
  path.join(ROOT, "routes")
];

const TEST_PATH_RE = /[/\\]tests[/\\]/;

function formatBytes(n) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function relPosix(abs) {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

function md5Partial(filePath, maxBytes = 512 * 1024) {
  const hash = crypto.createHash("md5");
  const st = fs.statSync(filePath);
  const len = Math.min(st.size, maxBytes);
  const buf = Buffer.alloc(len);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, buf, 0, len, 0);
  } finally {
    fs.closeSync(fd);
  }
  hash.update(buf);
  return hash.digest("hex");
}

function walkCodeFiles() {
  const files = [];
  function add(p) {
    if (!fs.existsSync(p)) return;
    const st = fs.statSync(p);
    if (st.isFile() && /\.(js|json|html|css)$/i.test(p)) files.push(p);
    else if (st.isDirectory()) {
      for (const e of fs.readdirSync(p, { withFileTypes: true })) {
        const full = path.join(p, e.name);
        if (e.isDirectory() && e.name !== "node_modules" && e.name !== "tests") {
          add(full);
        } else if (e.isFile() && /\.(js|json|html|css)$/i.test(full)) {
          files.push(full);
        }
      }
    }
  }
  for (const g of CODE_GLOBS) add(g);
  return files;
}

function buildProtectedBasenames() {
  const basenames = new Set();
  const codeFiles = walkCodeFiles();

  const mediaRe =
    /(?:\/generated\/eyes\/|\/audio-cache\/|\/generated\/gift-|generated\/gift-|generated\/story-|generated\/media-templates\/)([^\s"'`<>]+)/gi;

  for (const file of codeFiles) {
    if (TEST_PATH_RE.test(file)) continue;
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    mediaRe.lastIndex = 0;
    let m;
    while ((m = mediaRe.exec(content)) !== null) {
      basenames.add(path.basename(m[1].split("?")[0]));
    }
  }

  const walkDir = path.join(ROOT, "generated", "walkthrough");
  if (fs.existsSync(walkDir)) {
    for (const f of fs.readdirSync(walkDir)) {
      if (!f.endsWith(".json")) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(walkDir, f), "utf8"));
        const stack = [j];
        while (stack.length) {
          const cur = stack.pop();
          if (!cur || typeof cur !== "object") continue;
          for (const [k, v] of Object.entries(cur)) {
            if (typeof v === "string") {
              if (k === "savedPath" || k === "publicUrl") {
                basenames.add(path.basename(v.replace(/\\/g, "/")));
              }
            } else if (v && typeof v === "object") {
              stack.push(v);
            }
          }
        }
      } catch {
        /* skip */
      }
    }
  }

  return basenames;
}

function parseEyesFile(name) {
  const m = name.match(/^eyes-(.+)-(\d+)\.(png|jpg|jpeg|webp)$/i);
  if (!m) return { prefix: name, ts: 0 };
  return { prefix: m[1], ts: Number(m[2]) };
}

function isRoutineEyesSource(prefix, policy) {
  if (policy.routinePrefixes.includes(prefix)) return true;
  return policy.routinePrefixPatterns.some((re) => re.test(prefix));
}

function simulateEyes(eyesDir, protectedBasenames, policy, now) {
  if (!fs.existsSync(eyesDir)) {
    return { kept: [], removed: [], reasons: {} };
  }

  const files = fs.readdirSync(eyesDir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .map((name) => {
      const abs = path.join(eyesDir, name);
      const st = fs.statSync(abs);
      const { prefix, ts } = parseEyesFile(name);
      let dupKey = null;
      try {
        dupKey = `${st.size}:${md5Partial(abs)}`;
      } catch {
        dupKey = `${st.size}:${name}`;
      }
      return {
        name,
        abs,
        size: st.size,
        mtime: st.mtimeMs,
        ts: ts || st.mtimeMs,
        prefix,
        dupKey,
        protected: protectedBasenames.has(name)
      };
    });

  const keep = new Set();
  const removeReason = new Map();

  for (const f of files) {
    if (f.protected) {
      keep.add(f.name);
      removeReason.set(f.name, "protected-ref");
    }
  }

  const dupGroups = new Map();
  for (const f of files) {
    if (keep.has(f.name)) continue;
    if (!dupGroups.has(f.dupKey)) dupGroups.set(f.dupKey, []);
    dupGroups.get(f.dupKey).push(f);
  }

  for (const group of dupGroups.values()) {
    if (group.length <= 1) continue;
    group.sort((a, b) => b.ts - a.ts || b.mtime - a.mtime);
    keep.add(group[0].name);
    for (let i = 1; i < group.length; i++) {
      removeReason.set(group[i].name, "duplicate");
    }
  }

  for (const f of files) {
    if (keep.has(f.name) || removeReason.has(f.name)) continue;
    const age = now - f.mtime;
    if (age <= policy.hotMaxAgeMs) {
      keep.add(f.name);
      removeReason.set(f.name, "hot-window");
      continue;
    }
  }

  const byPrefix = new Map();
  for (const f of files) {
    if (removeReason.has(f.name) && removeReason.get(f.name) === "duplicate") continue;
    if (!byPrefix.has(f.prefix)) byPrefix.set(f.prefix, []);
    byPrefix.get(f.prefix).push(f);
  }

  for (const [prefix, group] of byPrefix) {
    const routine = isRoutineEyesSource(prefix, policy);
    const maxAge = routine ? policy.routineMaxAgeMs : policy.diagnosticMaxAgeMs;
    const keepN = routine
      ? policy.keepLastPerSourceRoutine
      : policy.keepLastPerSourceDiagnostic;

    group.sort((a, b) => b.ts - a.ts || b.mtime - a.mtime);
    const keptForPrefix = group.filter((f) => keep.has(f.name));

    let slot = keptForPrefix.length;
    for (const f of group) {
      if (keep.has(f.name)) continue;
      const age = now - f.mtime;
      if (slot < keepN) {
        keep.add(f.name);
        removeReason.set(f.name, "keep-last-n");
        slot++;
      } else if (age > maxAge) {
        removeReason.set(f.name, "age-exceeded");
      } else {
        keep.add(f.name);
        removeReason.set(f.name, "within-age");
        slot++;
      }
    }
  }

  let keptFiles = files.filter((f) => keep.has(f.name) && removeReason.get(f.name) !== "duplicate");
  let keptBytes = keptFiles.reduce((s, f) => s + f.size, 0);

  if (keptBytes > policy.maxDirBytes) {
    const candidates = keptFiles
      .filter((f) => !f.protected && removeReason.get(f.name) !== "hot-window")
      .sort((a, b) => a.mtime - b.mtime);
    for (const f of candidates) {
      if (keptBytes <= policy.maxDirBytes) break;
      keep.delete(f.name);
      removeReason.set(f.name, "max-size-lru");
      keptBytes -= f.size;
    }
  }

  const kept = files.filter((f) => keep.has(f.name));
  const removed = files.filter((f) => !keep.has(f.name));

  const reasons = {};
  for (const f of removed) {
    const r = removeReason.get(f.name) || "removed";
    reasons[r] = (reasons[r] || 0) + 1;
  }

  return { kept, removed, reasons };
}

function simulateAudio(cacheDir, protectedBasenames, policy, now) {
  if (!fs.existsSync(cacheDir)) return { kept: [], removed: [], reasons: {} };

  const files = fs.readdirSync(cacheDir)
    .filter((f) => f.endsWith(".mp3"))
    .map((name) => {
      const abs = path.join(cacheDir, name);
      const st = fs.statSync(abs);
      return {
        name,
        abs,
        size: st.size,
        mtime: st.mtimeMs,
        protected: protectedBasenames.has(name)
      };
    });

  const keep = new Set();
  const removeReason = new Map();

  for (const f of files) {
    if (f.protected) {
      keep.add(f.name);
      removeReason.set(f.name, "protected-ref");
    }
  }

  for (const f of files) {
    if (keep.has(f.name)) continue;
    if (now - f.mtime <= policy.hotMaxAgeMs) {
      keep.add(f.name);
      removeReason.set(f.name, "hot-window");
    }
  }

  const sorted = [...files].sort((a, b) => b.mtime - a.mtime);
  for (let i = 0; i < Math.min(policy.minKeepCount, sorted.length); i++) {
    if (!keep.has(sorted[i].name)) {
      keep.add(sorted[i].name);
      removeReason.set(sorted[i].name, "min-keep");
    }
  }

  for (const f of files) {
    if (keep.has(f.name)) continue;
    if (now - f.mtime > policy.maxAgeMs) {
      removeReason.set(f.name, "age-exceeded");
    } else {
      keep.add(f.name);
      removeReason.set(f.name, "within-age");
    }
  }

  let keptFiles = files.filter((f) => keep.has(f.name));
  let keptBytes = keptFiles.reduce((s, f) => s + f.size, 0);

  if (keptBytes > policy.maxDirBytes) {
    const candidates = keptFiles
      .filter((f) => !f.protected && removeReason.get(f.name) !== "hot-window")
      .sort((a, b) => a.mtime - b.mtime);
    for (const f of candidates) {
      if (keptBytes <= policy.maxDirBytes) break;
      keep.delete(f.name);
      removeReason.set(f.name, "max-size-lru");
      keptBytes -= f.size;
    }
  }

  const kept = files.filter((f) => keep.has(f.name));
  const removed = files.filter((f) => !keep.has(f.name));
  const reasons = {};
  for (const f of removed) {
    const r = removeReason.get(f.name) || "removed";
    reasons[r] = (reasons[r] || 0) + 1;
  }
  return { kept, removed, reasons };
}

function buildCodeRefSet() {
  const refs = new Set();
  const re =
    /\/generated\/(?:gift-animations\/[^/\s"'`]+|gift-moments\/[^/\s"'`]+|story-moments\/[^/\s"'`]+|media-templates\/[^/\s"'`]+)/gi;
  for (const file of walkCodeFiles()) {
    if (TEST_PATH_RE.test(file)) continue;
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      refs.add(m[0].replace(/\\/g, "/"));
    }
  }
  return refs;
}

function simulateGiftsCache(generatedDir, codeRefs, policy, now) {
  const kept = [];
  const removed = [];
  const keepReasons = {};
  const removeReasons = {};

  function bumpKeep(reason) {
    keepReasons[reason] = (keepReasons[reason] || 0) + 1;
  }
  function bumpRemove(reason) {
    removeReasons[reason] = (removeReasons[reason] || 0) + 1;
  }

  const subdirs = ["gift-animations", "gift-moments", "story-moments", "media-templates"];
  for (const sub of subdirs) {
    const base = path.join(generatedDir, sub);
    if (!fs.existsSync(base)) continue;

    if (sub === "gift-animations") {
      for (const job of fs.readdirSync(base, { withFileTypes: true })) {
        if (!job.isDirectory()) continue;
        const jobPath = path.join(base, job.name);
        const publicPath = `/generated/gift-animations/${job.name}`;
        const st = fs.statSync(jobPath);
        const age = now - st.mtimeMs;
        let bytes = 0;
        const stack = [jobPath];
        while (stack.length) {
          const p = stack.pop();
          for (const e of fs.readdirSync(p, { withFileTypes: true })) {
            const full = path.join(p, e.name);
            if (e.isDirectory()) stack.push(full);
            else bytes += fs.statSync(full).size;
          }
        }
        const row = { rel: relPosix(jobPath), size: bytes, mtime: st.mtimeMs };
        const referenced = [...codeRefs].some((r) => r.includes(job.name));
        if (referenced) {
          kept.push(row);
          bumpKeep("protected-ref");
        } else if (age <= policy.hotMaxAgeMs) {
          kept.push(row);
          bumpKeep("hot-window");
        } else if (age > policy.giftAnimationsMaxAgeMs) {
          removed.push(row);
          bumpRemove("job-age");
        } else {
          kept.push(row);
          bumpKeep("within-age");
        }
      }
      continue;
    }

    for (const e of fs.readdirSync(base, { withFileTypes: true })) {
      if (!e.isFile()) continue;
      const abs = path.join(base, e.name);
      const st = fs.statSync(abs);
      const publicPath = `/generated/${sub}/${e.name}`;
      const row = { rel: relPosix(abs), size: st.size, mtime: st.mtimeMs };
      const referenced = codeRefs.has(publicPath) || codeRefs.has(publicPath.slice(1));
      const age = now - st.mtimeMs;
      if (referenced) {
        kept.push(row);
        bumpKeep("protected-ref");
      } else if (age <= policy.hotMaxAgeMs) {
        kept.push(row);
        bumpKeep("hot-window");
      } else if (age > policy.orphanOutputMaxAgeMs) {
        removed.push(row);
        bumpRemove("orphan-age");
      } else {
        kept.push(row);
        bumpKeep("within-age");
      }
    }
  }

  return { kept, removed, reasons: removeReasons, keepReasons };
}

function sumSize(rows) {
  return rows.reduce((s, r) => s + (r.size || 0), 0);
}

function main() {
  const now = Date.now();
  console.error("Building protected basename set…");
  const protectedBasenames = buildProtectedBasenames();

  console.error("Simulating eyes…");
  const eyes = simulateEyes(
    path.join(ROOT, "mia-output-overlay", "generated", "eyes"),
    protectedBasenames,
    POLICY.eyes,
    now
  );

  console.error("Simulating audio-cache…");
  const audio = simulateAudio(
    path.join(ROOT, "mia-output-overlay", "audio-cache"),
    protectedBasenames,
    POLICY.audio,
    now
  );

  console.error("Simulating generated/gifts cache…");
  const codeRefs = buildCodeRefSet();
  const gifts = simulateGiftsCache(
    path.join(ROOT, "mia-output-overlay", "generated"),
    codeRefs,
    POLICY.giftsCache,
    now
  );

  const eyesRemovedBytes = sumSize(eyes.removed);
  const audioRemovedBytes = sumSize(audio.removed);
  const giftsRemovedBytes = sumSize(gifts.removed);
  const totalFreed = eyesRemovedBytes + audioRemovedBytes + giftsRemovedBytes;

  const result = {
    policy: POLICY,
    protectedBasenames: protectedBasenames.size,
    eyes: {
      kept: eyes.kept.length,
      removed: eyes.removed.length,
      keptBytes: sumSize(eyes.kept),
      removedBytes: eyesRemovedBytes,
      reasons: eyes.reasons
    },
    audio: {
      kept: audio.kept.length,
      removed: audio.removed.length,
      keptBytes: sumSize(audio.kept),
      removedBytes: audioRemovedBytes,
      reasons: audio.reasons
    },
    giftsCache: {
      kept: gifts.kept.length,
      removed: gifts.removed.length,
      keptBytes: sumSize(gifts.kept),
      removedBytes: giftsRemovedBytes,
      reasons: gifts.reasons
    },
    totalFreedBytes: totalFreed,
    totalFreedGB: (totalFreed / 1024 ** 3).toFixed(2)
  };

  const lines = [];
  lines.push("# ASSET PASS 03A — RETENTION DESIGN");
  lines.push("");
  lines.push("**Režim:** DESIGN + DRY-RUN simulace · **feature freeze** · žádné mazání, žádné runtime změny.");
  lines.push("**Simulace:** `node scripts/simulate_asset_retention.js`");
  lines.push("");
  lines.push("## Proč nejdřív větev A");
  lines.push("");
  lines.push("`generated/eyes/` roste bez retention (~12 GB / 101k souborů). Registry seed by do `ASSET_REGISTRY.json` nasával cache sediment. Nejdřív kohoutek, pak inventura contentu.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 1. `generated/eyes/`");
  lines.push("");
  lines.push("| Pole | Návrh policy |");
  lines.push("|------|----------------|");
  lines.push("| **WHAT TO KEEP** | (1) Soubory s **explicitní code/walkthrough referencí** (basename v kódu mimo `tests/` nebo v `generated/walkthrough/*.json`). (2) **Hot window** — vše mladší než 48 h (debug po streamu). (3) **Keep-last-N** per OBS source prefix: routine zdroje (`KOJNOZROUT_RUNTIME`, `SPINAK_ENGINE_GIFTS`, `T*_VIDEO_*`) → **2** nejnovější; diagnostické (`MIA_*`, ostatní) → **5** nejnovější. (4) Po dedupe vždy min. 1 vzorek per prefix, pokud existuje. |");
  lines.push("| **HOW LONG** | Routine: max **24 h** mimo keep-last-N. Diagnostické: max **7 dní**. Hot: **48 h** bez ohledu na N. |");
  lines.push("| **MAX SIZE** | **256 MB** celý adresář (soft cap po ostatních pravidlech). |");
  lines.push("| **DELETE ORDER** | 1) **Binární duplicity** (stejná velikost + partial MD5 512 KB) — ponechat nejnovější timestamp. 2) **Věk** mimo keep-last-N. 3) **LRU** dokud není pod MAX SIZE (nikdy protected/hot). |");
  lines.push("| **EXCEPTIONS** | Walkthrough evidence, code refs, hot window, keep-last-N sloty. Budoucí konvence: sidecar `*.keep` nebo `content-pass/evidence-manifest.json`. |");
  lines.push("| **SAFETY CHECK** | Default **dry-run**; log `would_delete` + důvod; implementační fáze až po schválení; preflight: `npm run test:preflight:fast` po zapnutí cronu. |");
  lines.push("");
  lines.push("**Writer:** `scripts/MIA_EYES.js` (`captureScreenshot`, default `save: true`). **Retention dnes:** žádná.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 2. `audio-cache/` (TTS)");
  lines.push("");
  lines.push("| Pole | Návrh policy |");
  lines.push("|------|----------------|");
  lines.push("| **WHAT TO KEEP** | SHA1-hashed MP3 z `MIA_TTS_ENGINE.js` — **content-addressable cache**. Držet: (1) basename v **non-test** kódu, (2) **hot 24 h**, (3) min **50** nejnovějších souborů (fallback pro často opakované fráze). |");
  lines.push("| **HOW LONG** | **14 dní** max age pro ostatní. |");
  lines.push("| **MAX SIZE** | **128 MB** (LRU po age pravidlech). |");
  lines.push("| **DELETE ORDER** | 1) Protected refs. 2) Hot + min-keep. 3) Nejstarší mtime (LRU/age). 4) Max-size trim. |");
  lines.push("| **EXCEPTIONS** | Soubor právě referencovaný v `voicePlayback.audioUrl` — v implementaci chránit **in-memory** posledních N URL (simulace používá mtime hot window). |");
  lines.push("| **SAFETY CHECK** | Nikdy mazat, pokud basename = aktuální playback queue; dry-run report; TTS cache miss = re-synth (bezpečné). |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 3. `generated/gifts/` — pouze cache část");
  lines.push("");
  lines.push("| Subdir | Cache? | Policy |");
  lines.push("|--------|--------|--------|");
  lines.push("| `gift-animations/<jobId>/` | **Ano** — procedural job output | Celý job smazat po **3 dnech**, pokud `jobId` není v non-test kódu. Hot **72 h** vždy. |");
  lines.push("| `gift-moments/` | **Částečně** | Orphan PNG (bez code ref) po **14 dnech**. Referenced = content → **nemazat**. |");
  lines.push("| `story-moments/` | **Částečně** | Stejně jako gift-moments. |");
  lines.push("| `media-templates/` | **Částečně** | Stejně; template renderer output. |");
  lines.push("");
  lines.push("| Pole | Návrh |");
  lines.push("|------|--------|");
  lines.push("| **WHAT TO KEEP** | Job/output s **literal code ref**; vše v hot window **72 h**. |");
  lines.push("| **HOW LONG** | Jobs **3 d** · orphan outputs **14 d**. |");
  lines.push("| **MAX SIZE** | *(fáze 2)* — zatím age-only; objem ~61 MB orphan. |");
  lines.push("| **DELETE ORDER** | 1) Unreferenced jobs. 2) Orphan outputs by age. |");
  lines.push("| **EXCEPTIONS** | Jakýkoli URL v overlay state / DB — mimo scope simulace; chránit code refs. |");
  lines.push("| **SAFETY CHECK** | Mazat celé job složky atomicky; manifest URL grep před delete. |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 4. Simulace — *if policy applied now*");
  lines.push("");
  lines.push(`**Datum simulace:** ${new Date(now).toISOString().slice(0, 19)} UTC`);
  lines.push(`**Chráněných basename (code + walkthrough, bez tests):** ${protectedBasenames.size}`);
  lines.push("");
  lines.push("| Skupina | Would remove | Would keep | GB freed | GB kept |");
  lines.push("|---------|--------------|------------|----------|---------|");
  lines.push(`| \`generated/eyes\` | **${eyes.removed.length.toLocaleString()}** | ${eyes.kept.length.toLocaleString()} | **${formatBytes(eyesRemovedBytes)}** | ${formatBytes(sumSize(eyes.kept))} |`);
  lines.push(`| \`audio-cache\` | ${audio.removed.length.toLocaleString()} | ${audio.kept.length.toLocaleString()} | ${formatBytes(audioRemovedBytes)} | ${formatBytes(sumSize(audio.kept))} |`);
  lines.push(`| \`generated/gifts\` cache | ${gifts.removed.length.toLocaleString()} | ${gifts.kept.length.toLocaleString()} | ${formatBytes(giftsRemovedBytes)} | ${formatBytes(sumSize(gifts.kept))} |`);
  lines.push(`| **CELKEM** | **${(eyes.removed.length + audio.removed.length + gifts.removed.length).toLocaleString()}** | ${(eyes.kept.length + audio.kept.length + gifts.kept.length).toLocaleString()} | **${formatBytes(totalFreed)}** | ${formatBytes(sumSize(eyes.kept) + sumSize(audio.kept) + sumSize(gifts.kept))} |`);
  lines.push("");
  lines.push(
    `> **${result.totalFreedGB} GB** uvolněno při aplikaci návrhu **bez dotyku** \`mia-output-overlay/assets/\`, \`incoming-images/\` ani registry contentu.`
  );
  lines.push("");
  lines.push("### Důvody mazání (eyes)");
  lines.push("");
  for (const [k, v] of Object.entries(eyes.reasons).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${k}\`: ${v.toLocaleString()}`);
  }
  lines.push("");
  lines.push("### Důvody mazání (audio-cache)");
  lines.push("");
  for (const [k, v] of Object.entries(audio.reasons).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${k}\`: ${v.toLocaleString()}`);
  }
  lines.push("");
  lines.push("### Důvody mazání (gifts cache)");
  lines.push("");
  for (const [k, v] of Object.entries(gifts.reasons).sort((a, b) => b[1] - a[1])) {
    lines.push(`- \`${k}\`: ${v.toLocaleString()}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 5. Implementační backlog (až po schválení, mimo freeze)");
  lines.push("");
  lines.push("| ID | Úkol | Soubor |");
  lines.push("|----|------|--------|");
  lines.push("| RET-01 | Cron/trigger cleanup dry-run → apply | `scripts/MIA_ASSET_RETENTION.js` (nový) |");
  lines.push("| RET-02 | `MIA_EYES`: opt-in `save: false` pro vision tick; save jen na explicit endpoint | `scripts/MIA_EYES.js`, `MIA_OBS_VISION.js` |");
  lines.push("| RET-03 | Env knobs: `MIA_EYES_RETENTION_*`, `MIA_AUDIO_CACHE_*` | `.env.example` |");
  lines.push("| RET-04 | In-memory protect `voicePlayback.audioUrl` during cleanup | `scripts/MIA_ASSET_RETENTION.js` |");
  lines.push("| RET-05 | Evidence manifest pro walkthrough snímky | `content-pass/evidence-manifest.json` |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 6. Verdikt");
  lines.push("");
  const verdict =
    totalFreed >= 10 * 1024 ** 3
      ? "**ANO** — simulace ukazuje ≥10 GB volného místa bez dotyku content assetů."
      : `**${result.totalFreedGB} GB** — očekávaný gain; eyes dominuje.`;
  lines.push(`${verdict} Registry seed (**03B**) až po schválení a implementaci retention cronu.`);
  lines.push("");

  fs.writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log(JSON.stringify(result, null, 2));
}

main();
