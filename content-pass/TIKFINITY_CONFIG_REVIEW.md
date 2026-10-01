# TIKFINITY CONFIG REVIEW — read-only inventář (PC3 notebook)

**Status:** PC3 LIVE READ (2026-08-13) — TikFinity desktop **otevřené na notebooku** · IndexedDB **locked** (app běží) · **NIC NEMĚNĚNO v OBS/MIA/síti**  
**Datum:** 2026-08-13 · Feature freeze ON  
**Účel:** zjistit, co TikFinity **opravdu** dělá s COMMENT/GIFT **před** `/ingest`  
**Metoda:** Local Storage LevelDB read z `%APPDATA%\tikfinity\` (běžící Electron profil) + OBS backup cross-check  
**Související:** [`TIKFINITY_STATIC_AUDIT.md`](./TIKFINITY_STATIC_AUDIT.md) · [`HOME_EXECUTION_PLAN.md`](./HOME_EXECUTION_PLAN.md) krok 7

---

## Executive verdict (po PC3 live read)

| Otázka | Odpověď |
|--------|---------|
| Je to **stejný TikFinity účet** jako stream/OBS? | **ANO — channelId `2743946`, username `vaclavvrtyland`** (shoda s OBS widget `cid=2743946`) |
| Je PC3 profil = budoucí PC1 profil? | **Pravděpodobně ANO** (stejný účet); webhook URL v IndexedDB **neověřeno** — může být per-machine |
| D1 Comment→TTS větev | **CONFIRMED HISTORICAL + CURRENT ACTIVE (PC3 evidence)** |
| Webhook → MIA `/ingest` | **UNKNOWN** — v Local Storage **nenalezeno** `/ingest`; plná definice v **IndexedDB (locked)** |
| Bylo něco disabled? | **NE** — disable Read Comments vyžaduje ruční krok v otevřeném TikFinity UI (Electron neautomatizovatelný z Cursoru) |

> **Profilová shoda:** Notebook TikFinity není „jiná instalace bez vztahu ke streamu“ — jde o **stejný kanál** jako OBS backup. Produkční PC1 ale může mít **jinou webhook IP** (IndexedDB nečitelné za běhu app).

---

## PC3 LIVE READ — metoda a limity

| Zdroj | Výsledek |
|-------|----------|
| TikFinity Electron (otevřené) | UI neautomatizovatelné z Cursor browser MCP (desktop app, ne browser tab) |
| Local Storage LevelDB | **Čteno** — `ttscomment`, event triggers, gift broadcast catalog, channel metadata |
| IndexedDB (`WebStorage/1/...`) | **LOCKED** — soubor používán běžící app → webhook/actions detaily nečitelné |
| Cursor browser → tikfinity.zerody.one | **Nepřihlášeno** (jiná session než desktop app) |
| `/ingest`, `webhook`, `WebRequest` v Local Storage | **Nenalezeno** |

---

## ACTIVE COMMENT ACTIONS

**Zdroj:** PC3 Local Storage (2026-08-13, app běží) · formát: `TRIGGER → ACTION → OUTPUT → ACTIVE? → kolize s MIA?`

| # | TRIGGER | ACTION | OUTPUT | ACTIVE? | Kolize s MIA? |
|---|---------|--------|--------|---------|---------------|
| C1 | **Comment/Chat** (triggerType `1`) | Custom Action ID `14034216` (název v IndexedDB — **locked**) | **UNKNOWN** (TTS / sound / webhook?) | **LIKELY ON** (event trigger wired, `active` bit v fragmentu) | **UNKNOWN typ** — pokud TTS/sound → **YES** |
| C2 | **Comment** (built-in) | **`ttscomment`** — Read Comments / TTS | stream audio (TikFinity TTS) | **CURRENT ACTIVE (PC3)** — plná konfigurace: `cs-CZ`, `google_female`, `ttsvolume`, `usercooldown`; voice usage log `2026-08-08` | **YES — DOUBLE TTS RISK** |
| C3 | Comment | **Sound queue** (myinstants.com knihovna: FAH, undertaker bell, meme sounds, …) | audio | **CONFIGURED** (datasource present) | **YES** pokud navázáno na Comment trigger |
| C4 | Comment | **Chat filtry** — letterspam, randomvoicev2, soundsplay once, explicit filter | filter / skip / sound | **CONFIGURED** | **LOW–MEDIUM** |
| C5 | Comment | **Custom chat commands** (`!tts`, `!get`, `!spin`, `!help`, …) | chat game / economy | **CONFIGURED** | **MEDIUM** — paralelní engagement mimo MIA |
| C6 | Comment | **Webhook → MIA** | HTTP POST | **UNKNOWN** — `/ingest` **not in Local Storage**; likely IndexedDB | **NO** (cílová cesta) — musí koexistovat bez C1/C2 |

**Event types enabled (activity feed checkboxes v profilu):** Chat, Gifts, Follow, Share, Subscribe, Joins, Envelope.

---

## ACTIVE GIFT ACTIONS

| # | TRIGGER | ACTION | OUTPUT | ACTIVE? | Kolize s MIA? |
|---|---------|--------|--------|---------|---------------|
| G1 | **Gift** | **`setting_broadcastgifts`** — gift broadcast catalog (Rose id `5655`, Blow a kiss, Love you so much, Dold Vitani, …) | TikFinity gift overlay / broadcast visuals | **CONFIGURED** (velký katalog) | **YES — LEGACY** — může duplikovat MIA tier video + gift overlay |
| G2 | Gift | **`ecboxresetgiftoverlayonnewstream: true`** | reset gift overlay each stream | **ON** | **LOW** |
| G3 | Gift | **Sound effects** (shared knihovna s Comment) | audio | **CONFIGURED** | **YES** pokud gift-triggered |
| G4 | Gift | **Webhook → MIA** | HTTP POST | **UNKNOWN** (IndexedDB) | **NO** (cíl) |
| G5 | Like bars | trigger `e7003c09-…` / `minBarsAmount` | like-goal / bars (ne gift) | **CONFIGURED** | **NO** (jiný event) |

**Poznámka:** Jednotlivé gift-specific Actions (Rose-only video/TTS v TikFinity) jsou v **IndexedDB** — ne automaticky vypínat; doma ověřit v Actions tab.

---

## WEBHOOK CONFIG

### A) Skutečný stav (PC3 live read)

| Pole | Hodnota | Stav |
|------|---------|------|
| **URL** | — | **UNKNOWN** — IndexedDB locked; Local Storage **bez** `/ingest` |
| **Method** | — | **UNKNOWN** |
| **Payload Comment** | — | **UNKNOWN** |
| **Payload Gift** | — | **UNKNOWN** |
| **Headers** | — | **UNKNOWN** (secret necommitovat) |
| **MIA očekávaný cíl (GENESIS)** | `http://<PC2-IP>:3000/ingest` | **NEZMĚNĚNO** — IP doma dle HOME plan |

