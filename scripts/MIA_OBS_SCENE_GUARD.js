"use strict";

/**
 * MIA OBS Scene Guard
 *
 * Pojistka proti modálnímu "Missing Files" dialogu v OBS. Když scéna odkazuje
 * na neexistující soubory (typicky po přenosu profilu z jiného PC — cesty
 * C:/Users/<jiný>/...), OBS při startu zobrazí blokující dialog a nenaběhne
 * WebSocket → MIA i watchdog jsou slepé.
 *
 * Tenhle modul jen DIAGNOSTIKUJE (nemaže nic) a vrací seznam mrtvých zdrojů,
 * aby MIA mohla při bootu zalogovat varování a streamer to viděl dřív, než ho
 * dialog překvapí uprostřed streamu.
 */

const fs = require("fs");
const path = require("path");

function defaultScenesDir() {
  const appData = process.env.APPDATA;
  if (!appData) return "";
  return path.join(appData, "obs-studio", "basic", "scenes");
}

function collectFilePaths(source) {
  const out = [];
  const s = source && source.settings ? source.settings : {};
  if (typeof s.file === "string" && s.file) out.push(s.file);
  if (typeof s.local_file === "string" && s.local_file) out.push(s.local_file);
  // playlist (VLC source) položky
  if (Array.isArray(s.playlist)) {
    for (const item of s.playlist) {
      if (item && typeof item.value === "string" && item.value) out.push(item.value);
    }
  }
  return out;
}

/**
 * Projde scénové JSON soubory a vrátí mrtvé zdroje (soubory, co neexistují).
 * @returns {{ ok:boolean, scenesDir:string, scanned:number, dead:Array }}
 */
function scanScenes(options = {}) {
  const scenesDir = options.scenesDir || defaultScenesDir();
  const existsImpl = typeof options.exists === "function" ? options.exists : fs.existsSync;

  if (!scenesDir || !fs.existsSync(scenesDir)) {
    return { ok: true, scenesDir, scanned: 0, dead: [] };
  }

  const dead = [];
  let scanned = 0;

  let files = [];
  try {
    files = fs.readdirSync(scenesDir).filter((f) => /\.json$/i.test(f));
  } catch (_err) {
    return { ok: true, scenesDir, scanned: 0, dead: [] };
  }

  for (const file of files) {
    const full = path.join(scenesDir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (_parseErr) {
      continue;
    }
    scanned += 1;
    const sources = Array.isArray(data.sources) ? data.sources : [];
    for (const src of sources) {
      const paths = collectFilePaths(src);
      for (const p of paths) {
        // jen lokální absolutní cesty (ne URL / browser zdroje)
        if (/^https?:\/\//i.test(p)) continue;
        if (!existsImpl(p)) {
          dead.push({
            scene: file.replace(/\.json$/i, ""),
            sourceName: src.name,
            kind: src.id,
            file: p
          });
        }
      }
    }
  }

  return { ok: dead.length === 0, scenesDir, scanned, dead };
}

module.exports = { scanScenes, defaultScenesDir };
