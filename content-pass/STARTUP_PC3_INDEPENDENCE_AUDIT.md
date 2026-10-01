# STARTUP & PC3 INDEPENDENCE AUDIT — read-only mapa bootu a závislostí

**Status:** READ-ONLY · 2026-08-13 · Feature freeze ON  
**Účel:** zjistit, zda po rozdělení **PC1 STREAM + PC2 MIA** může produkce běžet a restartovat **bez PC3 notebooku**  
**STOP:** žádné runtime/síť/OBS změny — jen evidence z repa

Související: [`OBS_STATIC_AUDIT.md`](./OBS_STATIC_AUDIT.md) · [`TIKFINITY_STATIC_AUDIT.md`](./TIKFINITY_STATIC_AUDIT.md) · [`GENESIS_OPS_PRIORITY.md`](./GENESIS_OPS_PRIORITY.md)

---

## 0. Executive verdict

| Otázka | Odpověď |
|--------|---------|
| **Může PC1+PC2 žít bez PC3?** | **ANO — podmíněně.** PC3 není v produkčním boot chainu. Runtime je PC2; obraz/ingest UI je PC1. |
| **Je multi-PC dnes „plug-and-play“ z repa?** | **NE.** Docs + `.env.mia-pc.example` popisují cíl, ale runtime má **single-PC defaulty** (`127.0.0.1`, `OBS_AUTO_LAUNCH=true`, overlay URL bez env override v `index.js`). |
| **Největší blokátor nezávislosti** | **OBS Browser Sources URL** — pokud na PC1 stále míří na `127.0.0.1:3000`, overlaye načítají **PC1 localhost**, ne PC2 MIA. |
| **Druhý blokátor (GENESIS už potvrzený)** | **Scéna mismatch** — Program ≠ scéna kde MIA píše overlaye (`SPINAK_HLAVNI` vs `SPINAK_ENGINE_GIFTS`). |
| **Třetí blokátor (TikFinity audit)** | **Dvojí TTS** — TikFinity Actions paralelně k MIA webhooku. |

**PC3 production dependency cíl:** **ZERO** — splnitelné bez kódu, pokud doma správně nastavíš `.env` PC2, firewall, OBS WS, TikFinity webhook a browser URL na PC2 IP.

---

## 1. STARTUP MAP

Legenda: **AUTO** = proces se sám spustí/obnoví z kódu · **MANUAL** = operátor / Windows · **REQ** = bez toho live nejede · **OPT** = volitelné

