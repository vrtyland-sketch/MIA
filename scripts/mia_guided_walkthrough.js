"use strict";

/**
 * MIA řízená prohlídka — „projdi s MIA všechny overlaye a funkce, ať vidí,
 * co a jak divák reálně uvidí, a uč se z toho".
 *
 * Pro každý krok:
 *   1) spustí funkci/overlay (HTTP trigger) tak, jak by ji spustil divák/streamer,
 *   2) počká, až se to vykreslí,
 *   3) MIA se podívá ZRAKEM: screenshot CELÉ scény (co vidí divák) + screenshot
 *      konkrétního zdroje, analýza pokrytí (vidí tam vůbec něco?),
 *   4) MIA posoudí kompozici (display self-check: mimo obraz, překryvy, prázdné),
 *   5) uloží poznatek (screenshot + verdikt + co se čekalo vs. co viděla).
 *
 * Výstup = učící artefakt: JSON log + Markdown „co MIA viděla".
 *
 *   npm run mia:walkthrough
 *   node scripts/mia_guided_walkthrough.js --quick   (kratší čekání)
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { analyzePngBase64Coverage } = require("./MIA_EYES");

const BASE = process.env.MIA_BASE_URL || "http://127.0.0.1:3000";
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "generated", "walkthrough");
const args = process.argv.slice(2);
const QUICK = args.includes("--quick");
const SCENE = process.env.MIA_OBS_CAMERA_SCENE || "SPINAK_ENGINE_GIFTS";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = (ms) => (QUICK ? Math.min(ms, 1500) : ms);

async function http(method, p, body) {
  const opts = { method, cache: "no-store", headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${p}`, opts);
  let json = null;
  try {
    json = await res.json();
  } catch (_e) {}
  return { status: res.status, ok: res.ok, json };
}

const post = (p, body) => http("POST", p, body || {});
const get = (p) => http("GET", p);

/** Po každém kroku vrátí scénu do idle — zapne trvalé overlaye v OBS. */
async function restoreIdle() {
  try {
    await post("/overlay/clear", {});
    await post("/mia/vision/tick", {});
  } catch (_e) {}
  await sleep(W(400));
}

/** Po triggeru synchronizuj OBS layout s overlay-state (zapne efemerní zdroje). */
async function syncVision() {
  try {
    await post("/mia/vision/tick", {});
  } catch (_e) {}
  await sleep(W(500));
}

function gift(tier, coins, unique, nick, giftName) {
  return post("/ingest", {
    type: "gift",
    platform: "tiktok",
    giftName,
    coins,
    diamondCount: coins,
    repeatCount: 1,
    uniqueId: unique,
    nickname: nick,
    tikfinityUserId: String(90000 + tier),
    tikfinityUsername: unique
  });
}

function comment(text, unique, nick) {
  return post("/ingest", {
    type: "comment",
    platform: "tiktok",
    comment: text,
    content: text,
    uniqueId: unique,
    nickname: nick || unique
  });
}

/**
 * MIA se podívá: screenshot zdroje + analýza pokrytí.
 * Čte uložený soubor z disku (server běží lokálně).
 */
async function look(source) {
  try {
    const r = await get(`/mia/eyes/screenshot?source=${encodeURIComponent(source)}&save=1&_=${Date.now()}`);
    const shot = r.json?.shot;
    if (!r.json?.ok || !shot?.savedPath || !fs.existsSync(shot.savedPath)) {
      return { source, ok: false, reason: r.json?.error || shot?.reason || "no_screenshot" };
    }
    const b64 = fs.readFileSync(shot.savedPath).toString("base64");
    const cov = await analyzePngBase64Coverage(b64, { minCoverage: 0.005 });
    return {
      source,
      ok: true,
      savedPath: shot.savedPath,
      publicUrl: shot.publicUrl,
      coverage: cov.ok ? cov.coverage : null,
      blank: cov.ok ? cov.blank : null,
      bbox: cov.ok ? cov.bbox : null
    };
  } catch (err) {
    return { source, ok: false, reason: err.message };
  }
}

async function displayCheck() {
  try {
    const r = await get(`/mia/display/self-check?eyes=0&_=${Date.now()}`);
    if (!r.json?.ok) return { verdict: "N/A", findings: [], reason: r.json?.error };
    return { verdict: r.json.verdict, findings: r.json.findings || [], canvas: r.json.canvas };
  } catch (err) {
    return { verdict: "N/A", findings: [], reason: err.message };
  }
}

