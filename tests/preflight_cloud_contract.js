"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  CLOUD_ENV_PREREQUISITES,
  resolvePreflightProfile,
  listMissingPrerequisites,
  classifyCloudSuite,
  publishSuiteResult,
  summarizeCloudResults
} = require("../scripts/run_preflight_tests");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
}

function probe(present) {
  const have = new Set(present || []);
  return {
    exists(relPath) {
      return have.has(relPath);
    },
    roseClipPresent() {
      return have.has("mia-output-overlay/assets/animation-bank/gift/rose");
    }
  };
}

function graphicsOutput(failedFiles) {
  return JSON.stringify({
    ok: failedFiles.length === 0,
    results: failedFiles.map((row) => ({
      file: row.file,
      ok: false,
      stderr: row.stderr
    }))
  });
}

const ROSE = "mia-output-overlay/assets/animation-bank/gift/rose";
const ROSE_STDERR =
  "fail - pushBankClipPreview returns unified bodyMood\nAssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\nfalse !== true\n";

test("strict profile ignores a cloud env switch", () => {
  const previous = process.env.MIA_PREFLIGHT_PROFILE;
  process.env.MIA_PREFLIGHT_PROFILE = "cloud";
  try {
    assert.equal(resolvePreflightProfile(["node", "scripts/run_preflight_tests.js", "--full"]), "strict");
    assert.equal(
      resolvePreflightProfile(["node", "scripts/run_preflight_tests.js", "--full", "--cloud"]),
      "cloud"
    );
  } finally {
    if (previous === undefined) delete process.env.MIA_PREFLIGHT_PROFILE;
    else process.env.MIA_PREFLIGHT_PROFILE = previous;
  }
});

test("documented cloud prerequisites are only the known local files", () => {
  const suites = [...new Set(CLOUD_ENV_PREREQUISITES.map((row) => row.suite))].sort();
  assert.deepEqual(suites, ["graphics_body", "master_canon_0001", "media_catalog", "story_animation"]);
  const paths = CLOUD_ENV_PREREQUISITES.map((row) => row.path).sort();
  assert.deepEqual(paths, [
    ".cursor/rules/mia-canon.mdc",
    "incoming-images/videos",
    "incoming-images/videos_2",
    "mia-output-overlay/assets/animation-bank/gift/rose",
    "mia-output-overlay/assets/kojnozrout/story-bank-manifest.json"
  ]);
});

test("missing prerequisite plus its own assertion is ENV_BLOCKED", () => {
  const absent = probe([]);
  const cases = [
    {
      name: "media_catalog",
      output: 'assert.ok(prefixes.includes("videos"))'
    },
    {
      name: "story_animation",
      output: "AssertionError [ERR_ASSERTION]: story bank manifest exists"
    },
    {
      name: "master_canon_0001",
      output: "ENOENT: no such file or directory, open '/workspace/.cursor/rules/mia-canon.mdc'"
    },
    {
      name: "graphics_body",
      output: graphicsOutput([
        {
          file: "mia_graphics_studio_13b_unified_preview_contract.js",
          stderr: ROSE_STDERR
        }
      ])
    }
  ];

  for (const row of cases) {
    const missing = listMissingPrerequisites(row.name, absent);
    assert.ok(missing.length > 0, row.name);
    const classified = classifyCloudSuite({
      name: row.name,
      exitCode: 1,
      output: row.output,
      missing
    });
    assert.equal(classified.disposition, "ENV_BLOCKED", row.name);
    assert.deepEqual(classified.missing, missing);
  }
});

test("a different assertion stays FAIL while the prerequisite is missing", () => {
  const absent = probe([]);
  const cases = [
    {
      name: "media_catalog",
      output: "assert.strictEqual(photo.category, \"profile_photo\")"
    },
    {
      name: "story_animation",
      output: "AssertionError: composed.frames.length"
    },
    {
      name: "master_canon_0001",
      output: "constitution contains ## 1. Účel dokumentu"
    },
    {
      name: "graphics_body",
      output: graphicsOutput([
        {
          file: "mia_graphics_studio_13b_unified_preview_contract.js",
          stderr: ROSE_STDERR
        },
        {
          file: "mia_graphics_studio_14b_mood_brain_contract.js",
          stderr: "fail - mood brain"
        }
      ])
    },
    {
      name: "graphics_body",
      output: graphicsOutput([
        {
          file: "mia_graphics_studio_13b_unified_preview_contract.js",
          stderr: "The expression evaluated to a falsy value:\n\n  assert.ok(result.bodyMood)\n"
        }
      ])
    }
  ];

  for (const row of cases) {
    const missing = listMissingPrerequisites(row.name, absent);
    const classified = classifyCloudSuite({
      name: row.name,
      exitCode: 1,
      output: row.output,
      missing
    });
    assert.equal(classified.disposition, "FAIL", `${row.name} ${row.output.slice(0, 40)}`);
  }
});