### B) MIA-side očekávání (z repa — handler aliasy ekvivalentní)

| Položka | Hodnota |
|---------|---------|
| Kanonický endpoint | `POST/GET /ingest` |
| Aliasy (ekvivalentní handler) | `/tikfinity/webhook`, `/tikfinity/ingest`, `/tiktok/ingest` |
| Handler | `routes/ingest.js` → `handleIngest` |
| Auth | localhost open default; jinak `MIA_INGEST_SECRET` (`MIA_RUNTIME_SECURITY.js`) |
| Plánovaná multi-PC URL (doma doplnit IP) | `http://<PC2-IP>:3000/ingest` |

### C) COMMENT mapping (MIA normalizer — co MIA umí přijmout)

Typický TikFinity test payload z repa (`scripts/stream_validation_02_ingest_gate.js`):

| TikFinity pole | MIA použití |
|----------------|-------------|
| `value1` / `nickname` | display name |
| `value2` / `content` / `commandParams` | text komentáře |
| `username` / `tikfinityUsername` | user |
| `userId` / `tikfinityUserId` | user id (`2743946` v test skriptu = TikFinity channel id v testu, ne nutně produkce) |

**Poznámka:** skutečné mapování v TikFinity webhook builderu **musí** být screenshot/export z PC1.