| PROCESS | HOST ROLE | START COMMAND | PORT | DEPENDENCIES | AUTO/MANUAL | REQ/OPT |
|---------|-----------|---------------|------|--------------|-------------|---------|
| **MIA Node server** | PC2 MIA | `npm start` → `node server.js` → `index.js:startMiaServer` · alternativa `node index.js` · restart `npm run restart` / `node scripts/mia_restart.js` | **3000** TCP (`PORT`, bind `MIA_BIND_HOST`) | `.env`, `C:\MIA`, Node.js, disk `logs/` | **MANUAL** (žádný PM2/NSSM/Task Scheduler v repu) | **REQ** |
| **Platform bridges** (Kick default ON, Twitch OFF, YouTube/Telegram volitelné) | PC2 (in-process) | auto při `initAppRuntimesRuntime()` → `bootstrapPlatformBridges()` | — | internet (Kick WS), lokální `/ingest` | **AUTO** (start MIA) | Kick **OPT**; TikTok path **REQ** jde přes TikFinity |
| **HTTP ingest gateway** | PC2 | routes `/ingest`, `/tikfinity/*`, `/tiktok/ingest` | 3000 | `MIA_INGEST_SECRET` (LAN), firewall | **AUTO** | **REQ** |
| **8-phase event pipeline** | PC2 in-process | `processEvent` z ingest queue | — | TTS, overlay state, video engine | **AUTO** | **REQ** |
| **Overlay static HTTP** | PC2 | Express static `mia-output-overlay/` + HTML routes | 3000 | — | **AUTO** | **REQ** (OBS browser sources) |
| **TTS engine** | PC2 | `MIA_TTS_ENGINE.js` — default **Edge** (cloud) | — | **internet** (Edge TTS) nebo OpenAI API key | **AUTO** on event | **REQ** pro voice reakce |
| **OBS WebSocket client** | PC2 → PC1 | `connectObs()` v bootstrap po listen | **4455** WS na PC1 | `OBS_WS_URL`, `OBS_WS_PASSWORD`, firewall PC1 | **AUTO** reconnect ~5 s (`scheduleObsReconnect`) | **REQ** |
| **OBS Studio** | PC1 STREAM | Ručně / Windows shortcut | 4455 WS | GPU, profily, Virtual Camera | **MANUAL** | **REQ** |
| **OBS auto-launch watchdog** | PC2 (lokální obs64!) | `MIA_OBS_WATCHDOG.js` via `maybeAutoLaunchObs()` | — | `OBS_AUTO_LAUNCH` (default **true**), `OBS_EXE_PATH` | **AUTO** pokud enabled | **OPT** — **KONFLIKT multi-PC** (spouští OBS na PC2, ne PC1) |
| **Stream health watchdog** | PC2 | `core/stream-watchdog.js` — interval ~15 s | — | OBS WS hooks, ingest freshness | **AUTO** (default ON, `MIA_STREAM_WATCHDOG=0` vypne) | **OPT** (reconnect only) |
| **Runtime loops** | PC2 | `MIA_RUNTIME_LOOPS.js` — bowl, capybara, eyes, matting, duel sync | — | OBS connected pro některé ticky | **AUTO** | **OPT** |
| **TikFinity UI + Connect** | PC1 | Ručně (browser/app) | — | TikTok room, webhook → PC2 | **MANUAL** | **REQ** |
| **TikTok LIVE Studio** | PC1 | Ručně | — | OBS Virtual Camera, mikrofon | **MANUAL** | **REQ** |
| **Kick bridge** | PC2 in-process | `MIA_KICK_BRIDGE.js` | — | internet | **AUTO** if enabled | **OPT** |
| **Remote dev watcher** | PC3 DEV | `npm run remote:dev-watch` | — | Cursor, `data/remote-dev/` | **MANUAL** | **OPT** (dev only) |
| **Tailscale / remote scripts** | PC2 nebo PC3 | `npm run remote:check`, `remote:setup`, `.ps1` | 3000 / serve | Tailscale install | **MANUAL** | **OPT** (dev/remote) |
| **OpenSSH Server** | PC2 | Windows service `sshd` (docs) | 22 | firewall | **AUTO** (Windows service po setup) | **OPT** (dev SSH z PC3) |
| **RustDesk** | PC1 + PC2 (+ PC3 klient) | GUI install | — | — | **MANUAL** | **OPT** (operátorské GUI, ne runtime) |
| **CLI OBS maintenance** | PC2 (volá WS PC1) | `obs:refresh-overlays`, `obs:verify-stream-ready`, `genesis:*`, … | — | OBS WS, `.env` | **MANUAL** | **OPT** |
| **Preflight tests** | PC2 (dev/ops) | `npm run test:preflight:fast` | — | Node, repo | **MANUAL** | **OPT** (thaw checkpoint) |
| **MIA PC optimize** | PC1 nebo PC2 | `scripts/mia_pc_optimize.ps1` | — | — | **MANUAL** | **OPT** (RAM cleanup; checklist v skriptu předpokládá single-PC health URL) |

### 1.1 Boot sequence inside MIA process (evidence)

