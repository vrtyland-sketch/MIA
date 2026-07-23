"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  prepareLogFile,
  cleanupOldLogs,
  getMaxBytes
} = require("../scripts/MIA_LOG_ROTATION");

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

test("prepareLogFile rotates when file exceeds max size", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-log-"));
  const filePath = path.join(dir, "ingest-2026-06-13.jsonl");
  const originalMax = process.env.MIA_LOG_MAX_MB;

  try {
    process.env.MIA_LOG_MAX_MB = "0.001";
    fs.writeFileSync(filePath, "x".repeat(getMaxBytes() + 32), "utf8");
    prepareLogFile(filePath);

    assert.equal(fs.existsSync(filePath), false);
    assert.equal(fs.existsSync(path.join(dir, "ingest-2026-06-13.1.jsonl")), true);
  } finally {
    if (originalMax === undefined) {
      delete process.env.MIA_LOG_MAX_MB;
    } else {
      process.env.MIA_LOG_MAX_MB = originalMax;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("cleanupOldLogs removes jsonl older than retention", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mia-log-clean-"));
  const oldFile = path.join(dir, "ingest-2000-01-01.jsonl");
  const newFile = path.join(dir, "ingest-2099-01-01.jsonl");
  const originalDays = process.env.MIA_LOG_RETENTION_DAYS;

  try {
    process.env.MIA_LOG_RETENTION_DAYS = "7";
    fs.writeFileSync(oldFile, "old\n", "utf8");
    fs.writeFileSync(newFile, "new\n", "utf8");

    const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000;
    fs.utimesSync(oldFile, oldTime / 1000, oldTime / 1000);

    cleanupOldLogs(dir);

    assert.equal(fs.existsSync(oldFile), false);
    assert.equal(fs.existsSync(newFile), true);
  } finally {
    if (originalDays === undefined) {
      delete process.env.MIA_LOG_RETENTION_DAYS;
    } else {
      process.env.MIA_LOG_RETENTION_DAYS = originalDays;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