### D) GIFT mapping (MIA normalizer — očekávaná pole)

| RAW (typicky) | MIA |
|---------------|-----|
| `giftName`, `giftId`, `gift` | `support.giftName`, `support.giftId` |
| `coins`, `diamondCount` | internal only — **ne na overlay** |
| `repeatCount`, `count` | combo/repeat |

---

## DOUBLE/CONFLICT RISKS

| ID | Riziko | Severity | Potvrzeno aktivní? | Důkaz na PC3 |
|----|--------|----------|--------------------|--------------|
| **D1** | `COMMENT → TikFinity TTS/Read Comments` **současně** s `COMMENT → /ingest → MIA TTS` | **DOUBLE TTS RISK — CURRENT ACTIVE (PC3)** | **ANO (PC3 profile + historical stream proof)** | `ttscomment` config active; triggerType `1` → action `14034216`; stream proof when MIA ingest down |
| **D2** | OBS `myactions` widget přehrává Actions audio paralelně k MIA | **HIGH (podezření)** | **ČÁSTEČNĚ** | Widget **enabled, not muted** v OBS backup |
| **D3** | `GIFT → TikFinity video/sound` paralelně k MIA gift pipeline | **MEDIUM–HIGH** | **NE — UNVERIFIED** | — |
| **D4** | Webhook na špatný host (localhost PC1 místo PC2) | **HIGH (infra)** | **NE — UNVERIFIED** | — |
| **D5** | Duplicitní webhook + alias volání | **LOW** | **NE — UNVERIFIED** | MIA dedupe 4.5s pokud stejný event |

### D1 — stav po PC3 read

**Potvrzeno historicky:** nezávislá větev fungovala při výpadku MIA ingest (stream audio).

**Potvrzeno na PC3 profilu (2026-08-13):** `ttscomment` block + Comment trigger wired → **CURRENT ACTIVE**.

**Disable:** **NEPROVEDENO automaticky** — vyžaduje ruční OFF v otevřeném TikFinity: **Setup → Text to Speech / Read Comments** (viz § DISABLE NOW — manual step).

**Doma:** po disable ověřit 1 comment → max **1** TTS (MIA only).

---

## LEGACY CANDIDATES

Položky **podezřelé** ze Shadow/Fold období — **NEMAZAT** bez domácího inventáře.

| ID | Položka | Typ | ACTIVE? | Proč LEGACY_CANDIDATE |
|----|---------|-----|---------|------------------------|
| L1 | OBS browser `tikfinity.zerody.one/widget/myactions?cid=2743946&screen=1` | OBS source | **ANO v backupu** | Staré Actions UI ve scéně; může duplikovat TTS/overlay |
| L2 | TikFinity „Read Comments“ / `ttscomment` | TikFinity built-in | **CURRENT ACTIVE (PC3)** | Provozně + storage důkaz |
| L3 | TikFinity local TTS (System voice / Edge v TF) | TikFinity Action | **UNKNOWN** | Paralelní k `MIA_TTS_ENGINE` |
| L4 | TikFinity gift video / fireworks | TikFinity Action | **UNKNOWN** | Paralelní k MIA `MIA_VIDEO_ENGINE` |
| L5 | Gift sound alerts v TikFinity | TikFinity Action | **UNKNOWN** | Paralelní k Koj/support audio |
| L6 | Fold-era remote monitoring | MIA `routes/remote_fold.js` | v repu | read-only snapshot — **ne TikFinity**, ale stejná éra |

### OBS widget — tvrdé údaje z backupu

Soubor: `_obs_scene_backups/SPINAK.backup-1782637686593.json`

| Vlastnost | Hodnota |
|-----------|---------|
| URL | `https://tikfinity.zerody.one/widget/myactions?cid=2743946&screen=1` |
| Scéna | `SPINAK_HLAVNI` (browser source item, visible) |
| Source enabled | `true` |
| Source muted | `false` |
| Volume | `1.0` |
| restart_when_active | `true` |

