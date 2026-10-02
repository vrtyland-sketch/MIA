"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const security = require("../scripts/MIA_RUNTIME_SECURITY");

const ROOT = path.resolve(__dirname, "..");

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

console.log("\n---- SPRINT A SECURITY CONTRACT ----\n");

test("default bind host is localhost", () => {
  const prev = process.env.MIA_BIND_HOST;
  delete process.env.MIA_BIND_HOST;
  assert.equal(security.resolveBindHost(), "127.0.0.1");
  process.env.MIA_BIND_HOST = prev;
});

test("ingest rejects non-local without secret", () => {
  const prev = process.env.MIA_INGEST_SECRET;
  delete process.env.MIA_INGEST_SECRET;
  const auth = security.validateIngestAuth({
    ip: "192.168.1.50",
    headers: {},
    query: {}
  });
  assert.equal(auth.ok, false);
  assert.equal(auth.error, "ingest_localhost_only");
  process.env.MIA_INGEST_SECRET = prev;
});

test("ingest accepts localhost without secret", () => {
  const prev = process.env.MIA_INGEST_SECRET;
  delete process.env.MIA_INGEST_SECRET;
  const auth = security.validateIngestAuth({
    ip: "127.0.0.1",
    headers: {},
    query: {}
  });
  assert.equal(auth.ok, true);
  process.env.MIA_INGEST_SECRET = prev;
});

test("ingest accepts matching secret from header", () => {
  process.env.MIA_INGEST_SECRET = "test-secret-123";
  const auth = security.validateIngestAuth({
    ip: "10.0.0.8",
    headers: { "x-mia-ingest-secret": "test-secret-123" },
    query: {}
  });
  assert.equal(auth.ok, true);
  delete process.env.MIA_INGEST_SECRET;
});

test("ingest accepts localhost even when secret is configured", () => {
  process.env.MIA_INGEST_SECRET = "test-secret-123";
  delete process.env.MIA_INGEST_LOCALHOST_OPEN;
  const auth = security.validateIngestAuth({
    ip: "127.0.0.1",
    headers: {},
    query: {}
  });
  assert.equal(auth.ok, true);
  assert.equal(auth.mode, "localhost");
  delete process.env.MIA_INGEST_SECRET;
});

test("ingest rejects remote without secret when secret configured", () => {
  process.env.MIA_INGEST_SECRET = "test-secret-123";
  const auth = security.validateIngestAuth({
    ip: "10.0.0.8",
    headers: {},
    query: {}
  });
  assert.equal(auth.ok, false);
  assert.equal(auth.error, "unauthorized_ingest");
  delete process.env.MIA_INGEST_SECRET;
});

test("debug routes disabled blocks remote clients", () => {
  process.env.MIA_DEBUG_ROUTES = "off";
  assert.equal(
    security.isDebugRouteAllowed({ ip: "192.168.0.22", headers: {}, query: {} }),
    false
  );
  assert.equal(
    security.isDebugRouteAllowed({ ip: "127.0.0.1", headers: {}, query: {} }),
    true
  );
  delete process.env.MIA_DEBUG_ROUTES;
});

test("local admin guard allows localhost for media mutators", () => {
  const auth = security.validateLocalAdmin({
    ip: "127.0.0.1",
    headers: {},
    query: {}
  });
  assert.equal(auth.ok, true);
});

test("forwarded header cannot impersonate localhost", () => {
  const prev = process.env.MIA_INGEST_SECRET;
  delete process.env.MIA_INGEST_SECRET;
  const auth = security.validateIngestAuth({
    ip: "127.0.0.1",
    socket: { remoteAddress: "203.0.113.8" },
    headers: { "x-forwarded-for": "127.0.0.1" },
    query: {}
  });
  assert.equal(auth.ok, false);
  assert.equal(auth.error, "ingest_localhost_only");
  const admin = security.validateLocalAdmin({
    ip: "127.0.0.1",
    socket: { remoteAddress: "203.0.113.8" },
    headers: { "x-forwarded-for": "127.0.0.1, 10.0.0.2" },
    query: {}
  });
  assert.equal(admin.ok, false);
  assert.equal(admin.error, "local_admin_only");
  if (prev === undefined) delete process.env.MIA_INGEST_SECRET;
  else process.env.MIA_INGEST_SECRET = prev;
});

test("local socket stays local when the forwarded header names another client", () => {
  const auth = security.validateLocalAdmin({
    ip: "203.0.113.8",
    socket: { remoteAddress: "::ffff:127.0.0.1" },
    headers: { "x-forwarded-for": "203.0.113.8" },
    query: {}
  });
  assert.equal(auth.ok, true);
  assert.equal(auth.mode, "localhost");
});

