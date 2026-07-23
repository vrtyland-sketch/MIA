(function () {
  "use strict";

  const port = new URLSearchParams(window.location.search).get("port") || "3000";
  const origin = "http://127.0.0.1:" + port;
  const paintUrl = origin + "/mia-paint/?shell=1&native=tauri";
  const frame = document.getElementById("paintFrame");
  const boot = document.getElementById("boot");
  const bootUrl = document.getElementById("bootUrl");

  bootUrl.textContent = origin;
  document.getElementById("retryLink").addEventListener("click", (e) => {
    e.preventDefault();
    bootMiaPaint();
  });

  async function tauriInvoke(cmd, args) {
    const tauri = window.__TAURI__;
    if (!tauri?.core?.invoke) throw new Error("tauri_unavailable");
    return tauri.core.invoke(cmd, args || {});
  }

  function showEditor() {
    boot.hidden = true;
    frame.hidden = false;
    frame.src = paintUrl;
  }

  function showBoot() {
    boot.hidden = false;
    frame.hidden = true;
  }

  async function bootMiaPaint() {
    try {
      const r = await fetch(origin + "/mia/paint/status", { cache: "no-store" });
      if (!r.ok) throw new Error("status_" + r.status);
      const data = await r.json();
      if (!data.ok) throw new Error("paint_unavailable");
      showEditor();
      if (window.MIA_PAINT_SHELL_BRIDGE?.attachShellHost) {
        window.MIA_PAINT_NATIVE = window.MIA_PAINT_SHELL_BRIDGE.attachShellHost({
          frame,
          origin,
          invoke: tauriInvoke,
          capabilities: {
            filesystem: true,
            windowsInk: /Win/i.test(navigator.platform || ""),
            offline: true,
            saveDialog: true,
            openDialog: true,
            tauriNative: true,
            pointerPressure: true
          }
        });
      }
    } catch (_err) {
      showBoot();
    }
  }

  const bridgeScript = document.createElement("script");
  bridgeScript.src = origin + "/mia-paint/lib/mia-paint-native-shell.js";
  bridgeScript.onload = () => bootMiaPaint();
  bridgeScript.onerror = () => bootMiaPaint();
  document.head.appendChild(bridgeScript);
})();
