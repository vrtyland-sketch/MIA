"use strict";

/**
 * STREAM_VALIDATION_02 — INGEST GATE
 * Prove/disprove TikTok COMMENT reaching MIA ingest + lastIngest.
 *
 *   node scripts/stream_validation_02_ingest_gate.js
 *   node scripts/stream_validation_02_ingest_gate.js --watch=120
 *   node scripts/stream_validation_02_ingest_gate.js --post-control
 *
 * --post-control: POST TikFinity-shaped COMMENT to /ingest (MIA endpoint only, not TikFinity UI).
 */

const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "STREAM_VALIDATION_02_INGEST_GATE.jsonl");
const WATCH_SEC = Number(
  (process.argv.find((a) => a.startsWith("--watch=")) || "").split("=")[1] || 0
);
const POST_CONTROL = process.argv.includes("--post-control");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function append(row) {
  fs.appendFileSync(OUT, `${JSON.stringify(row)}\n`, "utf8");
}

function fetchHealth(timeoutMs = 12000) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const req = http.get("http://127.0.0.1:3000/health", { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve({
            latencyMs: Date.now() - t0,
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (err) {
          resolve({ latencyMs: Date.now() - t0, status: res.statusCode, error: err.message });
        }
      });
    });
    req.on("error", (err) => resolve({ latencyMs: Date.now() - t0, error: err.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ latencyMs: Date.now() - t0, error: "timeout" });
    });
  });
}

function tailIngestLog(day) {
  const logPath = path.join(ROOT, "logs", `ingest-${day}.jsonl`);
  if (!fs.existsSync(logPath)) {
    return { exists: false, count: 0, last: null, path: logPath };
  }
  const lines = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/).filter(Boolean);
  const last = lines.length ? JSON.parse(lines[lines.length - 1]) : null;
  return { exists: true, count: lines.length, last, path: logPath };
}

function tailMiaEvents(day, limit = 5) {
  const logPath = path.join(ROOT, "logs", `mia-events-${day}.jsonl`);
  if (!fs.existsSync(logPath)) return { exists: false, tail: [] };
  const lines = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/).filter(Boolean);
  return { exists: true, tail: lines.slice(-limit).map((l) => {
    try { return JSON.parse(l); } catch { return { raw: l }; }
  }) };
}

function lastIngestKey(li) {
  if (!li) return null;
  return `${li.atIso || li.at}|${li.eventType}|${li.user}|${li.message}`;
}

async function postControlComment() {
  const payload = {
    value1: "Testuser123",
    value2: "INGEST_GATE test comment",
    content: "INGEST_GATE test comment",
    userId: "0",
    username: "Testuser123",
    nickname: "Test User 123",
    commandParams: "INGEST_GATE test comment",
    tikfinityUserId: "2743946",
    tikfinityUsername: "vaclavvrtyland"
  };
  const body = JSON.stringify(payload);
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: "/ingest",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
      },
      (res) => {
        let text = "";
        res.on("data", (c) => (text += c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: text.slice(0, 300) })
        );
      }
    );
    req.on("error", (err) => resolve({ status: 0, error: err.message }));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    req.write(body);
    req.end();
  });
}

async function snapshot(phase) {
  const day = today();
  const health = await fetchHealth();
  const ingest = tailIngestLog(day);
  const events = tailMiaEvents(day);
  const row = {
    ts: new Date().toISOString(),
    phase,
    health: {
      ok: health.data?.ok,
      latencyMs: health.latencyMs,
      error: health.error,
      obsConnected: health.data?.obsConnected,
      lastIngest: health.data?.lastIngest || null
    },
    ingestLog: ingest,
    miaEventsTail: events
  };
  append(row);
  return row;
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  append({ kind: "SESSION_START", ts: new Date().toISOString(), protocol: "STREAM_VALIDATION_02_INGEST_GATE" });

  const baseline = await snapshot("baseline");
  const baselineKey = lastIngestKey(baseline.health.lastIngest);
  console.log(JSON.stringify({ phase: "baseline", baselineKey, ingestExists: baseline.ingestLog.exists }));

  if (POST_CONTROL) {
    const post = await postControlComment();
    append({ kind: "POST_CONTROL", ts: new Date().toISOString(), post });
    console.log(JSON.stringify({ phase: "post_control", post }));
    await new Promise((r) => setTimeout(r, 1500));
    await snapshot("after_post_control");
  }

  if (WATCH_SEC > 0) {
    console.log(JSON.stringify({ phase: "watch", seconds: WATCH_SEC, hint: "Send TikFinity test comment now" }));
    const started = Date.now();
    let changed = false;
    while (Date.now() - started < WATCH_SEC * 1000) {
      await new Promise((r) => setTimeout(r, 3000));
      const row = await snapshot("watch");
      const key = lastIngestKey(row.health.lastIngest);
      if (key && key !== baselineKey) {
        changed = true;
        append({ kind: "INGEST_CHANGED", ts: new Date().toISOString(), from: baselineKey, to: key });
        break;
      }
    }
    if (!changed) {
      append({ kind: "WATCH_NO_CHANGE", ts: new Date().toISOString(), baselineKey });
    }
  }

  const final = await snapshot("final");
  const finalKey = lastIngestKey(final.health.lastIngest);
  const ingestChanged = finalKey !== baselineKey;
  const hasComment =
    final.health.lastIngest?.eventType === "COMMENT" ||
    (final.ingestLog.last && final.ingestLog.last.eventType === "COMMENT");

  const verdict =
    ingestChanged && hasComment
      ? "PASS"
      : ingestChanged
        ? "PARTIAL"
        : "FAIL";

  const summary = {
    kind: "SUMMARY",
    ts: new Date().toISOString(),
    verdict,
    baselineKey,
    finalKey,
    ingestLogPath: final.ingestLog.path,
    ingestLogLast: final.ingestLog.last,
    postControlUsed: POST_CONTROL,
    evidence: OUT,
    note:
      verdict === "PASS" && POST_CONTROL
        ? "PASS via local POST only — TikFinity UI path still requires manual test"
        : verdict === "FAIL"
          ? "No new COMMENT in lastIngest / ingest log"
          : undefined
  };
  append(summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
