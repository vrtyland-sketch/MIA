"use strict";

/**
 * MIA Fold sort — projde incoming-images a chytře roztřídí obsah z Foldu.
 *
 * Default = NÁHLED (nic nepřesouvá). Přesun až s --apply.
 *   node scripts/fold_sort.js            # jen report
 *   node scripts/fold_sort.js --apply    # provede přesun (soukromé mimo stream)
 */

const fs = require("fs");
const path = require("path");
const {
  classifyFoldFile,
  summarizeClassification,
  mediaTypeFromExt
} = require("./MIA_FOLD_LIBRARY");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INBOX = path.join(PROJECT_ROOT, "incoming-images");
const LOG_FILE = path.join(PROJECT_ROOT, "logs", "fold-sort.log");

// Zdrojové složky, které procházíme (kořen + existující buckety).
const SCAN_DIRS = ["", "photos", "videos", "other"];

function nowIso() {
  return new Date().toISOString();
}

function logLine(msg) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, `${nowIso()} ${msg}\n`, "utf8");
  } catch (_err) {
    /* ignore */
  }
}

function listFiles() {
  const out = [];
  for (const sub of SCAN_DIRS) {
    const dir = sub ? path.join(INBOX, sub) : INBOX;
    if (!fs.existsSync(dir)) continue;
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch (_err) {
      continue;
    }
    for (const name of names) {
      const full = path.join(dir, name);
      let st;
      try {
        st = fs.statSync(full);
      } catch (_err) {
        continue;
      }
      if (!st.isFile()) continue;
      out.push({
        name,
        abs: full,
        srcBucket: sub || "(root)",
        ext: path.extname(name).toLowerCase(),
        sizeBytes: st.size
      });
    }
  }
  return out;
}

function uniqueDest(destDir, name) {
  let dest = path.join(destDir, name);
  if (!fs.existsSync(dest)) return dest;
  const base = path.basename(name, path.extname(name));
  const ext = path.extname(name);
  const stamp = Date.now().toString().slice(-6);
  dest = path.join(destDir, `${base}_${stamp}${ext}`);
  return dest;
}

function main() {
  const apply = process.argv.includes("--apply");

  if (!fs.existsSync(INBOX)) {
    console.log(JSON.stringify({ ok: false, error: "inbox_missing", inbox: INBOX }));
    process.exit(1);
  }

  const files = listFiles();
  const planned = [];

  for (const file of files) {
    const cls = classifyFoldFile(file.name, {
      ext: file.ext,
      sizeBytes: file.sizeBytes
    });

    if (cls.category === "ignored" || !cls.target) continue;

    const targetRel = cls.target.replace(/\\/g, "/");
    const currentRel = file.srcBucket === "(root)" ? "" : file.srcBucket;

    // Už je na správném místě → přeskoč.
    if (currentRel === targetRel) continue;

    planned.push({
      name: file.name,
      from: file.srcBucket,
      to: targetRel,
      category: cls.category,
      mediaType: cls.mediaType,
      streamSafe: cls.streamSafe,
      confidence: cls.confidence,
      reason: cls.reason,
      abs: file.abs
    });
  }

  const summary = summarizeClassification(
    files.map((f) => classifyFoldFile(f.name, { ext: f.ext, sizeBytes: f.sizeBytes }))
  );

  let moved = 0;
  const errors = [];

  if (apply) {
    for (const item of planned) {
      const destDir = path.join(INBOX, item.to);
      try {
        fs.mkdirSync(destDir, { recursive: true });
        const dest = uniqueDest(destDir, item.name);
        fs.renameSync(item.abs, dest);
        moved += 1;
        logLine(`moved ${item.from} -> ${item.to} :: ${path.basename(dest)} [${item.category}]`);
      } catch (err) {
        errors.push({ name: item.name, error: err.message });
        logLine(`error ${item.name} :: ${err.message}`);
      }
    }
  }

  const report = {
    ok: true,
    mode: apply ? "apply" : "dry-run",
    inbox: INBOX,
    scanned: files.length,
    plannedMoves: planned.length,
    moved,
    errors,
    summary,
    // V náhledu ukaž vzorek, ať je vidět rozhodování.
    sample: planned.slice(0, 25).map((p) => ({
      name: p.name,
      from: p.from,
      to: p.to,
      category: p.category,
      streamSafe: p.streamSafe,
      reason: p.reason
    }))
  };

  console.log(JSON.stringify(report, null, 2));

  if (!apply && planned.length > 0) {
    console.log(
      `\n[NÁHLED] ${planned.length} souborů by se přesunulo. Spusť s --apply pro provedení:\n  node scripts/fold_sort.js --apply`
    );
  }
}

if (require.main === module) {
  main();
}

module.exports = { listFiles };
