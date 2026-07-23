"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { main } = require("../scripts/mia_replay");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

async function run() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mia-replay-"));
  const file = path.join(tmp, "events.jsonl");
  const lines = [
    {
      loggedAt: Date.now(),
      event: {
        id: "e1",
        platform: "tiktok",
        type: "gift",
        user: { id: "u1", name: "Pepa" },
        gift: { name: "Rose", miaPoints: 7.5, count: 1 },
        timestamp: Date.now()
      }
    },
    {
      loggedAt: Date.now(),
      event: {
        id: "e2",
        platform: "tiktok",
        type: "gift",
        user: { id: "u1", name: "Pepa" },
        gift: { name: "Rose", miaPoints: 7.5, count: 1 },
        timestamp: Date.now()
      }
    },
    {
      loggedAt: Date.now(),
      event: {
        id: "e3",
        platform: "tiktok",
        type: "chat",
        user: { id: "u2", name: "Ada" },
        text: "ahoj",
        timestamp: Date.now()
      }
    }
  ];
  fs.writeFileSync(file, lines.map((x) => JSON.stringify(x)).join("\n"), "utf8");

  await test("replay dry-run exits cleanly", async () => {
    const logs = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      await main([file]);
    } finally {
      console.log = orig;
    }
    const jsonLine = logs.find((l) => l.includes('"mode": "dry-run"') || l.includes('"mode":"dry-run"'));
    assert.ok(jsonLine || logs.some((l) => l.includes("dry-run")), "expected dry-run summary");
  });

  await test("replay --apply drains queue in dry mode", async () => {
    const logs = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      await main([file, "--apply"]);
    } finally {
      console.log = orig;
    }
    const joined = logs.join("\n");
    assert.match(joined, /apply-dry/);
    assert.match(joined, /"drained"/);
    assert.match(joined, /Guarded dry drain/);
  });

  console.log("phase1_replay_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
