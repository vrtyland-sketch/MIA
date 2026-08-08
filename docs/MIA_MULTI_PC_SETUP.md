# MIA — třípočítačová architektura (setup checklist)

**Účel:** Notebook (Cursor) programuje MIA na **MIA PC** a MIA ovládá **OBS na STREAM PC**.  
**Síť dnes:** STREAM PC (WiFi → router) + MIA PC (LAN → STREAM PC, ICS). Notebook (WiFi → router).

---

## Topologie

```text
                  TikTok
                     │
                     ▼
        STREAM PC (GTX 1060)          Router 192.168.1.x
        OBS • Studio • TikFinity           │
              │                            │
         LAN + ICS                         │
      192.168.137.x                        │
              │                            │
              ▼                            ▼
         MIA PC (node)              Notebook (Cursor)
         ingest • TTS • logika      RustDesk + SSH klient
```

| Stroj | Role | Příklad IP (doplň skutečné) |
|-------|------|-----------------------------|
| **STREAM PC** | OBS, TikTok LIVE Studio, TikFinity UI | Router: `192.168.1.__` · ICS: `192.168.137.1` |
| **MIA PC** | `node`, MIA, logy, `/ingest` | ICS: `192.168.137.__` |
| **Notebook** | Cursor, RustDesk, ChatGPT | Router: `192.168.1.__` |

### Role + IP (vyplň po zapojení switche)

| Role | IP | Co běží |
|------|-----|---------|
| **STREAM PC** | `192.168.1.___` | OBS + TikTok LIVE Studio + TikFinity |
| **MIA PC** | `192.168.1.___` | Node + MIA runtime + `/ingest` + TTS + logy |
| **CONTROL** | `192.168.1.___` | Cursor + ChatGPT + RustDesk + SSH |

**Env šablony:** [`.env.mia-pc.example`](../.env.mia-pc.example) · [`.env.stream-pc.example`](../.env.stream-pc.example)

> **Poznámka:** Při ICS je MIA PC v jiné podsíti než notebook. Notebook se k MIA dostane přes IP STREAM PC (port forward) nebo přes RustDesk. Dlouhodobě ideál: **gigabit switch** → vše na `192.168.1.x`.

---

## Krok 0 — Zjisti IP (na každém PC)

```powershell
ipconfig
hostname
```

Zapiš si:

| Stroj | Hostname | IPv4 (router) | IPv4 (ICS) |
|-------|----------|---------------|------------|
| STREAM PC | | `192.168.1.` | `192.168.137.1` |
| MIA PC | | — | `192.168.137.` |
| Notebook | | `192.168.1.` | — |

Ověř ping z notebooku:

```powershell
ping 192.168.1.__    # STREAM PC (router)
ping 192.168.137.__  # MIA PC (jen pokud notebook vidí ICS — často ne bez routingu)
```

Pokud notebook **nevidí** `192.168.137.x`, používej **RustDesk** na MIA PC pro SSH setup, nebo dočasně port forward na STREAM PC.

---

### B1 — MIA PC `.env`

Zkopíruj [`.env.mia-pc.example`](../.env.mia-pc.example) → `C:\MIA\.env` na **MIA PC**.

Klíčové hodnoty:

```env
MIA_BIND_HOST=0.0.0.0
OBS_WS_URL=ws://<STREAM-IP>:4455
OBS_WS_PASSWORD=<PASSWORD>
OBS_AUTO_LAUNCH=false
```

TikFinity webhook (nastavení v UI na **STREAM PC**): `http://<MIA-PC-IP>:3000/ingest` — viz [`.env.stream-pc.example`](../.env.stream-pc.example).

### B2 — STREAM PC

**Žádný MIA `.env`.** Checklist v [`.env.stream-pc.example`](../.env.stream-pc.example) (OBS WS, firewall, TikFinity, Virtual Camera).

---

## Krok 1 — MIA PC: OpenSSH Server

**Na MIA PC** (PowerShell jako Admin):

```powershell
# Windows 11: Settings → System → Optional features → OpenSSH Server
# nebo:
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service sshd -StartupType Automatic
Get-NetFirewallRule -Name *OpenSSH-Server* | Set-NetFirewallRule -Enabled True
```

Ověř:

```powershell
Get-Service sshd
```

Z **notebooku**:

```powershell
ssh uzivatel@192.168.137.__
# nebo přes STREAM IP + forward, pokud ICS blokuje přímou cestu
```

---

## Krok 2 — Notebook: Cursor Remote SSH

1. Cursor → Extensions → **Remote - SSH**
2. `~/.ssh/config` (nebo Cursor SSH config):

```sshconfig
Host mia-pc
    HostName 192.168.137.__
    User TVOJE_WINDOWS_JMENO
    # IdentityFile ~/.ssh/id_ed25519   # volitelně klíč místo hesla
```

3. Cursor → **Remote-SSH: Connect to Host** → `mia-pc`
4. Otevři složku **`C:\MIA`** (nebo kde je repo na MIA PC)
5. Terminál v Cursoru běží **na MIA PC** → `npm run restart`, `node --check index.js`, logy

**Programování MIA:** ✅ hotovo přes SSH.  
**OBS GUI scény:** ❌ ne tady — viz krok 4 (RustDesk).

---

## Krok 3 — STREAM PC: OBS WebSocket

**Na STREAM PC** v OBS:

1. **Tools → WebSocket Server Settings**
2. Enable WebSocket server
3. Port: **4455**
4. Heslo: silné, stejné zapíšeš do MIA `.env`

