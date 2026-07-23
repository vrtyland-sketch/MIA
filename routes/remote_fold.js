"use strict";

const { validateApp, safeString } = require("./_helpers");

function resolveNetworkHints() {
  let lanIp = null;
  let tailscaleIp = null;
  let tailscaleDns = null;

  try {
    const os = require("os");
    for (const list of Object.values(os.networkInterfaces())) {
      for (const net of list || []) {
        if (net.family === "IPv4" && !net.internal && String(net.address).startsWith("192.168.")) {
          lanIp = net.address;
          break;
        }
      }
      if (lanIp) break;
    }
  } catch (_e) {
    /* ignore */
  }

  try {
    const tsExe = "C:\\Program Files\\Tailscale\\tailscale.exe";
    const { execSync } = require("child_process");
    const fs = require("fs");
    if (fs.existsSync(tsExe)) {
      const out = execSync(`"${tsExe}" ip -4`, { encoding: "utf8", timeout: 3000 }).trim();
      if (/^\d+\.\d+\.\d+\.\d+$/.test(out)) tailscaleIp = out;
      try {
        const json = JSON.parse(execSync(`"${tsExe}" status --json`, { encoding: "utf8", timeout: 3000 }));
        tailscaleDns = safeString(json?.Self?.DNSName).replace(/\.$/, "") || null;
      } catch (_e2) {
        /* ignore */
      }
    } else {
      const out = execSync("tailscale ip -4", { encoding: "utf8", timeout: 3000 }).trim();
      if (/^\d+\.\d+\.\d+\.\d+$/.test(out)) tailscaleIp = out;
    }
  } catch (_e) {
    /* ignore */
  }

  return { lanIp, tailscaleIp, tailscaleDns };
}

function registerRemoteFoldRoutes(app, ctx = {}) {
  const check = validateApp(app);
  if (!check.ok) return check;

  const { PORT, buildPublicOverlayStateResponse, runtimeSecurityModule } = ctx;

  app.get("/mia/remote/info", (_req, res) => {
    const port = PORT;
    const { lanIp, tailscaleIp, tailscaleDns } = resolveNetworkHints();
    const hasSecret = Boolean(safeString(process.env.MIA_INGEST_SECRET));
    const foldUrlServe = tailscaleDns && hasSecret ? `https://${tailscaleDns}/mia-fold` : null;
    res.json({
      ok: true,
      port,
      lanIp,
      tailscaleIp,
      tailscaleDns,
      foldUrlLan: lanIp && hasSecret ? `http://${lanIp}:${port}/mia-fold` : null,
      foldUrlRemote: tailscaleIp && hasSecret ? `http://${tailscaleIp}:${port}/mia-fold` : null,
      foldUrlServe,
      hint: foldUrlServe
        ? "Mobilni data: foldUrlServe. Wi-Fi: foldUrlLan."
        : tailscaleIp
          ? "Mobilni data: npm run remote:serve. Wi-Fi: foldUrlLan."
          : "Nainstaluj Tailscale na notebook i Fold."
    });
  });

  app.get("/mia/remote/snapshot", (_req, res) => {
    try {
      const body = buildPublicOverlayStateResponse();
      const miaO = body.miaOverlay || null;
      const kojO = body.kojnozoutOverlay || body.kojnozroutOverlay || null;
      const chat = Array.isArray(body.chatFeed) ? body.chatFeed.slice(0, 10) : [];
      const playback = body.video?.currentPlayback || null;
      res.json({
        ok: true,
        ts: Date.now(),
        chat,
        speech: {
          mia: safeString(miaO?.text || miaO?.overlay_text || miaO?.speech_text),
          koj: safeString(kojO?.text || kojO?.overlay_text || kojO?.speech_text),
          miaTitle: safeString(miaO?.title),
          kojTitle: safeString(kojO?.title)
        },
        koj: {
          mood: safeString(body.kojDisplay?.mood),
          sprite: safeString(body.kojDisplay?.spriteAsset),
          emoji: safeString(body.kojDisplay?.moodEmoji),
          need: safeString(body.careOpportunities?.needLabel),
          itemUse: body.kojDisplay?.itemUse || null,
          hunger: body.kojnozoutState?.hunger,
          bowl: body.kojnozoutState?.bowlPercent ?? body.careOpportunities?.bowlPercent
        },
        duel: body.duel || null,
        arena: body.arena
          ? {
              duelActive: Boolean(body.arena.duel?.active),
              tournamentActive: Boolean(body.arena.tournament?.active),
              battle: body.arena.battle?.current
                ? {
                    label: safeString(body.arena.battle.current.label),
                    text: safeString(body.arena.battle.current.text),
                    projectile: safeString(body.arena.battle.current.projectile),
                    itemId: safeString(body.arena.battle.current.itemId)
                  }
                : null
            }
          : null,
        backpack: body.backpack?.display?.lastUseSummary || null,
        video: playback
          ? {
              active: true,
              tier: safeString(playback.tier),
              source: safeString(playback.sourceName || playback.label)
            }
          : { active: false },
        voice: body.voicePlayback || null,
        obsConnected: Boolean(body.obsConnected)
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/mia/remote/auth", (req, res) => {
    const auth =
      typeof runtimeSecurityModule.validateLocalAdmin === "function"
        ? runtimeSecurityModule.validateLocalAdmin(req)
        : { ok: false, error: "security_unavailable" };
    res.json({
      ok: auth.ok === true,
      mode: auth.mode || null,
      error: auth.ok ? null : auth.error,
      message: auth.ok ? "Token OK — ovládání povoleno" : auth.message
    });
  });

  app.get("/mia-fold", (_req, res) => {
    const secret = safeString(process.env.MIA_INGEST_SECRET);
    if (!secret) {
      return res.status(503).send("Chybí MIA_INGEST_SECRET v .env — spusť: npm run setup:secrets");
    }
    const port = PORT;
    const { lanIp, tailscaleIp, tailscaleDns } = resolveNetworkHints();
    const q = new URLSearchParams({ mia_secret: secret });
    if (lanIp) q.set("fold_lan", `http://${lanIp}:${port}/mia-fold`);
    if (tailscaleIp) q.set("fold_ts", `http://${tailscaleIp}:${port}/mia-fold`);
    if (tailscaleDns) q.set("fold_https", `https://${tailscaleDns}/mia-fold`);
    res.redirect(302, `/mia-remote.html?${q.toString()}`);
  });

  return {
    ok: true,
    routes: [
      "GET /mia/remote/info",
      "GET /mia/remote/snapshot",
      "GET /mia/remote/auth",
      "GET /mia-fold"
    ]
  };
}

module.exports = { registerRemoteFoldRoutes };