**Interpretace:** widget je připraven přijímat/spouštět Actions na obrazovce 1. **Neznamená to automaticky**, že konkrétní Comment/Gift Actions jsou ON — to je v TikFinity UI na PC1.

---

## KEEP FOR GENESIS

Princip: **TikFinity = sběr událostí / transport · MIA = rozhodování / TTS / reakce / overlay / video**

| Co ponechat (GENESIS) | Proč |
|-----------------------|------|
| TikFinity **Connect** k TikTok LIVE room | jediný oficiální ingress TikTok → PC |
| **Webhook** Comment + Gift → MIA `/ingest` | kanonická cesta do pipeline |
| Event types **Comment**, **Gift** (minimálně) | GP-S COMMENT + ROSE |
| Auth header k `/ingest` pokud `MIA_INGEST_SECRET` | LAN bezpečnost multi-PC |
| Jedna webhook URL na PC2 (ne localhost PC1) | HOME krok 7 |

---

## DISABLE CANDIDATES

| ID | Kandidát | Stav PC3 | Poznámka |
|----|----------|----------|----------|
| X1 | Comment **Read Text / TTS** (`ttscomment`) | **MĚLO BÝT DISABLED — ručně** | Cursor nemůže kliknout v Electron app; viz manual step níže |
| X2 | Comment Action `14034216` | **NE** — nejdřív identifikovat typ v Actions tab | |
| X3 | GIFT `setting_broadcastgifts` overlay | **NE** — nejdřív inventář | může duplikovat MIA |
| X4 | OBS **myactions** widget | **NE** — OBS out of scope | mute až doma |
| X5 | Gift sounds | **NE** | po Rose testu |

### DISABLE NOW — manual step (≈30 s v otevřeném TikFinity na PC3)

> **Cursor to neprovedl** — Electron UI není dostupné pro automation. Udělej teď v otevřené app:

1. TikFinity → **Setup** (nebo **Chat** / **Text to Speech**)
2. Najdi **Read Comments / Read Chat / Text-to-Speech** master toggle
3. **OFF** (disable, **nemaž** action)
4. **Actions** tab → Comment trigger → Action `14034216` → ověř typ; pokud TTS/Read Text → **OFF**
5. **Neukládej webhook URL** — IP necháme na domácí PC2 lock
6. Screenshot **před/po** pro rollback

---

## NEEDS PC1/PC2 HOME CONFIG

| # | Co | Proč ještě potřeba |
|---|-----|-------------------|
| 1 | **Webhook URL** → `http://<PC2-IP>:3000/ingest` | IndexedDB nečitelné za běhu; IP nezměněna z notebooku |
| 2 | **Webhook payload** screenshot (Comment + Gift) | Local Storage bez `/ingest` |
| 3 | **Action `14034216`** — název a typ v UI | ID only z storage |
| 4 | **IndexedDB export** — zavřít TikFinity → znovu otevřít na PC1 → screenshot Actions + Webhook | full inventory |
| 5 | **Live test** comment + Rose po síti PASS | ověřit single TTS + ingest log |
| 6 | **OBS widget** mute/hide test | paralelně k Actions cleanup |

---

## MINIMAL GENESIS TikFinity konfigurace (návrh — NEAPLIKOVAT)

Cílový stav po domácím PASS kroku 7:

```text
TikTok LIVE
    │
    └─► TikFinity (PC1)
            │
            ├─► [OFF / disabled] Comment Read Text, local TTS, Play Sound, gift video/sound
            ├─► [OFF / muted]    OBS myactions widget (pokud duplikuje)
            │
            └─► [ON]  Webhook POST → http://<PC2-IP>:3000/ingest
                      Events: Comment + Gift
                      (+ secret header pokud MIA_INGEST_SECRET)
                            │
                            └─► MIA (PC2)
                                  decision → TTS → overlay → tier video
```

### Minimální povolená TikFinity aktivita