```text
node server.js
  → loadLocalEnv (MIA_ENV)
  → index.js module load
      → initRuntimeSecurityRuntime (BIND_HOST)
      → registerAllRoutes
      → initAppRuntimesRuntime()
          → bootstrapPlatformBridges()   // Kick/Twitch/…
          → initRuntimeLoopsRuntime()    // timers + stream watchdog
          → initServerBootstrapRuntime()
  → startMiaServer()
      → assertPortAvailableOrExit(PORT)
      → app.listen(PORT, BIND_HOST)
      → warnOnDeadObsSceneFiles()
      → connectObs()                     // WS → OBS on PC1
      → emitStartupOverlay() (delay 800ms)
```

**Zdroj:** `server.js`, `index.js:4427-4444`, `scripts/MIA_SERVER_BOOTSTRAP.js:26-76`

### 1.2 npm / shell entrypoints (produkčně relevantní)

| Příkaz | Účel | Host |
|--------|------|------|
| `npm start` | Produkční start | PC2 |
| `npm run restart` | Stop + spawn `server.js` + health wait | PC2 |
| `npm run stop` | Kill MIA on PORT | PC2 |
| `MIA_REMOTE_FIREWALL.bat` | Firewall pro Fold/Tailscale (port 3000) | PC2 |
| `scripts/mia_pc_optimize.ps1` | RAM cleanup před streamem | PC1 checklist |
| `scripts/remote_*.ps1` | Tailscale/firewall setup | PC2 / PC3 |

**Chybí v repu:** PM2, NSSM, Windows Task Scheduler definice pro auto-start MIA po rebootu PC2.

---

## 2. PC ROLE MAP

### 2.1 Cílová architektura

| Role | Stroj | Běží zde |
|------|-------|----------|
| **PC1 STREAM** | OBS, TikTok LIVE Studio, TikFinity UI, kamera, Virtual Camera | Žádný Node/MIA |
| **PC2 MIA** | Node, ingest, pipeline, TTS, overlay HTTP, logy, OBS WS **klient** | Celý `C:\MIA` runtime |
| **PC3 NOTEBOOK** | Cursor, ChatGPT, audity, SSH klient, RustDesk klient | **DEV ONLY** |

### 2.2 Co repu/configu **odporuje** rozdělení

| # | Problém | Kde | Dopad |
|---|---------|-----|-------|
| R1 | **Overlay base URL hardcoded `127.0.0.1`** | `index.js:915-916` `MIA_OVERLAY_BASE`, `MIA_SPLIT_OVERLAYS()` | Sync/log URL míří na localhost PC2; OBS na PC1 musí mít **ručně** PC2 IP v browser sources |
| R2 | **`OBS_AUTO_LAUNCH` default true** | `MIA_CONFIG.js:377-378` | Po pádu WS může PC2 pokusit spustit **lokální** obs64 — na MIA PC nechceme |
| R3 | **`detectObsProcessRunning()` lokální tasklist** | `MIA_OBS_BOOTSTRAP.js:49-61`, watchdog | Na PC2 vždy „OBS neběží“ → watchdog může spouštět OBS na špatném stroji; diagnostika zavádí |
| R4 | **`probeTcpPort("127.0.0.1", wsPort)` v error logu** | `MIA_OBS_BOOTSTRAP.js:251` | Při remote OBS špatná diagnostika (kontroluje PC2 localhost místo STREAM IP) |
| R5 | **Default bind `127.0.0.1`** | `MIA_RUNTIME_SECURITY.js:12-17` | Bez `MIA_BIND_HOST=0.0.0.0` TikFinity z PC1 **nedosáhne** ingest |
| R6 | **Default `OBS_WS_URL=ws://127.0.0.1:4455`** | `MIA_CONFIG.js:159`, `index.js:307` | Multi-PC vyžaduje `ws://<PC1-IP>:4455` |
| R7 | **TikFinity webhook docs/checklisty s 127.0.0.1** | `STREAM_VALIDATION_02.md`, `mia_pc_optimize.ps1:75` | Operátor může nechat webhook na localhost PC1 |
| R8 | **ICS vs switch topologie smíchaná v docs** | `MIA_MULTI_PC_SETUP.md` (ICS 192.168.137.x vs switch 192.168.1.x) | IP plán musí být jeden konzistentní doma |
| R9 | **Žádný Windows service pro MIA** | — | Reboot PC2 = **MANUAL** restart Node |
| R10 | **`layoutLocked` default true chrání URL** | `MIA_OBS_OVERLAY_SYNC.js:912-920` | **Pozitivum:** MIA nepřepíše browser URL při connect — ale **nepopraví** špatné 127.0.0.1 v OBS |