Firewall (PowerShell Admin na **STREAM PC**):

```powershell
New-NetFirewallRule -DisplayName "OBS WebSocket MIA" -Direction Inbound -Protocol TCP -LocalPort 4455 -RemoteAddress 192.168.137.__ -Action Allow
```

(`RemoteAddress` = IP **MIA PC** v ICS síti)

---

## Krok 4 — MIA PC: `.env` vzdálené OBS

V **`C:\MIA\.env`** na **MIA PC**:

```env
OBS_WS_URL=ws://192.168.137.1:4455
OBS_WS_PASSWORD=stejne_heslo_jako_v_obs
```

Pokud STREAM PC má na routeru jinou IP a MIA jde přes ni:

```env
# ICS: STREAM je gateway pro MIA
OBS_WS_URL=ws://192.168.137.1:4455
```

Restart MIA:

```bash
npm run restart
```

Ověř:

```powershell
curl http://127.0.0.1:3000/health
# obsConnected: true
```

---

## Krok 5 — TikFinity webhook

TikFinity (na STREAM PC nebo notebooku) → webhook:

```text
http://192.168.137.__:3000/ingest
```

(`__` = IP **MIA PC**, ne localhost notebooku)

Aliases (stejný handler):

- `http://<MIA-IP>:3000/tikfinity/webhook`
- `http://<MIA-IP>:3000/tiktok/ingest`

Firewall na **MIA PC** (povolit ingest z STREAM / LAN):

```powershell
New-NetFirewallRule -DisplayName "MIA ingest LAN" -Direction Inbound -Protocol TCP -LocalPort 3000 -RemoteAddress 192.168.137.0/24 -Action Allow
New-NetFirewallRule -DisplayName "MIA ingest router" -Direction Inbound -Protocol TCP -LocalPort 3000 -RemoteAddress 192.168.1.0/24 -Action Allow
```

---

## Krok 6 — RustDesk (GUI co Cursor neudělá)

| Potřebuješ | Kde |
|------------|-----|
| OBS scény, rozlišení, Program | **RustDesk → STREAM PC** |
| TikTok LIVE Studio | **RustDesk → STREAM PC** |
| TikFinity UI / Connect room | **RustDesk → STREAM PC** |
| Desktop MIA PC když SSH nestačí | **RustDesk → MIA PC** |

Cursor = kód. RustDesk = ovládání obrazovky.

---

## Krok 7 — Rychlý test po setupu

**Z MIA PC** (SSH terminál v Cursoru):

```bash
node --check index.js
npm run restart
npm run test:preflight:fast
curl http://127.0.0.1:3000/health
```

**TikFinity Test** → řádek v `logs/ingest-YYYY-MM-DD.jsonl` + `obsConnected: true`.

**Gift test** → `video_playback_started` v `mia-events` + video **viditelné** ve STREAM/TikTok (operátor).

---

## Checklist (zaškrtni)

### MIA PC
- [ ] OpenSSH Server běží (`sshd`)
- [ ] Repo `C:\MIA` + `.env` s `OBS_WS_URL` na STREAM
- [ ] Firewall port **3000** z LAN
- [ ] `npm run restart` → `/health` ok, `obsConnected: true`

### STREAM PC
- [ ] OBS WebSocket **4455** + heslo
- [ ] Firewall **4455** jen z MIA IP
- [ ] TikFinity webhook → `http://<MIA-IP>:3000/ingest`

### Notebook
- [ ] Cursor Remote SSH → MIA PC
- [ ] RustDesk → STREAM PC + MIA PC
- [ ] Ping / health dostupné (nebo jen RustDesk pokud ICS blokuje)

---

## Časté problémy

| Symptom | Příčina | Fix |
|---------|---------|-----|
| `obsConnected: false` | Špatné `OBS_WS_URL` / firewall 4455 | IP STREAM v ICS, heslo, firewall |
| Ingest nejde | Webhook na `127.0.0.1` místo MIA IP | TikFinity → `<MIA-IP>:3000` |
| SSH nejde z notebooku | ICS izolace | RustDesk na MIA, nebo switch místo ICS |
| RDP nejde | Windows **Home** | RustDesk (viz STREAM_RECOVERY) |

---

## Později (až bude switch)

```text
        Router / switch 192.168.1.x
       /        |           \
 Notebook   STREAM PC    MIA PC
```

Vše na jedné síti → jednodušší SSH, RustDesk, health, bez ICS.

---

**Související:** [`MIA_OPERATIONS_STATUS.md`](./MIA_OPERATIONS_STATUS.md) · [`STREAM_RECOVERY_01.md`](./STREAM_RECOVERY_01.md) · [`.env.example`](../.env.example)

---

## Den 1 — profesionální pořadí (po doručení HW)

**Nepřeskakovat kroky.** Baseline na notebooku je uzavřen — první live na nové topologii až po B+C.

```text
A  Síť + IP tabulka (checklist níže)
B  Multi-PC wiring (Krok 1–6) → obsConnected + ingest
C  THAW CHECKPOINT → npm run test:preflight (full) → triáž → thaw CLEAN
D  Live retest → PRE_MIGRATION_BASELINE_EVIDENCE (3 RAM snapshoty)
E  Teprve potom RET/cleanup + PF backlog
```

Detail C–E: [`MIA_OPERATIONS_STATUS.md`](./MIA_OPERATIONS_STATUS.md) · [`POST_FREEZE_BACKLOG.md`](./POST_FREEZE_BACKLOG.md)
