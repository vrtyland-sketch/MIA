"use strict";

const assert = require("assert/strict");
const security = require("../scripts/MIA_RUNTIME_SECURITY");

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
