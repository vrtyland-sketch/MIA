"use strict";

/**
 * Build FIRST LIVE REPORT from observation evidence (read-only).
 *   node scripts/mia_first_live_report.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(ROOT, "docs", "FIRST_LIVE_OBSERVATION_EVIDENCE.jsonl");
const TIMELINE = path.join(ROOT, "docs", "FIRST_LIVE_OBSERVATION_TIMELINE.json");
const SESSION = path.join(ROOT, "docs", "FIRST_LIVE_OBSERVATION_SESSION.md");
const OUT_JSON = path.join(ROOT, "docs", "FIRST_LIVE_REPORT.json");
const OUT_MD = path.join(ROOT, "docs", "FIRST_LIVE_REPORT.md");

function readEvidence() {
  if (!fs.existsSync(EVIDENCE)) return [];
  return fs
    .readFileSync(EVIDENCE, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function main() {
  const rows = readEvidence();
  const timeline = fs.existsSync(TIMELINE)
    ? JSON.parse(fs.readFileSync(TIMELINE, "utf8"))
    : { firsts: {} };
  const firsts = timeline.firsts || {};
  const criticals = rows.filter((r) => r.kind === "CRITICAL");
  const errors = rows.filter((r) => r.kind === "ERROR_LOG");
  const ticks = rows.filter((r) => r.kind === "TICK");
  const lastTick = ticks[ticks.length - 1] || null;

  const passChecks = {
    firstTikTokComment: !!firsts.firstTikTokComment,
    firstAhojMia: !!firsts.firstAhojMia,
    firstMiaReply: !!firsts.firstMiaReply,
    firstGift: !!firsts.firstGift,
    firstGiftOverlayOrVideo: !!firsts.firstGiftOverlayOrVideo,
    firstBowlUpdate: !!firsts.firstBowlUpdate,
    healthOkAtEnd: !!(lastTick && lastTick.healthOk),
    noCriticalHealth: !criticals.some((c) => c.code === "health_not_ok")
  };

  const passCount = Object.values(passChecks).filter(Boolean).length;
  let verdict = "FAIL";
  if (passChecks.firstTikTokComment && passChecks.healthOkAtEnd) {
    verdict =
      passCount >= Object.keys(passChecks).length - 1
        ? "PASS"
        : "PASS_WITH_DEVIATIONS";
  }

  const deviations = [];
  for (const [k, v] of Object.entries(passChecks)) {
    if (!v) deviations.push(`${k} missing/failed`);
  }
  for (const c of criticals) {
    deviations.push(`CRITICAL ${c.code} @ ${c.at}`);
  }

  const report = {
    title: "MIA FIRST LIVE REPORT",
    mode: "FIRST_LIVE_OBSERVATION",
    generatedAt: new Date().toISOString(),
    verdict,
    passChecks,
    firsts,
    criticals,
    errorLogCount: errors.length,
    tickCount: ticks.length,
    lastTick,
    deviations,
    evidenceFile: EVIDENCE,
    timelineFile: TIMELINE,
    sessionFile: SESSION,
    blockersBeforeSecondStream: [
      !firsts.firstTikTokComment
        ? "No TikTok comment ingest — verify TikFinity → MIA"
        : null,
      !firsts.firstGift ? "No gift observed — one small gift smoke next time" : null,
      criticals.length ? "Clear CRITICAL items from evidence before second stream" : null,
      "Keep YouTube/Twitch parked",
      "Free more disk before long OBS recording"
    ].filter(Boolean)
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  const md = [
    `# ${report.title}`,
    "",
    `**Verdict:** ${report.verdict}`,
    `**Generated:** ${report.generatedAt}`,
    "",
    "## PASS checks",
    ...Object.entries(passChecks).map(([k, v]) => `- ${v ? "PASS" : "FAIL"} \`${k}\``),
    "",
    "## Timeline (firsts)",
    "```json",
    JSON.stringify(firsts, null, 2),
    "```",
    "",
    "## Criticals",
    ...(criticals.length
      ? criticals.map(
          (c) =>
            `- ${c.at} · **${c.code}** · expected=\`${JSON.stringify(c.expectedAction)}\` · actual=\`${JSON.stringify(c.actualResult).slice(0, 160)}\` · safe=\`${c.safestLayerToDisable}\``
        )
      : ["- none"]),
    "",
    "## Deviations",
    ...(deviations.length ? deviations.map((d) => `- ${d}`) : ["- none"]),
    "",
    "## Blockers before second stream",
    ...report.blockersBeforeSecondStream.map((b) => `- ${b}`),
    "",
    "## Evidence",
    `- ${EVIDENCE}`,
    `- ${TIMELINE}`,
    ""
  ].join("\n");
  fs.writeFileSync(OUT_MD, md, "utf8");

  console.log(
    JSON.stringify(
      { ok: true, verdict, outJson: OUT_JSON, outMd: OUT_MD, firstsFilled: passCount },
      null,
      2
    )
  );
}

main();
