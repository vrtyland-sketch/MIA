"use strict";

/**
 * Archive prior Koj art sets into dated folders (never delete).
 * Does not change active mood PNGs.
 *
 *   node scripts/kojnozrout_archive_art_sets.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MOODS = path.join(ROOT, "mia-output-overlay", "assets", "kojnozrout", "moods");
const { resolveArchiveDir } = require("./kojnozrout_offline_paths");
const ARCHIVE = resolveArchiveDir();
const TMP = path.join(ROOT, ".tmp-audit");
const CURSOR_ASSETS = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "projects",
  "c-MIA",
  "assets"
);

const MASTERS = ["idle", "warm", "happy"];

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyIfExists(src, dest) {
  if (!src || !fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

function copyNamed(srcDir, names, destDir, renameFn) {
  const copied = [];
  for (const name of names) {
    const src = path.join(srcDir, name);
    if (!fs.existsSync(src)) continue;
    const destName = renameFn ? renameFn(name) : name;
    copyIfExists(src, path.join(destDir, destName));
    copied.push(destName);
  }
  return copied;
}

function listMoodMatches(predicate) {
  if (!fs.existsSync(MOODS)) return [];
  return fs.readdirSync(MOODS).filter(predicate);
}

function archiveSet(folderName, files) {
  const dest = path.join(ARCHIVE, folderName);
  ensureDir(dest);
  const copied = [];
  for (const [src, destName] of files) {
    if (copyIfExists(src, path.join(dest, destName))) copied.push(destName);
  }
  // manifest pointer for install scripts
  const manifest = {
    folder: folderName,
    archivedAt: new Date().toISOString(),
    files: copied,
    note: "Read-only archive. Active moods live in ../moods/. Reinstall via kojnozrout_install_*_art.js pointing at these masters."
  };
  fs.writeFileSync(path.join(dest, "ARCHIVE.json"), JSON.stringify(manifest, null, 2));
  return { folder: folderName, count: copied.length, files: copied };
}

function main() {
  ensureDir(ARCHIVE);

  const results = [];

  // --- v20 robot projector (current primary) ---
  {
    const files = [];
    for (const key of MASTERS) {
      files.push([
        path.join(MOODS, `kojnozout-${key}.png`),
        `kojnozout-${key}.png`
      ]);
      files.push([
        path.join(TMP, `koj-robot-${key}-raw.png`),
        `koj-robot-${key}-raw.png`
      ]);
      files.push([
        path.join(TMP, `koj-robot-${key}-alpha.png`),
        `koj-robot-${key}-alpha.png`
      ]);
      files.push([
        path.join(CURSOR_ASSETS, `koj-robot-${key}-raw.png`),
        `cursor-koj-robot-${key}-raw.png`
      ]);
    }
    results.push(archiveSet("v20-robot-projector", files));
  }

  // --- v19 cyborg (pre-robot backups + raws) ---
  {
    const files = [];
    for (const key of MASTERS) {
      files.push([
        path.join(MOODS, `kojnozout-${key}.pre-robot-v20.png`),
        `kojnozout-${key}.png`
      ]);
      files.push([
        path.join(TMP, `koj-cyborg-${key}-raw.png`),
        `koj-cyborg-${key}-raw.png`
      ]);
      files.push([
        path.join(TMP, `koj-cyborg-${key}-alpha.png`),
        `koj-cyborg-${key}-alpha.png`
      ]);
      files.push([
        path.join(CURSOR_ASSETS, `koj-cyborg-${key}-raw.png`),
        `cursor-koj-cyborg-${key}-raw.png`
      ]);
    }
    files.push([
      path.join(CURSOR_ASSETS, "koj-cyborg-warm-v2-raw.png"),
      "cursor-koj-cyborg-warm-v2-raw.png"
    ]);
    results.push(archiveSet("v19-cyborg", files));
  }

  // --- v17/v18 soft neon (pre-cyborg = soft creature; also soft-neon backups) ---
  {
    const files = [];
    for (const key of MASTERS) {
      // pre-cyborg was the soft neon creature before half-mech
      files.push([
        path.join(MOODS, `kojnozout-${key}.pre-cyborg-v19.png`),
        `kojnozout-${key}.png`
      ]);
      files.push([
        path.join(MOODS, `kojnozout-${key}.pre-soft-neon-v17.png`),
        `kojnozout-${key}.pre-soft-neon-v17.png`
      ]);
      files.push([
        path.join(MOODS, `kojnozout-${key}.pre-soft-neon-v18.png`),
        `kojnozout-${key}.pre-soft-neon-v18.png`
      ]);
      files.push([
        path.join(MOODS, `kojnozout-${key}.pre-soft-neon.png`),
        `kojnozout-${key}.pre-soft-neon.png`
      ]);
    }
    files.push([
      path.join(CURSOR_ASSETS, "koj-soft-neon-idle-raw.png"),
      "cursor-koj-soft-neon-idle-raw.png"
    ]);
    files.push([
      path.join(CURSOR_ASSETS, "koj-soft-neon-happy-raw.png"),
      "cursor-koj-soft-neon-happy-raw.png"
    ]);
    files.push([
      path.join(CURSOR_ASSETS, "koj-soft-neon-happy-v2-raw.png"),
      "cursor-koj-soft-neon-happy-v2-raw.png"
    ]);
    files.push([
      path.join(TMP, "koj-soft-neon-idle-raw.png"),
      "koj-soft-neon-idle-raw.png"
    ]);
    files.push([
      path.join(TMP, "koj-soft-neon-happy-raw.png"),
      "koj-soft-neon-happy-raw.png"
    ]);
    results.push(archiveSet("v17-soft-neon", files));
  }

  // --- purple / pre-soft-neon originals (any remaining *.pre-soft-neon.png masters) ---
  {
    const purpleBackups = listMoodMatches(
      (n) => /^kojnozout-.+\.pre-soft-neon\.png$/i.test(n)
    );
    const files = purpleBackups.map((n) => [path.join(MOODS, n), n]);
    // also copy a few known purple-era names if present
    for (const key of ["idle", "warm", "happy", "curl", "rest"]) {
      files.push([
        path.join(MOODS, `kojnozout-${key}.pre-soft-neon.png`),
        `kojnozout-${key}.pre-soft-neon.png`
      ]);
    }
    results.push(archiveSet("purple-originals", files));
  }

  // Pointer README for install scripts
  const readme = `# Koj art archives

Dated folders keep prior looks without deleting them from history.

| Folder | Look |
|--------|------|
| \`v20-robot-projector\` | Full chrome robot + belly/projector (was primary before AI) |
| \`v19-cyborg\` | Half soft / half mech cyborg |
| \`v17-soft-neon\` | Soft mint creature (pre-cyborg) + soft-neon backups |
| \`purple-originals\` | Older \`*.pre-soft-neon\` purple-era backups |

Active install still writes to \`../moods/\`. To revive an archive later, point
\`kojnozrout_install_*_art.js\` candidates at e.g.
\`_archive/v19-cyborg/kojnozout-idle.png\`.

Generated: ${new Date().toISOString()}
`;
  fs.writeFileSync(path.join(ARCHIVE, "README.md"), readme);

  // Also leave .pre-* backups in moods/ untouched (extra safety)
  console.log(
    JSON.stringify(
      {
        ok: true,
        archiveRoot: ARCHIVE,
        sets: results,
        note: "moods/*.pre-* backups left in place"
      },
      null,
      2
    )
  );
}

main();
