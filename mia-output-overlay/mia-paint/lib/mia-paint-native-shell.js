/**
 * MIA Paint — shared native shell bridge (Edge shell + Tauri 2).
 * Pressure curve for Windows Ink / stylus via Pointer Events.
 */
(function (global) {
  "use strict";

  function readPressure(e) {
    if (!e) return 1;
    if (e.pointerType === "pen") {
      if (e.pressure > 0 && e.pressure < 1) return e.pressure;
      if (e.pressure >= 1) return 0.9;
      return 0.45;
    }
    if (e.pointerType === "mouse") return 1;
    return e.pressure > 0 ? e.pressure : 0.5;
  }

  function bytesToBase64(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function postToFrame(frame, origin, type, payload) {
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      { source: "mia-paint-native", type, payload: payload || {} },
      origin
    );
  }

  /**
   * @param {object} opts
   * @param {HTMLIFrameElement} opts.frame
   * @param {string} opts.origin
   * @param {object} opts.capabilities
   * @param {object} [opts.invoke] — async (cmd, args) => result (Tauri)
   */
  function attachShellHost(opts) {
    const frame = opts.frame;
    const origin = opts.origin || "http://127.0.0.1:3000";
    const invoke = typeof opts.invoke === "function" ? opts.invoke : null;
    const capabilities = opts.capabilities || {
      filesystem: true,
      windowsInk: /Win/i.test(navigator.platform || ""),
      offline: true,
      saveDialog: !!invoke,
      openDialog: !!invoke,
      tauriNative: !!invoke
    };

    const host = {
      runtime: invoke ? "mia-paint-tauri" : "mia-paint-shell",
      shell: true,
      tauri: !!invoke,
      platform: navigator.platform || "unknown",
      capabilities,
      readPressure,
      postMessage(type, payload) {
        postToFrame(frame, origin, type, payload);
      }
    };

    async function handleEditorMessage(e) {
      if (!e.data || e.data.source !== "mia-paint-editor") return;
      const type = e.data.type;

      if (type === "ready") {
        postToFrame(frame, origin, "capabilities", capabilities);
        if (invoke) {
          try {
            const tablet = await invoke("tablet_info");
            postToFrame(frame, origin, "tablet-info", tablet || {});
          } catch (_err) {
            /* ignore */
          }
        }
        return;
      }

      if (!invoke) return;

      if (type === "native-open") {
        try {
          const path = await invoke("pick_open_file");
          if (!path) {
            postToFrame(frame, origin, "native-open-result", { ok: false, cancelled: true });
            return;
          }
          const bytesBase64 = await invoke("read_file_bytes", { path });
          postToFrame(frame, origin, "native-open-result", { ok: true, path, bytesBase64 });
        } catch (err) {
          postToFrame(frame, origin, "native-open-result", {
            ok: false,
            error: String(err?.message || err)
          });
        }
        return;
      }

      if (type === "native-save") {
        const payload = e.data.payload || {};
        try {
          const path = await invoke("pick_save_file", {
            defaultName: payload.defaultName || "projekt.miapaint"
          });
          if (!path) {
            postToFrame(frame, origin, "native-save-result", { ok: false, cancelled: true });
            return;
          }
          await invoke("write_file_bytes", {
            path,
            bytesBase64: payload.bytesBase64 || ""
          });
          postToFrame(frame, origin, "native-save-result", { ok: true, path });
        } catch (err) {
          postToFrame(frame, origin, "native-save-result", {
            ok: false,
            error: String(err?.message || err)
          });
        }
      }
    }

    window.addEventListener("message", handleEditorMessage);

    return host;
  }

  global.MIA_PAINT_SHELL_BRIDGE = {
    readPressure,
    bytesToBase64,
    base64ToBytes,
    attachShellHost
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
