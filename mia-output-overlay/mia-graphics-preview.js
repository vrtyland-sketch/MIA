(function () {
  "use strict";

  const API =
    location.origin && location.protocol.startsWith("http") ? location.origin : "http://127.0.0.1:3000";
  const img = document.getElementById("preview");
  const badge = document.getElementById("badge");
  let lastStamp = 0;

  async function poll() {
    try {
      const resp = await fetch(`${API}/mia/graphics/preview/state`, { cache: "no-store" });
      const data = await resp.json();
      if (!data?.ok || !data.enabled) {
        img.style.display = "none";
        img.removeAttribute("src");
        badge.textContent = "MIA Graphics Preview — čekám…";
        return;
      }
      const stamp = data.updatedAt || 0;
      if (data.imageUrl) {
        const url = data.imageUrl + (stamp ? `?t=${stamp}` : "");
        if (img.src !== new URL(url, API).href) img.src = url;
      } else if (data.pngBase64) {
        img.src = `data:image/png;base64,${data.pngBase64}`;
      } else {
        img.style.display = "none";
        return;
      }
      img.style.display = "block";
      if (stamp !== lastStamp) {
        lastStamp = stamp;
        badge.textContent = `${data.name || "preview"} · ${data.mode || "document"}`;
      }
    } catch (_err) {
      badge.textContent = "MIA Graphics Preview — offline";
    }
  }

  setInterval(poll, 400);
  poll();
})();