### 2.3 Co rozdělení **podporuje** (ready)

| Položka | Soubor |
|---------|--------|
| `.env.mia-pc.example` — `MIA_BIND_HOST=0.0.0.0`, `OBS_WS_URL=ws://<STREAM-IP>:4455`, `OBS_AUTO_LAUNCH=false` | root |
| `.env.stream-pc.example` — checklist bez Node | root |
| `docs/MIA_MULTI_PC_SETUP.md`, `MIA_MULTI_PC_DAY1_CHECKLIST.md` | docs |
| Ingest auth pro LAN — `MIA_INGEST_SECRET` | `MIA_RUNTIME_SECURITY.js` |
| OBS WS reconnect + stream watchdog | `MIA_OBS_BOOTSTRAP.js`, `stream-watchdog.js` |

---

## 3. PC3 HARD GATE

**Cíl: PC3 production dependency = ZERO**

| Komponenta | REQUIRES_PC3 | Poznámka |
|------------|--------------|----------|
| MIA Node runtime | **NO** | PC2 |
| Ingest / pipeline / TTS | **NO** | PC2 |
| Overlay HTTP | **NO** | PC2 :3000 |
| OBS Studio + WS server | **NO** | PC1 |
| TikFinity + TikTok Studio | **NO** | PC1 |
| Virtual Camera path | **NO** | PC1 |
| Cursor IDE | **NO** (dev) | PC3 — vypnutí neovlivní live |
| `remote:dev-watch` | **NO** | PC3 dev convenience |
| OpenSSH / RustDesk / Tailscale | **NO** (ops) | Vzdálená správa; stream může běžet bez nich |
| Preflight / CLI skripty | **NO** | Spouští se na PC2 nebo PC3, ne v hot path |
| Internet (Edge TTS) | **NO** (PC3) | **YES** (PC2) — TTS potřebuje WAN na PC2 |
| Notebook pro „Connect TikFinity“ | **NO** | Operátor na PC1 obrazovce |

**Verdikt:** Produkcí **nic nevyžaduje běžící PC3**. Notebook může odjet z LAN — **pokud** PC1+PC2 běží a jsou správně nakonfigurované.

---

## 4. NETWORK CONFIG AUDIT

Cílová LAN (z ops docs): `192.168.137.0/24` — PC1 `.1`, PC2 `.20`, PC3 `.30`

