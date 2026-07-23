"use strict";

const fs = require("fs");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, k)) {
      process.env[k] = v;
    }
  }
}

async function main() {
  loadEnv();
  const obs = new OBSWebSocket();
  await obs.connect(
    process.env.OBS_WS_URL || "ws://127.0.0.1:4455",
    process.env.OBS_WS_PASSWORD
      ? { password: process.env.OBS_WS_PASSWORD }
      : undefined
  );

  const scene = (await obs.call("GetCurrentProgramScene")).currentProgramSceneName;
  const items = (await obs.call("GetSceneItemList", { sceneName: scene })).sceneItems;

  const interesting = items.filter((it) =>
    /OVERLAY|KOJ|MIA_|VOICE|CAMERA|BUBBLE|BOWL|CHAT|RUNTIME|STARTUP|COMBO|DUEL|GIFT|T\d_VIDEO/i.test(
      it.sourceName || ""
    )
  );

  const rows = [];
  for (const it of interesting) {
    const name = it.sourceName;
    let settings = {};
    let kind = it.inputKind || "";
    try {
      const input = await obs.call("GetInputSettings", { inputName: name });
      settings = input.inputSettings || {};
      kind = input.inputKind || kind;
    } catch (_err) {
      /* group/scene item */
    }

    const tr = it.sceneItemTransform || {};
    rows.push({
      name,
      enabled: Boolean(it.sceneItemEnabled),
      locked: Boolean(it.sceneItemLocked),
      x: Math.round(Number(tr.positionX) || 0),
      y: Math.round(Number(tr.positionY) || 0),
      w: Math.round(Number(tr.width || tr.sourceWidth) || 0),
      h: Math.round(Number(tr.height || tr.sourceHeight) || 0),
      kind,
      url: settings.url || "",
      local_file: settings.local_file || ""
    });
  }

  const disabled = rows.filter((r) => !r.enabled);
  const zeroSize = rows.filter((r) => r.enabled && (r.w < 8 || r.h < 8));
  const browsers = rows.filter((r) => /browser/i.test(r.kind));
  const badUrl = browsers.filter(
    (r) => r.url && !/127\.0\.0\.1:3000|localhost:3000/i.test(r.url)
  );
  const emptyUrl = browsers.filter((r) => !r.url);

  console.log(
    JSON.stringify(
      {
        scene,
        totalInteresting: rows.length,
        enabled: rows.filter((r) => r.enabled).length,
        disabled: disabled.map((r) => r.name),
        zeroSize: zeroSize.map((r) => `${r.name} ${r.w}x${r.h}`),
        browsers: browsers.map((r) => ({
          name: r.name,
          enabled: r.enabled,
          url: r.url,
          size: `${r.w}x${r.h}`,
          pos: `${r.x},${r.y}`
        })),
        badUrl: badUrl.map((r) => ({ name: r.name, url: r.url })),
        emptyUrl: emptyUrl.map((r) => r.name),
        keyLayers: rows.filter((r) =>
          /MIA_VOICE|KOJNOZROUT_RUNTIME|KOJNOZROUT_BOWL|MIA_BUBBLE|CHAT_OVERLAY|NOTEBOOK_CAMERA/i.test(
            r.name
          )
        )
      },
      null,
      2
    )
  );

  await obs.disconnect();
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
