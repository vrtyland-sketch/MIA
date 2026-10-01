"use strict";
const OBSWebSocket = require("obs-websocket-js").default;
(async () => {
  const o = new OBSWebSocket();
  await o.connect("ws://127.0.0.1:4455", "B4bCkPRomsqrsFKb");
  const s = await o.call("GetStreamStatus");
  const svc = await o.call("GetStreamServiceSettings");
  const st = svc.streamServiceSettings || {};
  const key = String(st.key || "");
  const ver = await o.call("GetVersion");
  console.log(
    JSON.stringify({
      obsWs: true,
      obsVersion: ver.obsVersion,
      outputActive: s.outputActive,
      outputDuration: s.outputDuration,
      outputBytes: s.outputBytes,
      service: st.service || null,
      server: st.server || null,
      keyLen: key.length,
      keyLooksNormal: /^[A-Za-z0-9_-]{16,40}$/.test(key),
      broadcast_id: st.broadcast_id || null
    })
  );
  await o.disconnect();
})().catch((e) => {
  console.log(JSON.stringify({ obsWs: false, error: e.message }));
  process.exit(1);
});
