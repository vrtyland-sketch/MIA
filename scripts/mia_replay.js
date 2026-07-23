"use strict";

/**
 * Phase 1 replay — reads JSONL of unified runtime events.
 *
 * Default: dry-run summary (normalize + count).
 * --apply: normalize → enqueue into Action Queue → drain with dry handlers
 *          (never hits TikTok / OBS / live TTS).
 *
 * Usage:
 *   node scripts/mia_replay.js logs/mia-runtime-events-2026-07-20.jsonl
 *   node scripts/mia_replay.js logs/mia-runtime-events-2026-07-20.jsonl --limit 50
 *   node scripts/mia_replay.js logs/mia-runtime-events-2026-07-20.jsonl --apply
 *   npm run replay -- logs/mia-runtime-events-2026-07-20.jsonl --apply
 */

const fs = require("fs");
const path = require("path");
const {
  fromLegacyNormalized,
  normalizeToMiaEvent
} = require("../core/event-normalizer");
const {
  createActionQueue,
  createActionQueueRunner,
  eventToQueueAction
} = require("../core/action-queue");

function usage() {
  console.log(`Usage: node scripts/mia_replay.js <file.jsonl> [options]

Options:
  --limit N   Max events to read (default: all; preview print capped at 20)
  --apply     Guarded apply: normalize → Action Queue → dry drain
              (no OBS / TikTok / live TTS)
  --help      Show this help

Default mode is dry-run summary only.`);
}

function parseArgs(argv = []) {
  const opts = {
    file: null,
    limit: Infinity,
    apply: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg === "--apply") opts.apply = true;
    else if (arg === "--limit") {
      opts.limit = Number(argv[i + 1]) || 50;
      i += 1;
    } else if (!opts.file && !arg.startsWith("-")) {
      opts.file = arg;
    }
  }
  return opts;
}

function resolveEvent(row) {
  let event = row.event || row;
  if (!event.type && (event.eventType || event.support)) {
    event = fromLegacyNormalized(event);
  } else if (!event.type && row.raw) {
    event = normalizeToMiaEvent(row.raw);
  } else if (event.type || event.platform) {
    // Already unified — re-normalize lightly for stable shape when raw present.
    if (row.raw && !event.gift && !event.text) {
      event = normalizeToMiaEvent(row.raw);
    }
  }
  return event;
}

function applyThroughQueue(events) {
  const queue = createActionQueue({ coalesceWindowMs: 2500, maxSize: 128 });
  const applied = [];
  let enqueued = 0;
  let coalesced = 0;

  for (const event of events) {
    const shell = eventToQueueAction(event, { dry: true });
    const result = queue.enqueue(shell);
    if (result.coalesced) coalesced += 1;
    else enqueued += 1;
  }

  const runner = createActionQueueRunner(queue, {
    dry: true,
    speak: async (action) => {
      applied.push({
        kind: "speak",
        id: action.id,
        priority: action.priority,
        count: action.count,
        text: action.payload?.text || null,
        coalesceKey: action.coalesceKey || null
      });
      return { ok: true, dry: true };
    },
    overlay: async (action) => {
      applied.push({
        kind: "overlay",
        id: action.id,
        priority: action.priority,
        text: action.payload?.text || null
      });
      return { ok: true, dry: true };
    },
    generic: async (action) => {
      applied.push({
        kind: "generic",
        id: action.id,
        type: action.type,
        priority: action.priority
      });
      return { ok: true, dry: true };
    }
  });

  return runner.drainOnce(Math.max(events.length, 64)).then((drain) => ({
    enqueued,
    coalesced,
    drained: drain.processed,
    applied,
    queueRemaining: queue.size()
  }));
}

async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);

  if (opts.help || !opts.file) {
    usage();
    process.exit(opts.help ? 0 : 1);
  }

  const filePath = path.resolve(opts.file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const counts = { gift: 0, chat: 0, other: 0 };
  const events = [];
  let shown = 0;
  let parsed = 0;

  for (const line of lines) {
    if (parsed >= opts.limit) break;
    let row;
    try {
      row = JSON.parse(line);
    } catch (_err) {
      continue;
    }
    parsed += 1;

    const event = resolveEvent(row);
    events.push(event);

    const type = String(event.type || "other").toLowerCase();
    if (type === "gift") counts.gift += 1;
    else if (type === "chat" || type === "comment") counts.chat += 1;
    else counts.other += 1;

    if (shown < 20) {
      shown += 1;
      const user = event.user?.name || "?";
      const gift = event.gift
        ? `${event.gift.name} miaPoints=${event.gift.miaPoints}`
        : event.text
          ? String(event.text).slice(0, 60)
          : "";
      console.log(
        `[${shown}] ${event.platform || "?"} ${type} ${user} ${gift}`.trim()
      );
    }
  }

  const summary = {
    ok: true,
    mode: opts.apply ? "apply-dry" : "dry-run",
    file: filePath,
    parsed,
    counts
  };

  if (opts.apply) {
    const applyResult = await applyThroughQueue(events);
    summary.apply = {
      enqueued: applyResult.enqueued,
      coalesced: applyResult.coalesced,
      drained: applyResult.drained,
      queueRemaining: applyResult.queueRemaining,
      appliedPreview: applyResult.applied.slice(0, 25),
      appliedTotal: applyResult.applied.length,
      note: "Guarded dry drain — no OBS / TikTok / live TTS"
    };
  } else {
    summary.note =
      "Dry-run only. Use --apply to enqueue through Action Queue (still dry).";
  }

  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main, parseArgs, resolveEvent, applyThroughQueue };
