"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const {
  buildRuntimeConfig,
  isKickBridgeEnabledFromEnv
} = require("../scripts/MIA_CONFIG");

const ROOT = path.resolve(__dirname, "..");

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => console.log(`ok - ${name}`))
    .catch((err) => {
      console.error(`fail - ${name}`);
      throw err;
    });
}

const KICK_ENV_MATRIX = [
  { env: "MIA_KICK_ENABLED", value: "0", path: "kick.enabled", expected: false },
  { env: "MIA_KICK_ENABLED", value: "1", path: "kick.enabled", expected: true },
  { env: "KICK_ENABLED", value: "false", path: "kick.enabled", expected: false },
  { env: "MIA_KICK_MODE", value: "webhook", path: "kick.mode", expected: "webhook" },
  { env: "KICK_CHANNEL", value: "vasaspinak", path: "kick.channel", expected: "vasaspinak" },
  {
    env: "MIA_KICK_CHATROOM_ID",
    value: "999888",
    path: "kick.chatroomId",
    expected: "999888"
  },
  {
    env: "MIA_KICK_PUSHER_KEY",
    value: "test-pusher-key",
    path: "kick.pusherKey",
    expected: "test-pusher-key"
  },
  { env: "MIA_KICK_CLUSTER", value: "eu", path: "kick.cluster", expected: "eu" },
  {
    env: "MIA_KICK_WEBHOOK_PATH",
    value: "/kick/custom",
    path: "kick.webhookPath",
    expected: "/kick/custom"
  },
  {
    env: "MIA_KICK_INGEST_URL",
    value: "http://127.0.0.1:4000/ingest",
    path: "kick.ingestUrl",
    expected: "http://127.0.0.1:4000/ingest"
  }
];

const TELEGRAM_ENV_MATRIX = [
  { env: "MIA_TELEGRAM_ENABLED", value: "1", path: "telegram.enabled", expected: true },
  {
    env: "MIA_TELEGRAM_BOT_TOKEN",
    value: "123:ABC",
    path: "telegram.botToken",
    expected: "123:ABC"
  },
  {
    env: "MIA_TELEGRAM_ALLOWED_USER_IDS",
    value: "42,99",
    path: "telegram.allowedUserIds",
    expected: "42,99"
  },
  {
    env: "MIA_TELEGRAM_STREAMER_ONLY",
    value: "0",
    path: "telegram.streamerOnly",
    expected: false
  }
];

function readConfigPath(config, dottedPath) {
  return dottedPath.split(".").reduce((node, key) => node?.[key], config);
}

async function run() {
  await test(".env.example documents Kick keys that MIA_CONFIG reads", () => {
    const example = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
    for (const row of KICK_ENV_MATRIX) {
      assert.match(
        example,
        new RegExp(row.env.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        `missing ${row.env} in .env.example`
      );
    }
  });

  await test("Kick env keys map to runtimeConfig.kick", () => {
    for (const row of KICK_ENV_MATRIX) {
      const config = buildRuntimeConfig({ [row.env]: row.value });
      assert.equal(
        readConfigPath(config, row.path),
        row.expected,
        `${row.env} should set ${row.path}`
      );
    }
  });

  await test("Telegram env keys map to runtimeConfig.telegram", () => {
    for (const row of TELEGRAM_ENV_MATRIX) {
      const config = buildRuntimeConfig({ [row.env]: row.value });
      assert.equal(
        readConfigPath(config, row.path),
        row.expected,
        `${row.env} should set ${row.path}`
      );
    }
  });

  await test("isKickBridgeEnabledFromEnv defaults ON and respects MIA_KICK_ENABLED", () => {
    assert.equal(isKickBridgeEnabledFromEnv({}), true);
    assert.equal(isKickBridgeEnabledFromEnv({ MIA_KICK_ENABLED: "0" }), false);
    assert.equal(isKickBridgeEnabledFromEnv({ KICK_ENABLED: "false" }), false);
    assert.equal(
      isKickBridgeEnabledFromEnv({ MIA_KICK_BRIDGE_ENABLED: "1" }),
      true
    );
  });

  await test("OBS layout scripts use isKickBridgeEnabledFromEnv (not stale MIA_KICK_BRIDGE_ENABLED-only gate)", () => {
    for (const rel of [
      "scripts/obs_set_canvas.js",
      "scripts/obs_fix_overlay_layout.js",
      "scripts/MIA_VIDEO_ENGINE.js"
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.match(src, /isKickBridgeEnabledFromEnv/);
      assert.doesNotMatch(
        src,
        /MIA_KICK_BRIDGE_ENABLED \|\| ""\)\.toLowerCase\(\) === "1"/
      );
    }
  });

  console.log("env_wiring_contract: all passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
