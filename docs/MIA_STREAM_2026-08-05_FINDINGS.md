# MIA First Live Stream Findings — 2026-08-05

**Checkpoint:** `STREAM_RECOVERY_01` (**jediná aktivní priorita**; feature freeze ON)  
**Verdikt:** `FIRST LIVE STREAM = NO GO`  
**Status recovery:** `STREAM_RECOVERY_01 = OPEN`  
**Další brána:** [`docs/STREAM_VALIDATION_02.md`](./STREAM_VALIDATION_02.md) (až po opravách)  
**Aktualizace:** 2026-08-05 (diagnostické běhy TikTok LIVE Studio + MIA logy; uzavření prvního streamu)

---

## 1. Shrnutí

První ostrý stream **není GO**. MIA runtime, OBS připojení, GENESIS demo, video playback a TTS engine běžely. **Neproběhla komunikace s živými diváky.**

Problém má **nejméně tři samostatné vrstvy**:

| Vrstva | Stav |
|--------|------|
| A. Live data (TikTok / Kick / Twitch → MIA) | FAIL / NOT PROVEN |
| B. OBS scény + HTML velikost/rozlišení | FAIL |
| C. Stabilita TikTok LIVE Studio (RAM / watchdog) | FAIL |

Memory pressure a watchdog hang jsou **potvrzený destabilizační faktor**.  
**Přímá kauzalita „málo RAM → žádný ingest“ = NOT PROVEN** — reálný TikTok COMMENT/GIFT do MIA nedorazil ani mimo okamžiky hangů (jen TikFinity test payloady).

---

## 2. Fakta z MIA logů

Zdroje: `logs/ingest-2026-08-05.jsonl`, `logs/mia-events-2026-08-05.jsonl`, `logs/gift-mapping-2026-08-05.jsonl`, `/health` (večer 2026-08-05).

| Položka | Hodnota |
|---------|---------|
| Ingest events | **20** |
| Uživatelé | **pouze `Test User 123`** |
| Reálný viewer | **0** |
| COMMENT | 9 (vše test) |
| GIFT | 11 (Rose test map) |
| První ingest | `2026-08-05T17:35:26.701Z` (19:35 CEST) |
| Poslední ingest | `2026-08-05T18:53:15.278Z` (20:53 CEST) |
| `lastIngest` | tikfinity / COMMENT / Test User 123 / „This is a Test“ |
| Kick bridge | start OK, **žádný live chat ingest** |
| Twitch EventSub | **401 Invalid OAuth token** |
| TTS | ~164× (`mia` dominantně) — idle/ambient |
| Vision / eyes | tisíce ticků — runtime živý |
| Watchdog MIA | `ingestStale: true` od ~19:42 CEST (mezery v testech) dál |

**Důkaz reálného ingestu:** **žádný.**  
Cesta **TikFinity → `POST /ingest` → MIA funguje** (test tlačítko dorazilo). Selhalo: **živý TikTok room → TikFinity → MIA**.

---

## 3. Co bylo vidět na streamu (operátor)

- GENESIS demo: fungovalo  
- Videa: velikost i přehrávání OK (**neměnit**)  
- HTML overlaye: moc velké / špatné rozlišení  
- Program scéna často `MIA_GENESIS` nebo `SPINAK_HLAVNI`; MIA browser vrstvy hlavně na `SPINAK_ENGINE_GIFTS`  
- MIA „jako živá“ (HTML + TTS), ale **bez reakcí na diváky**

---

## 4. PASS / FAIL / NOT PROVEN