test("failure with the prerequisite present is FAIL", () => {
  const present = probe(CLOUD_ENV_PREREQUISITES.map((row) => row.path));
  const missing = listMissingPrerequisites("media_catalog", present);
  assert.deepEqual(missing, []);
  const classified = classifyCloudSuite({
    name: "media_catalog",
    exitCode: 1,
    output: 'assert.ok(prefixes.includes("videos"))',
    missing
  });
  assert.equal(classified.disposition, "FAIL");
});

test("passing suite is PASS even if a prerequisite path is absent", () => {
  const classified = classifyCloudSuite({
    name: "media_catalog",
    exitCode: 0,
    output: "media_catalog_contract: OK",
    missing: ["incoming-images/videos"]
  });
  assert.equal(classified.disposition, "PASS");
  assert.deepEqual(classified.missing, []);
});

test("strict publish does not relabel a non-zero suite", () => {
  const published = publishSuiteResult(
    {
      name: "media_catalog",
      ok: false,
      exitCode: 1,
      ms: 1,
      output: 'assert.ok(prefixes.includes("videos"))',
      fullOutput: 'assert.ok(prefixes.includes("videos"))'
    },
    "strict",
    probe([])
  );
  assert.equal(published.ok, false);
  assert.equal(published.disposition, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(published, "fullOutput"), false);
});

test("cloud summary exits clean only when every real failure is absent", () => {
  const blocked = summarizeCloudResults([
    { disposition: "PASS" },
    {
      disposition: "ENV_BLOCKED",
      name: "story_animation",
      missing: ["mia-output-overlay/assets/kojnozrout/story-bank-manifest.json"]
    }
  ]);
  assert.equal(blocked.ok, true);
  assert.equal(blocked.passed, 1);
  assert.equal(blocked.failed, 0);
  assert.equal(blocked.envBlocked, 1);
  assert.equal(blocked.blocked[0].name, "story_animation");

  const realFail = summarizeCloudResults([
    { disposition: "PASS" },
    { disposition: "ENV_BLOCKED", name: "media_catalog", missing: ["incoming-images/videos"] },
    { disposition: "FAIL", name: "event_pipeline", missing: [] }
  ]);
  assert.equal(realFail.ok, false);
  assert.equal(realFail.failed, 1);
  assert.equal(realFail.envBlocked, 1);
});

test("videos_2 failure is blocked only when that directory is the one missing", () => {
  const onlyVideosMissing = classifyCloudSuite({
    name: "media_catalog",
    exitCode: 1,
    output: "expected videos_2 files in catalog",
    missing: ["incoming-images/videos"]
  });
  assert.equal(onlyVideosMissing.disposition, "FAIL");

  const videos2Missing = classifyCloudSuite({
    name: "media_catalog",
    exitCode: 1,
    output: "expected videos_2 files in catalog",
    missing: ["incoming-images/videos_2"]
  });
  assert.equal(videos2Missing.disposition, "ENV_BLOCKED");
  assert.deepEqual(videos2Missing.missing, ["incoming-images/videos_2"]);
});

test("this checkout reports real missing prerequisites and does not create them", () => {
  const before = CLOUD_ENV_PREREQUISITES.map((row) => ({
    path: row.path,
    existed: fs.existsSync(path.join(ROOT, row.path))
  }));
  for (const relPath of CLOUD_ENV_PREREQUISITES.map((row) => row.path)) {
    const abs = path.join(ROOT, relPath);
    const missing = listMissingPrerequisites(
      CLOUD_ENV_PREREQUISITES.find((row) => row.path === relPath).suite
    );
    if (relPath === ROSE) {
      const bankRoot = path.join(ROOT, "mia-output-overlay", "assets", "animation-bank");
      const { getClipEntry, loadBankIndex } = require("../shared/mia-animation-engine/AnimationBank");
      const present = Boolean(getClipEntry(loadBankIndex(bankRoot), "gift/rose"));
      assert.equal(missing.includes(ROSE), !present);
    } else {
      assert.equal(missing.includes(relPath), !fs.existsSync(abs));
    }
  }
  for (const row of before) {
    assert.equal(fs.existsSync(path.join(ROOT, row.path)), row.existed);
  }
});

if (!process.exitCode) {
  console.log("preflight_cloud_contract: all passed");
}