| Binding / URL | Soubor | Default | Po PC1/PC2 split | Akce doma |
|---------------|--------|---------|------------------|-----------|
| `MIA_BIND_HOST` | `MIA_RUNTIME_SECURITY.js` | `127.0.0.1` | **FAIL** ingest z PC1 | `.env` → `0.0.0.0` |
| `PORT` | `.env.example` | `3000` | OK | firewall PC2 inbound :3000 z PC1 subnet |
| `OBS_WS_URL` | `MIA_CONFIG.js` | `ws://127.0.0.1:4455` | **FAIL** pokud OBS na PC1 | `ws://192.168.137.1:4455` (nebo skutečná PC1 IP) |
| `OBS_WS` port | docs / `.env.stream-pc.example` | **4455** | OK | firewall PC1 :4455 z PC2 only |
| Overlay URLs v runtime | `index.js:916` | `http://127.0.0.1:3000/...` | **FAIL** pro OBS browser na PC1 | OBS sources → `http://<PC2-IP>:3000/...` **ručně v OBS** |
| TikFinity webhook | `.env.stream-pc.example` | placeholder `<MIA-IP>` | OK pokud vyplněno | `http://192.168.137.20:3000/ingest` |
| Kick ingest URL | `MIA_CONFIG.js:206` | `127.0.0.1:3000/ingest` | OK (loopback PC2) | — |
| Health check docs | `MIA_MULTI_PC_DAY1_CHECKLIST.md` | `<MIA-IP>:3000/health` | OK | curl ze PC1 |
| `reconnectUrl` v health | `MIA_OBS_BOOTSTRAP.js:120` | `127.0.0.1` | jen pro operátora na PC2 | OK |
| MIA Paint WS | `MIA_SERVER_BOOTSTRAP.js:81` | `127.0.0.1` | dev tool | OPT |
| Twitch OAuth callback | docs | `localhost:3099` | N/A TikTok path | OPT |
| Tailscale serve | `remote_tailscale_serve.ps1` | — | dev remote | OPT |

### 4.1 Firewall (dokumentované, ne v kódu)

```powershell
# PC2 — ingest z LAN (MIA_MULTI_PC_SETUP.md)
New-NetFirewallRule ... -LocalPort 3000 -RemoteAddress 192.168.137.0/24

# PC1 — OBS WS jen z MIA PC
# inbound 4455 from <PC2-IP>
```

---

## 5. BOOT ORDER

**Odvozeno z evidence — ne vymyšlené kroky označeny UNKNOWN.**

| # | Krok | Kdo | Evidence |
|---|------|-----|----------|
| 1 | **Síť L2/L3** — PC1↔PC2 ping | obě PC | `MIA_MULTI_PC_DAY1_CHECKLIST.md` §2 |
| 2 | **PC2: MIA server** `npm start` / `npm run restart` | PC2 | MIA musí poslouchat před TikFinity testem |
| 3 | **PC1: OBS** start + WebSocket ON :4455 | PC1 | `connectObs()` po listen PC2 |
| 4 | **PC2 ↔ PC1 OBS WS** handshake | auto | `MIA_SERVER_BOOTSTRAP.js:66` — `/health` → `obsConnected: true` |
| 5 | **PC1: OBS Virtual Camera** | PC1 | `.env.stream-pc.example` |
| 6 | **PC1: TikFinity** — Connect room + webhook → PC2 | PC1 | ingest log na PC2 |
| 7 | **PC1: TikTok LIVE Studio** — Virtual Camera + mic | PC1 | UNKNOWN pořadí vůči TikFinity — obvykle po OBS VC |
| 8 | **Startup overlay / startup-check** | auto PC2→PC1 | `emitStartupOverlay` +800 ms |

**Doporučené minimum (ops):**

```text
NETWORK → PC2 MIA (:3000 bind 0.0.0.0) → PC1 OBS (+ WS) → [verify obsConnected]
→ PC1 TikFinity (webhook PC2) → PC1 TikTok Studio
```

**UNKNOWN:** automatický start po rebootu Windows (žádný service wrapper v repu).

---

## 6. FAILURE / RECOVERY MATRIX