test("debug routes enabled still reject a remote client without a secret", () => {
  const prevRoutes = process.env.MIA_DEBUG_ROUTES;
  const prevSecret = process.env.MIA_INGEST_SECRET;
  delete process.env.MIA_DEBUG_ROUTES;
  delete process.env.MIA_INGEST_SECRET;
  assert.equal(security.isDebugRoutesEnabled(), true);
  assert.equal(
    security.isDebugRouteAllowed({ ip: "192.168.0.22", headers: {}, query: {} }),
    false
  );
  assert.equal(
    security.isDebugRouteAllowed({
      ip: "192.168.0.22",
      socket: { remoteAddress: "192.168.0.22" },
      headers: { "x-forwarded-for": "127.0.0.1" },
      query: {}
    }),
    false
  );
  assert.equal(
    security.isDebugRouteAllowed({ ip: "127.0.0.1", headers: {}, query: {} }),
    true
  );
  if (prevRoutes === undefined) delete process.env.MIA_DEBUG_ROUTES;
  else process.env.MIA_DEBUG_ROUTES = prevRoutes;
  if (prevSecret === undefined) delete process.env.MIA_INGEST_SECRET;
  else process.env.MIA_INGEST_SECRET = prevSecret;
});

test("debug routes accept a remote client that presents the ingest secret", () => {
  const prevRoutes = process.env.MIA_DEBUG_ROUTES;
  process.env.MIA_DEBUG_ROUTES = "on";
  process.env.MIA_INGEST_SECRET = "test-secret-123";
  assert.equal(
    security.isDebugRouteAllowed({
      ip: "192.168.0.22",
      headers: { "x-mia-ingest-secret": "test-secret-123" },
      query: {}
    }),
    true
  );
  delete process.env.MIA_INGEST_SECRET;
  if (prevRoutes === undefined) delete process.env.MIA_DEBUG_ROUTES;
  else process.env.MIA_DEBUG_ROUTES = prevRoutes;
});

test("remaining control routes require localhost or ingest secret", () => {
  const checks = [
    ["routes/obs.js", 'app.get("/obs/fix-overlays", localAdminGuard'],
    ["routes/obs.js", 'app.get("/obs/reconnect", localAdminGuard'],
    ["routes/obs.js", 'app.post("/obs/prep-stream", localAdminGuard'],
    ["routes/obs.js", 'app.post("/obs/revive-voice", localAdminGuard'],
    ["routes/voice.js", 'app.post("/voice/command", localAdminGuard'],
    ["routes/debug.js", 'app.get("/gift-visual/test", debugRouteGuard'],
    ["routes/overlay.js", 'app.get("/overlay/clear", adminGuard'],
    ["routes/overlay.js", 'app.get("/overlay/test", adminGuard'],
    ["routes/system.js", 'app.post("/streamer/identity/reset", localAdminGuard'],
    ["routes/solo_stream.js", 'app.post("/solo-stream/exit", localAdminGuard'],
    ["routes/video.js", 'app.get("/video/test", localAdminGuard'],
    ["routes/video.js", 'app.get("/gift/voice-test", localAdminGuard'],
    ["routes/arena.js", 'app.get("/duel/export", duelSyncGuard'],
    ["routes/arena.js", 'app.post("/duel/opponent-sync", duelSyncGuard'],
    ["routes/koj.js", 'app.post("/koj/test-mode", localAdminGuard'],
    ["routes/tts.js", 'app.get("/tts/test", localAdminGuard'],
    ["routes/tts.js", 'app.get("/tts/compare", localAdminGuard'],
    ["routes/overlay.js", 'app.get("/ping-overlay", adminGuard'],
    ["routes/eyes.js", 'app.get("/mia/display/self-check", localAdminGuard'],
    ["routes/arena.js", 'app.post("/duel/opponent-points", localAdminGuard'],
    ["routes/eyes.js", 'app.get("/mia/eyes/scan", localAdminGuard'],
    ["routes/eyes.js", 'app.get("/mia/eyes/away", localAdminGuard'],
    ["routes/eyes.js", 'app.post("/mia/vision/tick", localAdminGuard']
  ];
  for (const [rel, needle] of checks) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.ok(src.includes(needle), needle);
  }
  const overlay = fs.readFileSync(path.join(ROOT, "routes/overlay.js"), "utf8");
  assert.match(overlay, /app\.get\("\/overlay-state", \(req, res\)/);
  assert.match(overlay, /app\.post\("\/overlay\/layout", adminGuard, saveOverlayLayout\)/);
  assert.match(overlay, /app\.post\("\/overlay\/layout\/reset", adminGuard, resetOverlayLayout\)/);
  assert.match(overlay, /app\.post\("\/api\/rig-anchors", adminGuard, saveRigAnchors\)/);
  assert.match(overlay, /const adminGuard = requireLocalAdminGuard\(localAdminGuard\)/);
  assert.doesNotMatch(overlay, /app\.post\("\/overlay\/layout", saveOverlayLayout\)/);
  assert.doesNotMatch(overlay, /app\.post\("\/api\/rig-anchors", saveRigAnchors\)/);
});