| Vrstva | TikFinity | MIA |
|--------|-----------|-----|
| Ingress | Connect + receive events | — |
| Transport | Webhook HTTP | `/ingest` auth + queue |
| Comment reakce | **žádná** local TTS/sound | shadow + TTS + overlay |
| Gift reakce | **žádné** local video/sound | support pipeline + Koj + video slots |
| Vizualizace | **ne** gift overlay s coins | miaPoints overlay only |

### Co z LEGACY může zůstat (úmyslně)

- Widget **jen** pro monitoring Actions stavu (muted, hidden) — pokud tým chce vizuální debug  
- Vybrané **ne-TTS** TikFinity efekty, které MIA nemá (explicitně označit KEEP v inventáři)  
- Cooldown/filtry v TikFinity **před** webhookem — pouze pokud neblokují GP-S testy

---

## Shrnutí pro operátora

1. **PC3 TikFinity = stejný kanál `2743946` / `vaclavvrtyland`** jako OBS widget — ne izolovaná instalace.  
2. **D1 = CURRENT ACTIVE** — `ttscomment` + Comment trigger; historický stream proof stále platí.  
3. **Webhook target UNKNOWN** — IndexedDB locked; **IP nezměněna**.  
4. **DISABLE Read Comments:** Cursor **neprovedl** — udělej manual step v otevřené app (≈30 s).  
5. **Gift broadcast catalog** — KEEP inventory, nevypínat naslepo.  
6. **STOP** — žádný další audit; doma jen HOME plan krok 7+.

---

## VÝSTUP — požadovaný formát

### COMMENT ACTIONS

| TRIGGER | ACTION | OUTPUT | ACTIVE? | Kolize? |
|---------|--------|--------|---------|---------|
| Comment (triggerType 1) | Action `14034216` | UNKNOWN | LIKELY ON | UNKNOWN |
| Comment | `ttscomment` Read Comments TTS | audio (cs-CZ, google_female) | **ON (PC3)** | **YES** |
| Comment | Sound library (myinstants) | audio | CONFIGURED | YES if wired |
| Comment | Chat filters / !commands | filter / game | CONFIGURED | MEDIUM |
| Comment | Webhook → MIA | HTTP | UNKNOWN (IndexedDB) | NO |

### GIFT ACTIONS

| TRIGGER | ACTION | OUTPUT | ACTIVE? | Kolize? |
|---------|--------|--------|---------|---------|
| Gift | `setting_broadcastgifts` catalog | TikFinity overlay | CONFIGURED | **YES — LEGACY** |
| Gift | reset overlay on new stream | overlay reset | ON | LOW |
| Gift | Sounds (shared) | audio | CONFIGURED | YES if wired |
| Gift | Webhook → MIA | HTTP | UNKNOWN | NO |

### READ COMMENTS/TTS = ON/OFF

**ON (PC3 evidence)** — `ttscomment` konfigurace aktivní; **automaticky DISABLED: NE** (manual step required).

### WEBHOOK CURRENT TARGET

**UNKNOWN** — `/ingest` not found in Local Storage; full config in locked IndexedDB. **Not changed.**

### DISABLED NOW

- **Nic** automaticky z Cursoru.
- **Pending manual:** `ttscomment` / Read Comments master toggle → OFF.
- **Pending manual:** Action `14034216` — identify + OFF if TTS/sound.

### KEPT

- Webhook (whatever target is — transport to MIA).
- TikFinity Connect / event ingress (Chat, Gift, …).
- Gift catalog inventory (disable až po domácím review).
- Custom chat commands / overlays (non-TTS) — review later.
- OBS widget — untouched (OBS out of scope).

### NEEDS PC1/PC2 HOME CONFIG

- Webhook URL → PC2 IP + `/ingest`
- Webhook payload + headers (redacted)
- Action `14034216` human name + type
- IndexedDB Actions full list (app closed → read or screenshot)
- Live comment/Rose golden path test

**Žádná změna OBS, MIA runtime, sítě. Webhook IP nezměněna.**