| Scénář | Chování (z kódu/docs) | Klasifikace |
|--------|------------------------|-------------|
| **Restart PC1** | OBS WS down; MIA na PC2 loguje disconnect; `scheduleObsReconnect` + stream watchdog **AUTO** reconnect po návratu OBS; ingest/TTS na PC2 **běží dál**; overlay/video **nefungují** dokud OBS+WS nejsou | **AUTO RECOVER** (WS) · **MANUAL** (spustit OBS na PC1) |
| **Restart PC2** | MIA mrtvé; TikFinity webhook fail; OBS browser sources mohou zobrazovat cache, ale **žádné nové** overlay/TTS | **MANUAL RECOVER** (`npm start` na PC2) · **FATAL** pro live dokud PC2 neběží |
| **Restart OBS** (proces) | WS `ConnectionClosed` → reconnect timer 5 s; watchdog **nespustí** relaunch pokud proces běží; pokud proces **zmizí** a `OBS_AUTO_LAUNCH=true` na PC2 → pokus o **lokální** obs64 (**špatný PC**) | **AUTO RECOVER** (WS) · **MANUAL** (OBS na PC1) · riziko **FATAL** mis-launch na PC2 |
| **Restart MIA** | `npm run restart` — stop port + spawn + health; platform bridges restartují | **MANUAL RECOVER** |
| **Výpadek OBS WS** | reconnect loop; stream watchdog force po 3× down | **AUTO RECOVER** |
| **Výpadek TikFinity** | ingest přestane; watchdog loguje stale ingest (>120 s default) — **neopravuje** TikFinity | **MANUAL RECOVER** |
| **LAN výpadek PC1↔PC2** | WS fail + ingest fail + browser sources na PC1 nemusí dosáhnout PC2 | **FATAL** pro E2E |
| **PC3 offline / odvezen** | **Žádný dopad** na běžící PC1+PC2 | **AUTO OK** (pro produkci) |
| **Edge TTS / internet down** | TTS fail pro voice events; pipeline jinak může pokračovat | **PARTIAL** — voice **MANUAL**/wait WAN |
| **Safe Mode OBS** | port 4455 closed; health hint v bootstrap | **MANUAL RECOVER** |

**Poznámka:** `MIA_OBS_WATCHDOG.js` explicitně **nespouští** OBS pokud proces běží — relaunch jen když `obs64.exe` **na stroji kde běží MIA** chybí. Na PC2 s OBS na PC1 → watchdog **nemůže** nahodit OBS na PC1.

---

## 7. REMOTE DEV — READINESS ONLY

**NEIMPLEMENTOVÁNO — jen inventář pro později (kamion → domácí PC2).**

| Vrstva | Stav v repu | Co bude potřeba později |
|--------|-------------|-------------------------|
| **SSH → PC2** | `MIA_MULTI_PC_SETUP.md` — OpenSSH Server | Klíče, uživatel, firewall 22, Cursor Remote SSH |
| **RustDesk** | docs — GUI PC1/PC2 | Instalace na stream strojích; PC3 jen klient |
| **Tailscale** | `npm run remote:install-tailscale`, `remote:serve`, `remote:firewall` | Účet, PC2 v tailnet, **nesahat** během freeze bez plánu |
| **Remote dev API** | `MIA_REMOTE_DEV.js`, `routes/remote_fold.js`, `mia-remote-dev.html` | Volitelný fronta úkolů; ne production |
| **Remote watcher** | `mia_remote_dev_watcher.js` — PC3 Cursor | Dev only |
| **Deploy / git pull** | **UNKNOWN** automation | Ruční nebo budoucí CI — **není** v hot path |
| **Secrets** | `.env` na PC2 | Nikdy necommitovat; sync mimo git |

**Bezpečný směr:** PC3 vyvíjí → git push/pull nebo SSH edit → restart MIA na PC2 → **nikdy** nepotřebuje běžet během live.

---

## 8. SECRETS SAFETY

**Umístění (názvy only — žádné hodnoty):**

| Secret / credential | Kde | Host |
|---------------------|-----|------|
| `.env` (hlavní) | `C:\MIA\.env` | PC2 |
| `.env.example` | repo template | reference |
| `.env.mia-pc.example` | multi-PC template | PC2 |
| `.env.stream-pc.example` | GUI checklist | PC1 (ne Node) |
| `OBS_WS_PASSWORD` | `.env` PC2 + OBS GUI PC1 | musí match |
| `MIA_INGEST_SECRET` | `.env` PC2 | TikFinity/header z PC1 |
| `GROQ_API_KEY` / `OPENAI_API_KEY` | `.env` | PC2 LLM/TTS |
| `MIA_TTS_API_KEY` | `.env` | PC2 |
| `MIA_TELEGRAM_BOT_TOKEN` | `.env` | PC2 OPT |
| Kick/Twitch tokens | `.env` | PC2 OPT |
| `npm run setup:secrets` / `setup:vault` | scripts | initial setup |