```text
MIA RUNTIME                         = PASS
OBS CONNECTION                      = PASS
GENESIS DEMO                        = PASS
VIDEO PLAYBACK                      = PASS
VIDEO SIZE / POSITION               = PASS

TIKTOK LIVE INGEST                  = FAIL
TIKTOK COMMENT (reálný)             = FAIL
TIKTOK GIFT (reálný)                = FAIL
KICK LIVE INGEST                    = NOT PROVEN
TWITCH INGEST                       = FAIL – 401 OAUTH
LIVE VIEWER REACTIONS               = FAIL

TTS ENGINE                          = PASS
TTS REACTION TO VIEWERS             = FAIL / NOT PROVEN

HTML OVERLAY RESOLUTION             = FAIL
HTML OVERLAY SIZE/POSITION          = FAIL
OVERLAYS ON PROGRAM SCENE           = FAIL

TIKTOK LIVE STUDIO STABILITY        = FAIL
TIKTOK LIVE STUDIO WATCHDOG         = FAIL
SYSTEM MEMORY PRESSURE              = FAIL
OTHER APPS MEMORY PRESSURE          = FAIL
PŘÍMÁ KAUZALITA MEMORY → INGEST     = NOT PROVEN

FIRST LIVE STREAM VERDICT           = NO GO
STREAM_RECOVERY_01                  = OPEN
```

---

## 5. Root-cause větve (oddělené)

### 5.1 Live ingest / platformy

- TikTok: FAIL — žádný reálný COMMENT/GIFT v MIA  
- TikFinity webhook cesta k MIA: technicky PASS pro **test** payload  
- Twitch: FAIL — OAuth 401  
- Kick: NOT PROVEN  

### 5.2 OBS scény + HTML

- Program ≠ scéna s MIA browser sources  
- HTML rozlišení / scale / ořez FAIL (viz §7–8)  
- Videa a GENESIS: mimo scope oprav do dokončení auditu HTML  

### 5.3 TikTok LIVE Studio stability = FAIL *(nová větev)*

Samostatná od ingest/webhook, OBS visibility, HTML resolution, Twitch OAuth, Kick.

Důkazy (původní soubory na disku — **ne** smazané kopie z repa):

| Důkaz | Detail |
|-------|--------|
| Watchdog hang | `timeout` + `recover` |
| Memory | `SYSTEM_MEMORY_USAGE_TOO_HIGH` |
| Memory | `OTHER_APPS_MEMORY_USAGE_TOO_HIGH` |
| Codec | jen soft `ByteVC0`/`ByteVC1` (`hardware: false`) |
| Hardware tip | `hardwareLevel` Z; doporučení max ~720p30 |

---

## 6. RESOURCE PRESSURE / LIVE STUDIO STABILITY

### 6.1 Watchdog timeout / recover (původní reporty)

