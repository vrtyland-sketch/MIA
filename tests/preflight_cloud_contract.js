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
  assert.deepEqual(suites, [
    "graphics_body",
    "koj_live_assets",
    "master_canon_0001",
    "media_catalog",
    "story_animation"
  ]);
  const paths = CLOUD_ENV_PREREQUISITES.map((row) => row.path).sort();
  assert.deepEqual(paths, [
    ".cursor/rules/mia-canon.mdc",
    "incoming-images/videos",
    "incoming-images/videos_2",
    "mia-output-overlay/assets/animation-bank/gift/rose",
    "mia-output-overlay/assets/kojnozrout/moods",
    "mia-output-overlay/assets/kojnozrout/pose-catalog.js",
    "mia-output-overlay/assets/kojnozrout/props/ball.png",
    "mia-output-overlay/assets/kojnozrout/props/bowl.png",
    "mia-output-overlay/assets/kojnozrout/props/hand.png",
    "mia-output-overlay/assets/kojnozrout/props/mic.png",
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
    },
    {
      name: "koj_live_assets",
      output: [
        "KOJ_LIVE_ASSET_MISSING:",
        "mia-output-overlay/assets/kojnozrout/moods",
        "mia-output-overlay/assets/kojnozrout/pose-catalog.js",
        "mia-output-overlay/assets/kojnozrout/props/bowl.png",
        "mia-output-overlay/assets/kojnozrout/props/ball.png",
        "mia-output-overlay/assets/kojnozrout/props/mic.png",
        "mia-output-overlay/assets/kojnozrout/props/hand.png"
      ].join(" ")
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
    },
    {
      name: "koj_live_assets",
      output: "dangling catalog reference: walk-a"
    },
    {
      name: "koj_live_assets",
      output: "malformed pose catalog"
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

test("pure ENV_BLOCKED, pure assertion FAIL, mixed output, and PASS stay distinct", () => {
  const absent = probe([]);

  const pureBlocked = classifyCloudSuite({
    name: "story_animation",
    exitCode: 1,
    output: "AssertionError [ERR_ASSERTION]: story bank manifest exists",
    missing: listMissingPrerequisites("story_animation", absent)
  });
  assert.equal(pureBlocked.disposition, "ENV_BLOCKED");

  const pureFail = classifyCloudSuite({
    name: "story_animation",
    exitCode: 1,
    output: "AssertionError: composed.frames.length",
    missing: listMissingPrerequisites("story_animation", absent)
  });
  assert.equal(pureFail.disposition, "FAIL");

  const mixed = classifyCloudSuite({
    name: "story_animation",
    exitCode: 1,
    output: [
      "AssertionError [ERR_ASSERTION]: story bank manifest exists",
      "AssertionError: composed.frames.length"
    ].join("\n"),
    missing: listMissingPrerequisites("story_animation", absent)
  });
  assert.equal(mixed.disposition, "FAIL");

  const passed = classifyCloudSuite({
    name: "story_animation",
    exitCode: 0,
    output: [
      "AssertionError [ERR_ASSERTION]: story bank manifest exists",
      "AssertionError: composed.frames.length"
    ].join("\n"),
    missing: listMissingPrerequisites("story_animation", absent)
  });
  assert.equal(passed.disposition, "PASS");
  assert.deepEqual(passed.missing, []);
});

test("a missing-asset line does not hide another assertion in the same output", () => {
  const absent = probe([]);

  const media = classifyCloudSuite({
    name: "media_catalog",
    exitCode: 1,
    output: [
      'assert.ok(prefixes.includes("videos"))',
      'assert.strictEqual(photo.category, "profile_photo")'
    ].join("\n"),
    missing: listMissingPrerequisites("media_catalog", absent)
  });
  assert.equal(media.disposition, "FAIL");

  const canon = classifyCloudSuite({
    name: "master_canon_0001",
    exitCode: 1,
    output: [
      "ENOENT: no such file or directory, open '/workspace/.cursor/rules/mia-canon.mdc'",
      "constitution contains ## 1. Účel dokumentu"
    ].join("\n"),
    missing: listMissingPrerequisites("master_canon_0001", absent)
  });
  assert.equal(canon.disposition, "FAIL");

  const graphics = classifyCloudSuite({
    name: "graphics_body",
    exitCode: 1,
    output: `${graphicsOutput([
      {
        file: "mia_graphics_studio_13b_unified_preview_contract.js",
        stderr: ROSE_STDERR
      }
    ])}\nfail - mood brain`,
    missing: listMissingPrerequisites("graphics_body", absent)
  });
  assert.equal(graphics.disposition, "FAIL");
});

test("live missing-asset stacks stay ENV_BLOCKED", () => {
  const absent = probe([]);
  const cases = [
    {
      name: "media_catalog",
      output: [
        "node:internal/assert/utils:281",
        "    throw err;",
        "    ^",
        "",
        "AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:",
        "",
        '  assert.ok(prefixes.includes("videos"))',
        "",
        "    at testVideos2ScanDirs (/workspace/tests/media_catalog_contract.js:61:10)",
        "    at main (/workspace/tests/media_catalog_contract.js:249:3) {",
        "  generatedMessage: true,",
        "  code: 'ERR_ASSERTION',",
        "  actual: false,",
        "  expected: true,",
        "  operator: '=='",
        "}",
        "",
        "Node.js v22.14.0"
      ].join("\n")
    },
    {
      name: "story_animation",
      output: [
        "❌ story animation contract failed: AssertionError [ERR_ASSERTION]: story bank manifest exists",
        "    at run (/workspace/tests/story_animation_contract.js:80:10)",
        "    at process.processTicksAndRejections (node:internal/process/task_queues:105:5) {",
        "  generatedMessage: false,",
        "  code: 'ERR_ASSERTION',",
        "  actual: false,",
        "  expected: true,",
        "  operator: '=='",
        "}"
      ].join("\n")
    },
    {
      name: "master_canon_0001",
      output: [
        "✅ master canon files on disk",
        "✅ constitution structure (8 sections, v1.0)",
        "✅ alignment audit covers all sections",
        "✅ master canon index",
        "node:fs:442",
        "    return binding.readFileUtf8(path, stringToFlags(options.flag));",
        "                   ^",
        "",
        "Error: ENOENT: no such file or directory, open '/workspace/.cursor/rules/mia-canon.mdc'",
        "    at Object.readFileSync (node:fs:442:20)",
        "    at read (/workspace/tests/mia_master_canon_0001_contract.js:11:13) {",
        "  errno: -2,",
        "  code: 'ENOENT',",
        "  syscall: 'open',",
        "  path: '/workspace/.cursor/rules/mia-canon.mdc'",
        "}",
        "",
        "Node.js v22.14.0"
      ].join("\n")
    }
  ];

  for (const row of cases) {
    const classified = classifyCloudSuite({
      name: row.name,
      exitCode: 1,
      output: row.output,
      missing: listMissingPrerequisites(row.name, absent)
    });
    assert.equal(classified.disposition, "ENV_BLOCKED", row.name);
  }
});

test("node 24 assertion banners do not turn a missing-asset failure into FAIL", () => {
  const absent = probe([]);
  const banners = [
    "AssertionError [ERR_ASSERTION]: Expected inputs to be strictly deep-equal:",
    "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:",
    "AssertionError [ERR_ASSERTION]: Expected inputs to be strictly equal:"
  ];
  for (const banner of banners) {
    const classified = classifyCloudSuite({
      name: "story_animation",
      exitCode: 1,
      output: [
        banner,
        "+ actual - expected ... Lines skipped",
        "story bank manifest exists",
        "    at run (/workspace/tests/story_animation_contract.js:80:10)"
      ].join("\n"),
      missing: listMissingPrerequisites("story_animation", absent)
    });
    assert.equal(classified.disposition, "ENV_BLOCKED", banner);
  }

  const realDiff = classifyCloudSuite({
    name: "story_animation",
    exitCode: 1,
    output: [
      "AssertionError [ERR_ASSERTION]: Expected inputs to be strictly deep-equal:",
      "+ actual - expected",
      "+   frames: 0",
      "-   frames: 3",
      "composed.frames.length"
    ].join("\n"),
    missing: listMissingPrerequisites("story_animation", absent)
  });
  assert.equal(realDiff.disposition, "FAIL");
});

test("only diff simple and diff full are ignorable assertion metadata", () => {
  const storyPath = "mia-output-overlay/assets/kojnozrout/story-bank-manifest.json";
  const absent = probe([]);
  const present = probe([storyPath]);
  const missing = listMissingPrerequisites("story_animation", absent);
  const stack = [
    "AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:",
    "+ actual - expected",
    "story bank manifest exists",
    "    at run (/workspace/tests/story_animation_contract.js:80:10) {",
    "  generatedMessage: true,",
    "  code: 'ERR_ASSERTION',",
    "  actual: false,",
    "  expected: true,",
    "  operator: 'strictEqual',",
    "  diff: 'simple'",
    "}"
  ].join("\n");

  function classify(output, probeImpl) {
    return classifyCloudSuite({
      name: "story_animation",
      exitCode: 1,
      output,
      missing: listMissingPrerequisites("story_animation", probeImpl)
    });
  }

  assert.equal(classify(stack, absent).disposition, "ENV_BLOCKED");
  assert.equal(
    classify(stack.replace("diff: 'simple'", "diff: 'full',"), absent).disposition,
    "ENV_BLOCKED"
  );
  assert.equal(missing.length, 1);

  assert.equal(
    classify(
      `${stack}\nAssertionError [ERR_ASSERTION]: composed.frames.length`,
      absent
    ).disposition,
    "FAIL"
  );
  assert.equal(
    classify(stack.replace("diff: 'simple'", "diff: 'other'"), absent).disposition,
    "FAIL"
  );
  assert.equal(
    classify(stack.replace("diff: 'simple'", "diff: simple"), absent).disposition,
    "FAIL"
  );
  assert.equal(
    classify(stack.replace("diff: 'simple'", 'diff: "simple"'), absent).disposition,
    "FAIL"
  );
  assert.equal(classify(stack, present).disposition, "FAIL");

  const strict = publishSuiteResult(
    {
      name: "story_animation",
      ok: false,
      exitCode: 1,
      ms: 1,
      output: stack,
      fullOutput: stack
    },
    "strict",
    absent
  );
  assert.equal(strict.disposition, undefined);
  assert.equal(strict.ok, false);
});

if (!process.exitCode) {
  console.log("preflight_cloud_contract: all passed");
}
