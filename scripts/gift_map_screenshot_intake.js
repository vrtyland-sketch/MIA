"use strict";

/**
 * TikTok gift panel screenshoty → reference pro gift mapu (názvy + coiny).
 * NEpatří do OBS video slotů.
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(PROJECT_ROOT, "incoming-images", "videos_2", "_zip_preview");
const DEST_DIR = path.join(PROJECT_ROOT, "incoming-images", "gift-map-screenshots");
const OUT_PATH = path.join(PROJECT_ROOT, "config", "tiktok-gift-panel-intake.json");

/** Ručně ověřené dárky ze screenshotů 2026-04-13 (TikTok LIVE panel, CZ). */
const GIFTS_FROM_SCREENSHOTS = [
  { label: "Růže", labelEn: "Rose", coins: 1, streamTier: "T1", catalogKey: "ROSE" },
  { label: "Osrdíčkovat", coins: 1, streamTier: "T1", catalogKey: "HEART" },
  { label: "Sláva Fanklubu", coins: 1, streamTier: "T1", catalogKey: null },
  { label: "Srdce z prstů", coins: 5, streamTier: "T1", catalogKey: "HEART" },
  { label: "Síla fanklubu", coins: 9, streamTier: "T1", catalogKey: null },
  { label: "Náhrdelník přátelství", coins: 10, streamTier: "T1", catalogKey: null },
  { label: "Parfém", coins: 20, streamTier: "T1", catalogKey: "HEART" },
  { label: "Kobliha", coins: 30, streamTier: "T1", catalogKey: "DONUT" },
  { label: "Kaktusový mix", coins: 399, streamTier: "T1", catalogKey: null },
  { label: "Klaun Boogie", coins: 449, streamTier: "T1", catalogKey: null },
  { label: "Bubnový křeček", coins: 449, streamTier: "T1", catalogKey: null },
  { label: "Dobrý večer", coins: 399, streamTier: "T1", catalogKey: null },
  { label: "Srdce na dlani", coins: 100, streamTier: "T2", catalogKey: "HEART" },
  { label: "Vítězství fanklubu", coins: 99, streamTier: "T1", catalogKey: null },
  { label: "Úžasné konfety", coins: 100, streamTier: "T2", catalogKey: null, note: "Lv.10 dárce" },
  { label: "Pistole na peníze", coins: 500, streamTier: "T1", catalogKey: null },
  { label: "Drahokamová pumpa", coins: 500, streamTier: "T2", catalogKey: null, note: "Lv.15 dárce" },
  { label: "Labuť", coins: 699, streamTier: "T2", catalogKey: null },
  { label: "Vlak", coins: 899, streamTier: "T2", catalogKey: null },
  { label: "Ohňostroj", coins: 1088, streamTier: "T3", catalogKey: null },
  { label: "Lesklý horkovzdušný balón", coins: 1000, streamTier: "T3", catalogKey: null, note: "Lv.20 dárce" },
  { label: "Raketa", coins: 1500, streamTier: "T3", catalogKey: null },
  { label: "Potápění s velrybami", coins: 2150, streamTier: "T3", catalogKey: null },
  { label: "Tančící kapybary", coins: 2200, streamTier: "T3", catalogKey: "CAPYBARA", note: "gift chat loop animal" },
  { label: "Motorka", coins: 2988, streamTier: "T3", catalogKey: null },
  { label: "Rytmický medvěd", coins: 2999, streamTier: "T3", catalogKey: null },
  { label: "Meteorický déšť", coins: 3000, streamTier: "T3", catalogKey: null },
  { label: "Jarní vlak", coins: 3999, streamTier: "T3", catalogKey: null },
  { label: "Město budoucnosti", coins: 6000, streamTier: "T4", catalogKey: null },
  { label: "Leopard Lili", coins: 6599, streamTier: "T4", catalogKey: null },
  { label: "Sportovní auto", coins: 7000, streamTier: "T4", catalogKey: null },
  { label: "Leon a Lili", coins: 9699, streamTier: "T4", catalogKey: null },
  { label: "Lili a Sakura", coins: 12000, streamTier: "T5", catalogKey: null },
  { label: "Podpora komunity", coins: 15000, streamTier: "T5", catalogKey: null },
  { label: "Paříme naplno", coins: 15000, streamTier: "T5", catalogKey: null },
  { label: "Go Big hřebec", coins: 15000, streamTier: "T5", catalogKey: null },
  { label: "Rodinné chvíle", coins: 15000, streamTier: "T5", catalogKey: null },
  { label: "Černý vlk", coins: 15000, streamTier: "T5", catalogKey: null },
  { label: "Bílý tygr", coins: 15999, streamTier: "T5", catalogKey: null },
  { label: "Křišťálové srdce", coins: 14999, streamTier: "T5", catalogKey: null },
  { label: "Létající láska", coins: 19999, streamTier: "T5", catalogKey: null },
  { label: "Nekonečné moře", coins: 23999, streamTier: "T6", catalogKey: null },
  { label: "Černý tygr", coins: 22000, streamTier: "T6", catalogKey: null }
];

function coinsToStreamTier(coins = 0) {
  if (coins >= 25000) return "T6";
  if (coins >= 10000) return "T5";
  if (coins >= 5000) return "T4";
  if (coins >= 1000) return "T3";
  if (coins >= 100) return "T2";
  return "T1";
}

function copyScreenshots() {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  const copied = [];
  if (!fs.existsSync(SRC_DIR)) return copied;

  for (const name of fs.readdirSync(SRC_DIR)) {
    if (!/\.(png|jpg|jpeg|webp)$/i.test(name)) continue;
    const src = path.join(SRC_DIR, name);
    const dest = path.join(DEST_DIR, name);
    fs.copyFileSync(src, dest);
    copied.push(`gift-map-screenshots/${name}`);
  }
  return copied;
}

function main() {
  const gifts = GIFTS_FROM_SCREENSHOTS.map((row) => ({
    ...row,
    streamTier: row.streamTier || coinsToStreamTier(row.coins),
    source: "tiktok_live_panel_screenshot",
    capturedAt: "2026-04-13"
  }));

  const screenshots = copyScreenshots();
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    purpose: "gift_map_reference",
    note: "Screenshoty nejsou OBS video — jen panel TikTok dárků (název + coiny). Overlay nikdy neukazuje coiny ve streamu.",
    screenshotDir: "incoming-images/gift-map-screenshots",
    screenshots,
    gifts,
    tierFromCoins: {
      T1: 1,
      T2: 100,
      T3: 1000,
      T4: 5000,
      T5: 10000,
      T6: 25000
    }
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        path: OUT_PATH,
        gifts: gifts.length,
        screenshots: screenshots.length,
        destDir: DEST_DIR
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main();
}

module.exports = { GIFTS_FROM_SCREENSHOTS, OUT_PATH, copyScreenshots };