**Zdroj (stále na PC):**  
`%APPDATA%\TikTok LIVE Studio\watch_dog\`

| Report | Čas reportu | Událost | Komponenta | Čas události (CEST) | Poznámka |
|--------|-------------|---------|------------|---------------------|----------|
| `2026-08-05-21-44-09-772\report.json` | 21:44:09 | `start` | — | 21:42:34 | watchdog start |
| stejný | | `init` | `WIN_SERVICE` | 21:43:30 | timeout lim 15s |
| stejný | | `init` | `PageMain` | 21:43:36 | timeout lim 15s |
| stejný | | **`timeout`** | `PageMain` | **21:43:52** | duration ~15346 ms |
| stejný | | **`timeout`** | `WIN_SERVICE` | **21:43:52** | duration ~15137 ms |
| stejný | | **`recover`** | `WIN_SERVICE` | **21:44:09** | |
| stejný | | **`recover`** | `PageMain` | **21:44:09** | |
| `2026-08-05-21-44-09-628\report.json` | 21:44:09 | stejný průběh | `WIN_SERVICE` recover 21:44:09 | sourozenecký report |

Dříve během diagnostiky byly vidět i adresáře `watch_dog\2026-08-05-21-15-21-*` (kolem **21:15**). Client/server logy `1.32.4-2026-08-05_20_59_04-*` měly `LastWriteTime` ~**21:15:20–21:15:34** — konzistentní s hang/restart oknem.  
Hard crash dump z 5. 8. **nebyl** (dumpy v `crash_dump\` jsou starší, např. 2026-06).

### 6.2 RAM / procesy z logu Studio

Z `%APPDATA%\TikTok LIVE Studio\logs\LS-main.2026-08-05.log` (GMT+2):

| Čas (CEST) | Záznam |
|------------|--------|
| ~21:06:20 | `goLiveDiagnosis` → `OTHER_APPS_MEMORY_USAGE_TOO_HIGH`; `systemMemoryUsage ≈ 0.97046` (~**97 %**); limit `system_memory_usage_limit: 0.97` |
| ~21:06:20+ | tipy: `CLOSE_OTHER_APP_SAVE_SYSTEM_RESOURCE`, `CHANGE_OTHER_APP_SETTING_SAVE_SYSTEM_RESOURCE` |
| ~21:06:20 | `appMemory ≈ 755 MB` (Studio app); soft encoders only |
| ~21:08:55 | `livingDiagnosis`: `exceptionList: ['SYSTEM_MEMORY_USAGE_TOO_HIGH']`, `hasSystemLoadIssue: true`, `diagnosisIssueList: ['OTHER_APPS_MEMORY_USAGE_TOO_HIGH']` |
| ~21:10:55 | stejná diagnóza opakovaně |
| ~21:12:58 | stejná diagnóza během live (`streamId` v RTMP/ABR callbackách) |

**Největší procesy:** Studio log neuvádí pojmenovaný žebříček „top processes“ — jen agregát `OTHER_APPS_MEMORY_USAGE_TOO_HIGH` + vlastní `appMemory`.  
Během večerní diagnostiky na PC běžely mimo jiné: **OBS** (dlouhodobě), **TikFinity** (od ~19:34), **MIA node**, mnoho **obs-browser-page**.

### 6.3 Časová osa vs ingest

| Čas (CEST) | Událost |
|------------|---------|
| 19:34 | TikFinity procesy start |
| 19:35–20:53 | **pouze** Test User ingest do MIA (20 eventů) |
| ~19:42+ | MIA `ingestStale` (mezery i mezi testy) |
| ~21:06–21:12 | Live Studio: memory pressure + livingDiagnosis během streamu |
| ~21:15 | client/server log cut / dřívější watchdog adresáře |
| 21:42–21:44 | watchdog `timeout` → `recover` (PageMain / WIN_SERVICE) |

**Určení:**

1. **Chybějící reálný ingest** (žádný divák) je prokázán **před** večerními watchdog hangy — celý den jen testy.  
2. Memory pressure / hangy nastaly **během večerního live okna Studio** (~21:06+) a **po** posledním test ingestu (20:53).  
3. Memory pressure = **potvrzený destabilizační faktor** (Studio nestabilní, hang, soft encode).  
4. **Nepovažovat** automaticky memory za **jedinou** příčinu chybějícího ingestu → v tabulce: **Přímá kauzalita memory → ingest = NOT PROVEN**.

### 6.4 Dočasné kopie reportů v repu

Během diagnostiky byly watchdog JSON krátce zkopírovány do workspace (`.tmp-ttls-watchdog-*.json`) a **následně smazány**.

- Smazáním **nebyly** ztraceny jediné důkazy.  
- Originály zůstávají v:  
  `%APPDATA%\TikTok LIVE Studio\watch_dog\2026-08-05-21-44-09-*\report.json`  
  a v `LS-main.2026-08-05.log`.  
- Závěry v tomto dokumentu jsou z **původních logů / přímého parse originálů**, ne z dočasných kopií.

---

## 7. Mapa OBS scén

| Scéna | Role při streamu (z `mia_eyes_scan`) | `visibleOnGiftScene` typicky |
|-------|--------------------------------------|------------------------------|
| `SPINAK_ENGINE_GIFTS` | Kanonická scéna MIA browser vrstev (`DEFAULT_SCENE` v manifestu) | často 1 (občas 0/2) |
| `MIA_GENESIS` | hodně času na Program | 0 |
| `SPINAK_HLAVNI` | často na Program | 0 |

**Návrh jedné ostré Program scény (recovery — návrh, ne implementace):**  
kamera + videa + speech + gift overlays + bowl + chat feed + Koj runtime + nutné MIA vrstvy = sladit Program s `SPINAK_ENGINE_GIFTS` (nebo ekvivalent s kompletním setem zdrojů).

---

## 8. HTML Browser Sources — auditní seznam (FAIL)

Z `scripts/MIA_OBS_LIVE_MANIFEST.js` (cílové W×H) + operátorské FAIL velikosti:

| OBS input (kanon) | Soubor | Manifest W×H | Stav 5. 8. |
|-------------------|--------|--------------|------------|
| `MIA_KOJ_RUNTIME` | `kojnozrout-runtime.html` | 400×400 | FAIL size/resolution (operátor) |
| `MIA_SPEECH` / aliasy | `speech-overlay.html` | (manifest) | FAIL na Program / size |
| `MIA_BOWL` | bowl overlay | 320×240 | FAIL pokud mimo Program |
| `MIA_GIFT_ANIMATION` | `gift-animation-overlay.html` | 1920×1080 | FAIL size (cast příliš velký — částečně řešeno layout knoby mimo tento checkpoint scope) |
| `MIA_COMBO` | `combo-overlay.html` | 1920×1080 | moment |
| `MIA_VIEWER_STRIP` | viewer strip | 720×120 | ověřit na Program |
| Genesis overlays | `genesis-overlay.html` 1080×1920 fixed | PASS demo | **neměnit** do konce HTML auditu |
| Gift **videa** | OBS media | — | **PASS — neměnit** |

Plný řádek-za-řádkem OBS transform audit (viewport vs scale vs crop) = úkol recovery P3, ne hotový diff.

---

## 9. Checklist pro druhý stream (GO podmínky)

GO pouze když **vše** projde:

1. Reálný TikTok **COMMENT** v `ingest-*.jsonl` / `lastIngest.user` ≠ Test User  
2. Reálný TikTok **GIFT** stejně  
3. MIA na komentář **odpoví**  
4. **TTS** zazní na tu reakci  
5. Odpověď vidět na **Program** scéně  
6. Hlavní HTML overlaye mají správnou velikost/rozlišení  

---

## 10. Předstreamový stabilizační checklist (bez nových funkcí)

1. Restart PC před streamem  
2. Zavřít nepotřebné aplikace (Chrome taby, editory, zbytečné nástroje)  
3. Změřit RAM **před** OBS  
4. Změřit RAM **po** startu OBS  
5. Změřit RAM **po** startu TikTok LIVE Studio  
6. Spustit MIA  
7. Sledovat Studio watchdog během kontrolního běhu  
8. Ověřit, že **nevzniká** `timeout` / `recover`  
9. Teprve potom testovat reálný TikTok COMMENT a GIFT  

Doporučení (ops, ne kód): 720p30 pokud HW encoder chybí; držet systémovou RAM výrazně pod ~97 %.

---

## 11. Odkazy

- Checkpoint recovery (freeze ON): [`docs/STREAM_RECOVERY_01.md`](./STREAM_RECOVERY_01.md)  
- Ověřovací stream po opravách: [`docs/STREAM_VALIDATION_02.md`](./STREAM_VALIDATION_02.md)  
- Originální Studio logy: `%APPDATA%\TikTok LIVE Studio\logs\`  
- Originální watchdog: `%APPDATA%\TikTok LIVE Studio\watch_dog\`  
- MIA: `logs/ingest-2026-08-05.jsonl`, `logs/mia-events-2026-08-05.jsonl`

---

**FIRST LIVE STREAM = NO GO**  
**STREAM_RECOVERY_01 = OPEN** (jediná aktivní priorita)  
**STREAM_VALIDATION_02 = PLANNED**  
**Feature freeze = ON** do PASS validation