**`.gitignore`:** `.env` by neměl do gitu. Audit **nekopíroval** žádné tokeny.

---

## FINDINGS

1. **PC3 není produkční závislost** — splněno záměrem architektury.
2. **Single-PC defaulty v runtime** (`127.0.0.1` overlay base, bind host, OBS WS) — multi-PC vyžaduje **domácí `.env` + OBS browser URL** úpravy.
3. **`OBS_AUTO_LAUNCH=true` default** — na PC2 **musí být false** (`.env.mia-pc.example` to říká; kód default ne).
4. **OBS watchdog na PC2 neobnoví OBS na PC1** — restart stream PC = **ruční** start OBS.
5. **Žádný auto-start MIA po rebootu** — PC2 reboot = ruční `npm start`.
6. **TTS potřebuje internet na PC2** (Edge) — ne PC3.
7. **`layoutLocked=true` (default)** chrání OBS layout/URL před přepsáním — dobré pro stabilitu, **neopraví** špatné 127.0.0.1 URL.
8. **Kombinace s OBS + TikFinity audity:** nezávislost nestačí — scéna + double TTS musí být v execution plánu.

---

## PC1 REQUIREMENTS (STREAM)

- [ ] OBS Studio + WebSocket **4455** + heslo shodné s PC2 `.env`
- [ ] Firewall: inbound **4455** jen z PC2 IP
- [ ] Program scéna: `SPINAK_HLAVNI` (nebo vědomý výběr) — viz OBS audit
- [ ] Browser sources URL → **`http://<PC2-IP>:3000/...`** ne `127.0.0.1`
- [ ] Virtual Camera ON
- [ ] TikFinity: webhook `http://<PC2-IP>:3000/ingest` (+ secret pokud zapnuto)
- [ ] TikFinity Actions TTS **OFF** (TikFinity audit D1)
- [ ] TikTok LIVE Studio → OBS Virtual Camera
- [ ] **Nespouštět** `node` / `npm start` / MIA repo runtime

---

## PC2 REQUIREMENTS (MIA)

