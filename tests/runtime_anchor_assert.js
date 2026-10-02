"use strict";

const assert = require("assert");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Live stores that a fresh clone may omit. The constants still name the
// runtime integration point; the tracked stand-in is the source anchor.
const MUTABLE_RUNTIME_ANCHORS = Object.freeze({
  "data/kojnozout-world.json": "data/kojnozout-world.example.json",
  "data/story-memory.json": "data/story-memory.example.json"
});

function pathExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function isGitIgnored(rel) {
  try {
    execFileSync("git", ["check-ignore", "-q", "--", rel], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch (err) {
    if (err.status === 1) return false;
    throw err;
  }
}

function isTracked(rel) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", rel], {
      cwd: ROOT,
      stdio: "ignore"
    });
    return true;
  } catch (err) {
    if (err.status === 1) return false;
    throw err;
  }
}

function assertRuntimeAnchor(rel) {
  const example = MUTABLE_RUNTIME_ANCHORS[rel];
  if (!example) {
    assert.ok(pathExists(rel), `anchor exists: ${rel}`);
    return;
  }

  assert.equal(isGitIgnored(rel), true, `${rel} stays ignored`);
  assert.equal(isTracked(rel), false, `${rel} stays untracked`);
  assert.equal(isTracked(example), true, `${example} stays tracked`);
  assert.ok(pathExists(example), `${example} exists`);
}

function assertRuntimeAnchors(rels) {
  for (const rel of rels) assertRuntimeAnchor(rel);
}

module.exports = {
  MUTABLE_RUNTIME_ANCHORS,
  assertRuntimeAnchor,
  assertRuntimeAnchors
};
