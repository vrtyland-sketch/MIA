"use strict";

/**
 * Phase 4 product boundary contracts — profiles, export/import, user mode stub, setup.
 */

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const profiles = require("../core/streamer-profiles");
const bundle = require("../core/settings-bundle");
const userMode = require("../core/user-mode");
const setup = require("../scripts/mia_setup");
const { registerAdminRoutes, buildDefaultAdminStatus } = require("../routes/admin");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`fail - ${name}`);
    throw err;
  }
}

test("user mode default OFF; stub flag", () => {
  delete process.env.MIA_USER_MODE;
  assert.equal(userMode.isUserModeEnabled({}), false);
  const snap = userMode.getUserModePublicSnapshot({});
  assert.equal(snap.enabled, false);
  assert.equal(snap.stub, true);
  assert.equal(snap.multiTenant, false);
  assert.equal(snap.multiTenantStatus, "deferred");

  process.env.MIA_USER_MODE = "1";
  assert.equal(userMode.isUserModeEnabled({}), true);
  delete process.env.MIA_USER_MODE;
  process.env.MIA_USER_MODE = "0";
  assert.equal(userMode.isUserModeEnabled({}), false);
  delete process.env.MIA_USER_MODE;
});

test("streamer profile save/load roundtrip in temp dir", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mia-profiles-"));
  profiles.configureStreamerProfiles({ dir: tmp });
  const saved = profiles.saveProfile("Demo Show", {
    runtime: {
      phase1: { actionQueue: { enabled: true } },
      phase2: { director: { enabled: true } },
      phase4: { userMode: { enabled: false } }
    },
    env: { MIA_DIRECTOR: "1", MIA_TTS_EDGE_VOICE: "cs-CZ-VlastaNeural" }
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.name, "demo-show");
  assert.ok(fs.existsSync(path.join(tmp, "demo-show.json")));

  const listed = profiles.listProfiles();
  assert.equal(listed.profiles.length, 1);

  const loaded = profiles.loadProfile("demo-show", { applyRuntime: false });
  assert.equal(loaded.ok, true);
  assert.equal(loaded.name, "demo-show");
  assert.equal(loaded.flagHints.MIA_DIRECTOR, "1");
  assert.ok(loaded.voiceHints.edgeVoice);

  const bad = profiles.saveProfile("../../etc");
  assert.equal(bad.ok, false);
});

test("settings bundle export/import validates kind", () => {
  const built = bundle.buildSettingsBundle({
    includeViewerMemory: false,
    runtime: {
      phase2: { director: { enabled: true } },
      phase4: { multiTenant: { status: "deferred" } }
    },
    env: { MIA_ACTION_QUEUE: "0" }
  });
  assert.equal(built.ok, true);
  assert.equal(built.bundle.kind, "mia-settings-bundle");
  assert.equal(built.bundle.viewerMemoryExcluded, true);
  assert.equal(built.bundle.viewerMemory, null);
  assert.ok(!JSON.stringify(built.bundle).includes("OPENAI_API_KEY"));

  const bad = bundle.validateBundle({ kind: "other" });
  assert.equal(bad.ok, false);

  const imported = bundle.importSettingsBundle(built.bundle, {
    applyRuntime: false,
    includeViewerMemory: false
  });
  assert.equal(imported.ok, true);
  assert.equal(imported.restartRecommended, true);
});

test("setup script checks node and data dirs helpers", () => {
  const node = setup.checkNode();
  assert.equal(node.ok, true);
  assert.ok(node.major >= 18);
  assert.ok(Array.isArray(setup.DATA_DIRS));
  assert.ok(setup.DATA_DIRS.includes("data/streamer-profiles"));
});

test("admin routes expose profiles + export/import; status phase 4", () => {
  const routes = { get: [], post: [] };
  const app = {
    get(p) {
      routes.get.push(p);
    },
    post(p) {
      routes.post.push(p);
    }
  };
  const result = registerAdminRoutes(app, {
    localAdminGuard: (_req, _res, next) => next && next()
  });
  assert.equal(result.ok, true);
  assert.ok(routes.get.includes("/api/mia-admin/profiles"));
  assert.ok(routes.get.includes("/api/mia-admin/export"));
  assert.ok(routes.post.includes("/api/mia-admin/profiles"));
  assert.ok(routes.post.includes("/api/mia-admin/profiles/load"));
  assert.ok(routes.post.includes("/api/mia-admin/import"));

  const status = buildDefaultAdminStatus({});
  assert.equal(status.phase, 4);
  assert.ok(status.profiles);
  assert.ok(status.userMode);
  assert.equal(status.userMode.multiTenant, false);
  assert.ok(status.links.export);
});

test("docs + installer + admin html exist", () => {
  const root = path.join(__dirname, "..");
  assert.ok(fs.existsSync(path.join(root, "docs", "MIA_INSTALLER.md")));
  assert.ok(fs.existsSync(path.join(root, "docs", "MIA_PHASE4_PROGRESS.md")));
  assert.ok(fs.existsSync(path.join(root, "docs", "MIA_PHASES_1_TO_4_CHANGELOG.md")));
  const html = fs.readFileSync(
    path.join(root, "mia-output-overlay", "mia-admin.html"),
    "utf8"
  );
  assert.ok(html.includes("profile-save"));
  assert.ok(html.includes("/api/mia-admin/export"));
  assert.ok(html.includes("Phase 4"));
});

console.log("phase4_product_boundary_contract: all passed");