- [ ] Repo `C:\MIA` + `.env` z `.env.mia-pc.example`
- [ ] `MIA_BIND_HOST=0.0.0.0`
- [ ] `OBS_WS_URL=ws://<PC1-IP>:4455`
- [ ] `OBS_AUTO_LAUNCH=false`
- [ ] `OBS_SCENE_NAME` / `MIA_OBS_CAMERA_SCENE` matchuje OBS scénu s overlaye (`SPINAK_ENGINE_GIFTS`)
- [ ] Firewall inbound **3000** z PC1 subnet
- [ ] `npm start` nebo `npm run restart` → `/health` OK
- [ ] `/health` → `obsConnected: true` když OBS běží na PC1
- [ ] Internet pro Edge TTS
- [ ] Logy: `C:\MIA\logs\`

---

## PC3 DEPENDENCIES

| Závislost | Production? |
|-----------|-------------|
| Cursor | **NO** |
| ChatGPT | **NO** |
| Audity v `content-pass/` | **NO** |
| SSH klient | **NO** |
| RustDesk klient | **NO** (ops comfort) |
| `remote:dev-watch` | **NO** |

**Target met: PC3 production dependency = ZERO**

---

## NETWORK RISKS

| Risk | Severity | Mitigace (doma, ne kód) |
|------|----------|-------------------------|
| PC2 bind 127.0.0.1 | **HIGH** | `MIA_BIND_HOST=0.0.0.0` |
| OBS browser 127.0.0.1 on PC1 | **HIGH** | Přepsat URL na PC2 IP v OBS |
| TikFinity webhook localhost | **HIGH** | PC2 IP v TikFinity UI |
| Firewall blokuje 3000/4455 | **HIGH** | Pravidla dle multi-PC docs |
| ICS vs switch IP chaos | **MED** | Jedna tabulka IP, ping 3/3 |
| LAN split | **HIGH** | Fyzická síť — obě PC stejný subnet |
| WAN down on PC2 | **MED** | TTS offline; ingest/overlay OK |

---

## BOOT ORDER

```text
1. NETWORK (PC1 ↔ PC2 ping)
2. PC2: MIA server (npm start)
3. PC1: OBS + WebSocket
4. VERIFY: curl PC2:3000/health → obsConnected:true
5. PC1: TikFinity connect + webhook
6. PC1: TikTok LIVE Studio
7. TEST: COMMENT → ingest log PC2
8. TEST: gift → overlay visible in Program scene
```

---

## RECOVERY MATRIX (shrnutí)

| Event | AUTO | MANUAL | FATAL |
|-------|------|--------|-------|
| PC1 reboot | WS reconnect | Start OBS, TikFinity, Studio | — |
| PC2 reboot | — | Start MIA | live down until done |
| OBS crash PC1 | WS reconnect | Start OBS PC1 | — |
| MIA crash PC2 | — | npm restart | live down |
| TikFinity crash | — | Restart TikFinity | ingest stop |
| PC3 away | ✓ | — | — |
| LAN loss | — | Fix network | E2E down |

---

## HOME_VERIFICATION (30–45 min — Fáze F)

| # | Test | PASS kritérium |
|---|------|----------------|
| H1 | Ping PC1↔PC2 | 0% loss |
| H2 | `curl http://<PC2>:3000/health` z PC1 | HTTP 200, service MIA |
| H3 | `/health` → `obsConnected` | `true` |
| H4 | Vypni PC3 / odpoj od LAN | PC1+PC2 health stále OK |
| H5 | TikFinity test comment | řádek v `logs/ingest-*.jsonl` PC2 |
| H6 | Overlay visible v **Program** scéně | divák/OBS preview |
| H7 | TTS jedna cesta | slyšet ve streamu, ne double |
| H8 | Restart OBS PC1 only | do 30 s `obsConnected:true` bez PC3 |
| H9 | Restart MIA PC2 only | po `npm start` ingest+OBS OK |
| H10 | Browser source URL audit v OBS | **žádné** `127.0.0.1:3000` na PC1 |

---

## MINIMAL FIX CANDIDATES (docs/env only — FREEZE)

| ID | Fix | Typ | Kdy |
|----|-----|-----|-----|
| F-START-1 | PC2 `.env`: bind 0.0.0.0, OBS WS → PC1, AUTO_LAUNCH=false | env | Den 1 |
| F-START-2 | OBS PC1: všechny MIA browser URL → PC2 IP | OBS GUI | Den 1 |
| F-START-3 | TikFinity webhook → PC2 IP (+ secret) | TikFinity UI | Den 1 |
| F-START-4 | Firewall 3000/4455 | OS | Den 1 |
| F-START-5 | Ověř Program scéna vs ENGINE_GIFTS nested | OBS | Den 1 (OBS audit) |
| F-START-6 | TikFinity Actions TTS off | TikFinity UI | Den 1 (TikFinity audit) |
| F-START-7 | Windows Task Scheduler pro `npm start` PC2 | ops | **Později** (thaw) — není v repu |
| F-START-8 | `MIA_OVERLAY_BASE` env support v `index.js` | kód | **Později** (thaw) — dnes OBS URL ručně |

---

*Konec auditu. Další krok: sestavit **HOME EXECUTION PLAN** ze tří map (OBS + TikFinity + Startup) — bez dalších auditů.*
