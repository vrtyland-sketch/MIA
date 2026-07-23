"use strict";

/**
 * OBS očima streamera — zobrazení, pohyby, alpha, smysl overlay vrstev.
 *
 *   node scripts/koj_obs_visual_audit.js
 *   node scripts/koj_obs_visual_audit.js --json
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { PNG } = require("pngjs");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "mia-output-overlay", "assets", "kojnozrout");
const OVERLAY = path.join(ROOT, "mia-output-overlay");
const PORT = Number(process.env.PORT || 3000);

function readPngAlpha(filePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on("parsed", function onParsed() {
        let transparent = 0;
        const corners = [
          this.data[3],
          this.data[(this.width - 1) * 4 + 3],
          this.data[(this.width * (this.height - 1)) * 4 + 3]
        ];
        for (let i = 3; i < this.data.length; i += 4) {
          if (this.data[i] === 0) transparent += 1;
        }
        resolve({
          width: this.width,
          height: this.height,
          alphaPct: (transparent / (this.width * this.height)) * 100,
          cornersAlphaZero: corners.every((a) => a === 0)
        });
      })
      .on("error", reject);
  });
}

function check(name, ok, detail, fix) {
  return { area: name, ok, detail, fix: fix || null, severity: ok ? "ok" : "warn" };
}

async function auditPropAlpha() {
  const dir = path.join(ASSETS, "props");
  const rows = [];
  for (const file of ["bowl.png", "ball.png", "mic.png", "hand.png"]) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) {
      rows.push(check(`Prop ${file}`, false, "chybí soubor", "npm run prepare:props"));
      continue;
    }
    const a = await readPngAlpha(p);
    const ok = a.alphaPct >= 55 && a.cornersAlphaZero;
    rows.push(
      check(
        `Prop ${file} — průhlednost`,
        ok,
        ok
          ? `alpha ${a.alphaPct.toFixed(1)}%, rohy průhledné — v OBS bez obdélníku`
          : `alpha ${a.alphaPct.toFixed(1)}%, rohy=${a.cornersAlphaZero} — může vypadat jako rámeček`,
        "npm run prepare:props"
      )
    );
  }
  return rows;
}

function auditRuntimeRules() {
  const html = fs.readFileSync(path.join(OVERLAY, "kojnozrout-runtime.html"), "utf8");
  const cssPath = path.join(OVERLAY, "assets", "kojnozrout", "koj-runtime.css");
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
  const bundle = `${html}\n${css}`;
  const rows = [];
  rows.push(
    check(
      "Runtime — žádné celoplošné scene PNG",
      bundle.includes(".scene-bg { display: none") && html.includes("syncSceneAccents"),
      "Scény = CSS tint + volitelné accent fragmenty, ne cover",
      null
    )
  );
  rows.push(
    check(
      "Runtime — props object-fit contain",
      bundle.includes("object-fit: contain") && bundle.includes("background: transparent"),
      "Props bez obdélníku kolem PNG",
      null
    )
  );
  rows.push(
    check(
      "Runtime — propLayer uvnitř spriteLayer",
      /id="spriteLayer"[\s\S]*id="propLayer"/.test(html),
      "Míč/miska/mic se pohybují s Kojem (corner-rest, wander)",
      null
    )
  );
  rows.push(
    check(
      "Runtime — jeden aktivní hračka (+ miska)",
      html.includes("wantHand") && html.includes("wantMic") && html.includes("wantBall"),
      "Priorita: hlazení > mic > míč; miska jen u misky/jídla",
      null
    )
  );
  rows.push(
    check(
      "Runtime — wander vs props",
      html.includes("playsWithPropNow") && html.includes("!playsWithPropNow"),
      "Při míči/mic Koj nechodí — rekvizita neujede",
      null
    )
  );
  return rows;
}

function auditAwayLoop() {
  const html = fs.readFileSync(path.join(OVERLAY, "away-loop-overlay.html"), "utf8");
  return [
    check(
      "NEJSEM TU — celoplošné gfx preview",
      html.includes('get("gfx")') && html.includes("scenes/scene-"),
      "Velká pozadí jen na away-loop?gfx=1 — správné oddělení od runtime Koje",
      null
    )
  ];
}

function auditArenaOverlays() {
  const battle = fs.readFileSync(path.join(OVERLAY, "arena-battle-overlay.html"), "utf8");
  const fx = fs.existsSync(path.join(OVERLAY, "assets", "koj-battle-fx.js"))
    ? fs.readFileSync(path.join(OVERLAY, "assets", "koj-battle-fx.js"), "utf8")
    : "";
  const team = fs.readFileSync(path.join(OVERLAY, "arena-overlay.html"), "utf8");
  return [
    check(
      "Arena battle — platformní sprite z /arena/status",
      battle.includes("spr.spriteUrl") && battle.includes("applyFighterPose"),
      "Bojové pózy z battle.sprites (platformní formy)",
      null
    ),
    check(
      "Arena team bar — roster preview",
      team.includes("tokzrout-preview") && team.includes("stackzrout-preview"),
      "4 žrouti s avatar PNG",
      null
    ),
    check(
      "Arena VS badge — malovaný PNG",
      fs.existsSync(path.join(ASSETS, "arena", "vs-badge.png")) &&
        fs.statSync(path.join(ASSETS, "arena", "vs-badge.png")).size >= 5000,
      "vs-badge.png v battle overlay",
      null
    )
  ];
}

async function auditItemIcons() {
  const dir = path.join(ASSETS, "items");
  const sample = ["snack", "box", "lektvar", "jablko"];
  const rows = [];
  for (const id of sample) {
    const p = path.join(dir, `${id}.png`);
    if (!fs.existsSync(p)) {
      rows.push(check(`Item ${id}`, false, "chybí", "npm run generate:koj-2d-factory -- --force"));
      continue;
    }
    const st = fs.statSync(p);
    const a = await readPngAlpha(p);
    const ok = st.size >= 300 && (a.alphaPct >= 50 || st.size >= 5000);
    rows.push(
      check(
        `Item ${id} — ikona batohu`,
        ok,
        ok
          ? `${st.size} B · alpha ${a.alphaPct.toFixed(0)}% — malovaný PNG OK`
          : `${st.size} B · alpha ${a.alphaPct.toFixed(0)}%`,
        "npm run generate:koj-2d-factory -- --force"
      )
    );
  }
  return rows;
}

function auditOverlayFiles() {
  const required = [
    "kojnozrout-runtime.html",
    "kojnozrout-bowl-overlay.html",
    "kojnozrout-backpack-overlay.html",
    "arena-overlay.html",
    "arena-battle-overlay.html",
    "arena-battle-test-overlay.html",
    "away-loop-overlay.html",
    "koj-scenes-gallery.html",
    "koj-props-gallery.html"
  ];
  return required.map((f) =>
    check(
      `Overlay ${f}`,
      fs.existsSync(path.join(OVERLAY, f)),
      fs.existsSync(path.join(OVERLAY, f)) ? "soubor OK" : "chybí",
      null
    )
  );
}

function fetchOverlay(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => resolve({ status: res.statusCode, ok: res.statusCode === 200, len: body.length }));
    });
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
  });
}

async function auditServerLive() {
  const base = `http://127.0.0.1:${PORT}`;
  const urls = [
    `${base}/kojnozrout-runtime.html`,
    `${base}/away-loop-overlay.html?gfx=1&scene=cave`,
    `${base}/arena-battle-test-overlay.html`,
    `${base}/overlay-state`
  ];
  const rows = [];
  for (const url of urls) {
    const r = await fetchOverlay(url);
    rows.push(
      check(
        `Live ${url.replace(base, "")}`,
        r.ok,
        r.ok ? `HTTP ${r.status}` : r.error || `HTTP ${r.status}`,
        r.ok ? null : "npm start — pak OBS browser source refresh"
      )
    );
  }
  return rows;
}

function humanSummary(all) {
  const fails = all.filter((r) => !r.ok);
  const lines = [
    "",
    "==== OBS VISUAL AUDIT (očima streamera) ====",
    "",
    "RUNTIME KOJ",
    "  • Koj = čisté PNG sprite, props u nohou/boku, žádný obdélník pozadí",
    "  • Miska jen u jídla/odpočinku u rohu; míč/mic když hraje/mluví",
    "  • Wander (chůze) se vypne při rekvizitě — dává smysl",
    "  • Scény za Kojem = barevný tint, NE celý obraz jeskyně",
    "",
    "NEJSEM TU / AWAY",
    "  • Celoplošná scene PNG jen zde (?gfx=1) — vhodné pro test grafiky",
    "",
    "ARENA",
    "  • Team bar + battle overlay — platformní žrouti, HP, projectiles",
    "",
    `Výsledek: ${all.length - fails.length}/${all.length} OK` + (fails.length ? ` · ${fails.length} k opravě` : ""),
    ""
  ];
  if (fails.length) {
    lines.push("K opravě:");
    for (const f of fails) {
      lines.push(`  ⚠ ${f.area}: ${f.detail}${f.fix ? ` → ${f.fix}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const asJson = process.argv.includes("--json");
  const all = [
    ...(await auditPropAlpha()),
    ...(await auditItemIcons()),
    ...auditRuntimeRules(),
    ...auditAwayLoop(),
    ...auditArenaOverlays(),
    ...auditOverlayFiles(),
    ...(await auditServerLive())
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    ok: all.filter((r) => r.ok).length,
    total: all.length,
    items: all
  };

  const outPath = path.join(ROOT, "data", "koj-obs-visual-audit.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(humanSummary(all));
    for (const row of all) {
      console.log(`${row.ok ? "OK" : "WARN"}  ${row.area} — ${row.detail}`);
    }
    console.log(`\nUloženo: ${outPath}`);
  }

  if (all.some((r) => !r.ok && r.severity !== "warn")) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