// ===== Scénář prohlídky =====
// each: { id, label, viewer (co divák uvidí), expect (zdroje co mají něco ukázat),
//         trigger() , settleMs }
const STEPS = [
  {
    id: "idle",
    label: "Klid (idle) — základní scéna",
    viewer: "LIVE badge, miska, Koj, prázdná bublina",
    expect: ["KOJNOZROUT_RUNTIME", "MIA_ENTITY"],
    trigger: async () => ({ note: "baseline" }),
    settleMs: 800
  },
  {
    id: "tts_mia",
    label: "MIA mluví (TTS) — bublina + hologram",
    viewer: "Bublina MIA s textem, hologram se rozzáří",
    expect: ["MIA_BUBBLE"],
    trigger: () => get("/tts/test?speaker=mia&fresh=1"),
    settleMs: 2500
  },
  {
    id: "tts_koj",
    label: "Kojnožrout mluví (TTS)",
    viewer: "Bublina Koje (fialová) + hlas",
    expect: ["MIA_BUBBLE", "KOJNOZROUT_RUNTIME"],
    trigger: () => get("/tts/test?speaker=koj&fresh=1"),
    settleMs: 2500
  },
  {
    id: "chat",
    label: "Chat zpráva → MIA odpoví",
    viewer: "Bublina s odpovědí MIA",
    expect: ["MIA_BUBBLE"],
    trigger: () => comment("Ahoj MIA, jak se má Kojnožrout?", "viewer_chat", "Divák"),
    settleMs: 2500
  },
  {
    id: "gift_t1",
    label: "Dárek T1 (Rose) → video + reakce",
    viewer: "T1 gift video, Koj reaguje, body +",
    expect: ["KOJNOZROUT_RUNTIME"],
    trigger: () => gift(1, 1, "t1_tester", "T1 Divák", "Rose"),
    settleMs: 3500
  },
  {
    id: "gift_t3",
    label: "Dárek T3 (Galaxy) → video + story",
    viewer: "T3 video, příběhový moment",
    expect: ["KOJNOZROUT_RUNTIME"],
    trigger: () => gift(3, 1000, "t3_tester", "T3 Divák", "Galaxy"),
    settleMs: 3500
  },
  {
    id: "gift_t5",
    label: "Dárek T5 (Universe) → boss video + combo",
    viewer: "T5 video, velký combo flash",
    expect: ["KOJNOZROUT_RUNTIME"],
    trigger: () => gift(5, 10000, "t5_tester", "T5 Divák", "Universe"),
    settleMs: 3500
  },
  {
    id: "combo",
    label: "Combo moment (showcase)",
    viewer: "Velký COMBO flash přes obraz",
    expect: ["MIA_COMBO"],
    trigger: () => post("/showcase/start", { itemId: "combo_moment", userLabel: "VasaSpinak" }),
    settleMs: 2500
  },
  {
    id: "t0_flyby",
    label: "T0 flyby (nový follower)",
    viewer: "Přelet ikonky/jména přes obraz",
    expect: ["MIA_T0_FLYBY"],
    trigger: () => get("/t0/test?event=FOLLOW&user=Novy%20Fan"),
    settleMs: 2500
  },
  {
    id: "story",
    label: "Story moment",
    viewer: "Příběhová karta diváka",
    expect: ["MIA_STORY"],
    trigger: () => get("/story/test?user=Karel&tier=T3&gift=Galaxy"),
    settleMs: 2800
  },
  {
    id: "gift_visual",
    label: "Gift visual karta",
    viewer: "Karta dárku s avatarem",
    expect: ["MIA_GIFT_MOMENT"],
    trigger: () => get("/gift-visual/test?tier=T2&user=Test%20Gifter&gift=Rose&mood=excited"),
    settleMs: 2500
  },
  {
    id: "duel",
    label: "Duel start → scoreboard",
    viewer: "Souboj týmů, ukazatel skóre dole",
    expect: ["MIA_DUEL"],
    trigger: () => post("/duel/start", { opponentLabel: "Soupeř", localLabel: "Náš Koj", durationSec: 120 }),
    settleMs: 2500,
    cleanup: () => post("/duel/finish", {})
  },
  {
    id: "backpack",
    label: "Batoh / inventář",
    viewer: "Panel s předměty",
    expect: ["MIA_BACKPACK"],
    trigger: () => comment("batoh", "viewer_bp", "Divák"),
    settleMs: 2500
  },
  {
    id: "koj_moods",
    label: "Koj nálady (showcase všech)",
    viewer: "Koj prochází nálady (happy, dance, …)",
    expect: ["KOJNOZROUT_RUNTIME"],
    trigger: () => post("/showcase/koj-states", { userLabel: "VasaSpinak" }),
    settleMs: 3000
  }
];

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();

  // server žije?
  const health = await get("/health").catch(() => null);
  if (!health || !health.ok) {
    console.error("❌ MIA neběží na " + BASE + ". Spusť npm run restart.");
    process.exitCode = 1;
    return;
  }

  // Na startu srovnej OBS layout (portrait TikTok idle).
  spawnSync(process.execPath, [path.join(__dirname, "obs_fix_overlay_layout.js")], {
    cwd: ROOT,
    stdio: "pipe"
  });
  await restoreIdle();

  const results = [];
  console.log(`\n🎬 MIA řízená prohlídka — ${STEPS.length} kroků (scéna ${SCENE})\n`);

  for (const step of STEPS) {
    process.stdout.write(`▶ ${step.label} … `);
    let triggerResult = null;
    try {
      triggerResult = await step.trigger();
      await syncVision();
    } catch (err) {
      triggerResult = { error: err.message };
    }
    await sleep(W(step.settleMs));

    // MIA se dívá: celá scéna (co divák vidí) + očekávané zdroje
    const program = await look(SCENE);
    const sources = [];
    for (const src of step.expect) {
      sources.push(await look(src));
    }
    const disp = await displayCheck();

    // MIA hodnotí
    const notes = [];
    if (!program.ok) {
      notes.push(`Zrak na scénu selhal: ${program.reason}`);
    } else if (program.blank) {
      notes.push("CELÁ SCÉNA vypadá prázdná — divák možná nic nevidí!");
    }
    for (const s of sources) {
      if (!s.ok) notes.push(`Zdroj ${s.source}: zrak selhal (${s.reason}).`);
      else if (s.blank) notes.push(`Zdroj ${s.source}: prázdný — divák tu nic nevidí (chybí PNG/efekt?).`);
      else notes.push(`Zdroj ${s.source}: vidím obsah, pokrytí ${(s.coverage * 100).toFixed(1)} %.`);
    }
    const dispWarn = (disp.findings || []).filter((f) => f.level === "warn" || f.level === "fail");
    for (const f of dispWarn) notes.push(`Kompozice: ${f.msg}`);

    const stepStatus = sources.some((s) => s.ok && s.blank) || (program.ok && program.blank)
      ? "WARN"
      : dispWarn.some((f) => f.level === "fail")
        ? "FAIL"
        : "OK";

    console.log(stepStatus === "OK" ? "✅" : stepStatus === "WARN" ? "⚠️" : "❌");

    results.push({
      id: step.id,
      label: step.label,
      viewer: step.viewer,
      status: stepStatus,
      triggerStatus: triggerResult?.status ?? (triggerResult?.error ? "err" : "ok"),
      programScene: program,
      sources,
      displayVerdict: disp.verdict,
      notes
    });

    if (typeof step.cleanup === "function") {
      try {
        await step.cleanup();
      } catch (_e) {}
    }
    await restoreIdle();
    await sleep(W(400));
  }

  // klid na konec
  try {
    await post("/overlay/clear", {});
  } catch (_e) {}

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    base: BASE,
    scene: SCENE,
    steps: results,
    counts: {
      ok: results.filter((r) => r.status === "OK").length,
      warn: results.filter((r) => r.status === "WARN").length,
      fail: results.filter((r) => r.status === "FAIL").length
    }
  };

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(OUT_DIR, `walkthrough-${ts}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  const mdPath = path.join(OUT_DIR, "MIA_WALKTHROUGH_LEARNED.md");
  fs.writeFileSync(mdPath, renderMarkdown(summary));

  console.log(`\n📊 Hotovo: ${summary.counts.ok} OK · ${summary.counts.warn} WARN · ${summary.counts.fail} FAIL`);
  console.log(`📝 Učení uloženo:\n   ${jsonPath}\n   ${mdPath}`);

  process.exitCode = summary.counts.fail > 0 ? 1 : 0;
}

function renderMarkdown(s) {
  const lines = [];
  lines.push("# Co MIA viděla — řízená prohlídka overlayů a funkcí");
  lines.push("");
  lines.push(`Sken: ${s.startedAt} · scéna \`${s.scene}\``);
  lines.push(`Souhrn: **${s.counts.ok} OK · ${s.counts.warn} WARN · ${s.counts.fail} FAIL**`);
  lines.push("");
  lines.push("Tento dokument je MIA učení: u každé funkce co se spustilo, co měl divák vidět, a co MIA reálně zrakem uviděla (screenshot + pokrytí).");
  lines.push("");
  for (const r of s.steps) {
    const icon = r.status === "OK" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
    lines.push(`## ${icon} ${r.label}`);
    lines.push("");
    lines.push(`- **Divák uvidí:** ${r.viewer}`);
    lines.push(`- **Stav:** ${r.status} · display verdikt: ${r.displayVerdict}`);
    if (r.programScene?.publicUrl) {
      lines.push(`- **Celá scéna (co vidí divák):** \`${r.programScene.publicUrl}\` (pokrytí ${r.programScene.coverage != null ? (r.programScene.coverage * 100).toFixed(1) + " %" : "?"})`);
    }
    for (const src of r.sources) {
      if (src.publicUrl) {
        lines.push(`- Zdroj \`${src.source}\`: \`${src.publicUrl}\`${src.coverage != null ? ` (${(src.coverage * 100).toFixed(1)} %)` : ""}${src.blank ? " — PRÁZDNÉ" : ""}`);
      }
    }
    if (r.notes.length) {
      lines.push(`- **MIA poznámky:**`);
      for (const n of r.notes) lines.push(`  - ${n}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

if (require.main === module) {
  run().catch((err) => {
    console.error("walkthrough selhal:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { run };
