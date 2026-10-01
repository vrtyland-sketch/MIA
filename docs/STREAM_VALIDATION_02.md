# STREAM_VALIDATION_02

**Status:** **FAIL** (2026-08-06 08:47–08:50 CET)  
**Účel:** krátký ověřovací stream (**10–15 minut**), **ne** zábava / nové funkce  
**Závislost:** FIRST LIVE STREAM = NO GO → recovery OPEN  
**Evidence:** [`docs/STREAM_VALIDATION_02_EVIDENCE.jsonl`](./STREAM_VALIDATION_02_EVIDENCE.jsonl)  
**Monitor:** `node scripts/stream_validation_02.js`

Po úspěchu tohoto dokumentu teprve uvolnit feature freeze a vývoj nových funkcí.

---

## Scope (pouze toto)

Potvrdit základní live řetězec:

```text
COMMENT → INGEST → DECISION → OVERLAY → TTS → LOG
(+ jeden GIFT stejnou cestou)
```

**Mimo scope:** nové hry, grafiky, AI, GENESIS změny, video tuning, Kick/Twitch (kromě „neblokuje MIA“).

---

## Před startem (musí být hotové z RECOVERY_01)

- [ ] P0: RAM/watchdog stabilní v kontrolním běhu (žádný `timeout`/`recover`)  
- [ ] P1: TikFinity → `http://127.0.0.1:3000/ingest` ověřeno lokálním testem  
- [ ] P2: Program scéna = scéna s MIA browser vrstvami  
- [ ] P3: hlavní HTML overlaye (speech, koj runtime, bowl, gift) čitelné na Program  

**Stav před během 2026-08-06:** P0 **FAIL** (RAM), P1 **NOT PROVEN** (žádný ingest dnes), P2/P3 neauditováno v tomto běhu.

---

## Běh 2026-08-06 — STREAM_RECOVERY_01 VALIDATION

### RAM měření

| Fáze | Volná RAM | Poznámka |
|------|-----------|----------|
| **Před TikTok LIVE Studio** | **0,27 GB** | Po nočním úklidu procesů |
| **+15 s po startu Studia** | **0,43 GB** | Studio ~163 MB (1 proces) |
| **+90 s (monitor t10)** | odhad **&lt;0,5 GB** | Studio **6 procesů, ~972 MB** |
| **+90 s (monitor t11)** | kritické | Studio **~1126 MB**, MIA `/health` **timeout 6 s** |
| **Po monitoru (now)** | **0,11–0,28 GB** | Studio ~875 MB + Cursor ~817 MB + OBS ~143 MB |

**Závěr P0:** TikTok LIVE Studio na 6 GB RAM **nestabilizuje** prostředí. Volná RAM **nikdy** nedosáhla cíle 1,5–2 GB; po plném načtení Studia spadla pod **500 MB** a MIA health začalo timeoutovat.

### TikTok LIVE Studio

- Spuštěno: `C:\Program Files\TikTok LIVE Studio\TikTok LIVE Studio Launcher.exe`
- Detekováno monitoru: tick 7 (~68 MB) → tick 11 (~1126 MB, 6 procesů)
- Watchdog složka `%APPDATA%\TikTok LIVE Studio\watch_dog\` — prázdná / bez nových reportů v tomto okně

### MIA / ingest

| Kontrola | Výsledek |
|----------|----------|
| `/health` ok | ✅ (do ~t10; poté timeout pod zátěží) |
| `obsConnected` | ✅ |
| `lastIngest` | ❌ **null** (po restartu MIA ráno) |
| `logs/ingest-2026-08-06.jsonl` | ❌ **neexistuje** |
| TikFinity test comment | ❌ **neprovedeno** (Studio + RAM prioritizace) |
| COMMENT → DECISION → OVERLAY → TTS | ❌ **neověřeno** |

Poslední známý ingest (včera): test GIFT Rose + test COMMENT v `ingest-2026-08-05.jsonl` — **ne live dnešní session**.

---

## PASS kritéria (vše musí platit)

| Krok | Kritérium | Důkaz | Výsledek |
|------|-----------|--------|----------|
| COMMENT | dorazí do MIA | ingest + `/health` | ❌ FAIL |
| INGEST | `eventType=COMMENT`, platform tiktok | ingest řádek | ❌ FAIL |
| DECISION | MIA zpracuje | mia-events | ❌ NOT PROVEN |
| OVERLAY | vidět na Program | vizuál | ❌ NOT PROVEN |
| TTS | reakce na komentář | `tts_speak` | ❌ NOT PROVEN |
| LOG | kompletní stopa | ingest + events | ❌ FAIL |
| GIFT | reálný gift | ingest GIFT | ❌ NOT PROVEN |
| STABILITY | Studio bez hang | RAM ≥1,5 GB, health &lt;2 s | ❌ **FAIL** |

---

## FAIL → zpět na RECOVERY_01

**Selhalo:** P0 (RAM/Stability) + P1 (ingest) + celý validation řetězec.

1. ✅ FAIL zapsán (2026-08-06).  
2. **Feature freeze zůstává ON.**  
3. Návrat na **PRIORITA 0** v [`STREAM_RECOVERY_01`](./STREAM_RECOVERY_01.md).  
4. `STREAM_VALIDATION_02` = **FAIL** (ne PASS).

---

## Výsledek (vyplněno po běhu)

```text
STREAM_VALIDATION_02 = FAIL
Datum: 2026-08-06
Operator: Cursor (automatický monitor) + uživatel (postup schválen)
Program scéna: neauditováno (OBS běželo, scéna nezapsána)
lastIngest user / type: null / —
tts_speak na COMMENT: NE
overlay na Program: NE (neověřeno)
watchdog timeout v okně: NE (složka prázdná); MIA health timeout ANO (~6 s při Studio ~1,1 GB)
```

**STREAM_RECOVERY_01 → zůstává OPEN** (validation neprošla).

---

## Doporučený postup před dalším pokusem

1. **Zavřít přebytečná okna Cursoru** (teď ~800–1100 MB).  
2. **Restart OBS** (uvolní ~40 browser sources / ~700 MB CEF) — jen pokud máš scénu uloženou.  
3. Cílit na **≥1,5 GB volné RAM** *před* startem TikTok LIVE Studio.  
4. Spustit OBS → Studio → TikFinity → **jeden reálný comment**.  
5. Ověřit `lastIngest` na `/health`.  
6. Teprve pak znovu `node scripts/stream_validation_02.js --duration=300`.

**Hardware limit:** notebook ~6 GB RAM — TikTok Studio (~1 GB+) + OBS browser sources (~700 MB) + Cursor (~1 GB) = stream na hraně i při úklidu. Pro stabilní ostrý stream zvažovat **8 GB+ RAM** nebo stream bez Cursoru/Studio současně.

---

## INGEST GATE (2026-08-06 09:12 CET)

**Cíl:** ověřit ingest **nezávisle na overlayích** — funguje TikFinity → MIA, nebo ne?

**Monitor:** `node scripts/stream_validation_02_ingest_gate.js`  
**Evidence:** [`docs/STREAM_VALIDATION_02_INGEST_GATE.jsonl`](./STREAM_VALIDATION_02_INGEST_GATE.jsonl)

### Prostředí v okamžiku testu

| Služba | Stav |
|--------|------|
| OBS | ✅ běží, `obsConnected: true` |
| MIA | ✅ po restartu (health **134 ms**; před restartem timeout při RAM **0,06 GB**) |
| TikTok LIVE Studio | ✅ běží (~7 procesů) |
| Program scéna | `SPINAK_ENGINE_GIFTS` (z mia-events) |
| TikFinity UI test comment | ❌ **neprovedeno operátorem** |

### Výsledek — dvě vrstvy

| Vrstva | Verdikt | Důkaz |
|--------|---------|--------|
| **A: MIA `/ingest` endpoint** | ✅ **PASS** | Lokální POST (TikFinity-shaped COMMENT) → HTTP 200, `queued`, `lastIngest` aktualizován |
| **B: TikFinity → MIA (live webhook)** | ❌ **FAIL / NOT PROVEN** | Žádný ingest z TikFinity UI; pouze control POST z Cursoru |

### Záznam po PASS vrstvě A

```json
lastIngest: {
  "source": "tikfinity",
  "eventType": "COMMENT",
  "platform": "tiktok",
  "user": "Test User 123",
  "message": "INGEST_GATE test comment",
  "atIso": "2026-08-06T07:12:55.284Z"
}
```

`logs/ingest-2026-08-06.jsonl` — 1 řádek, `eventType=COMMENT`, `lane=community`.

### Interpretace

> **MIA ingest funguje.** Když payload dorazí na `http://127.0.0.1:3000/ingest`, `lastIngest` se aktualizuje a log se zapíše.  
> **Neověřené zůstává:** doručení z **TikFinity** (webhook URL, port, live room, prohlížeč).

Pokud operátor pošle TikFinity test comment a `lastIngest` **zůstane starý** (INGEST_GATE test) → problém je **mezi TikFinity a MIA**, ne v AI/overlayích.

### Jediný zbývající manuální krok

1. Otevři TikFinity → webhook `http://127.0.0.1:3000/ingest`  
2. Připoj live TikTok room  
3. Pošli **1 test comment** (TikFinity test tlačítko)  
4. Ověř `/health` — `lastIngest` musí být **novější** než `07:12:55` a message ≠ `INGEST_GATE test comment`

Nebo spusť watch režim:

```bash
node scripts/stream_validation_02_ingest_gate.js --watch=120
```

(pak pošli TikFinity test comment během 120 s)

**STREAM_VALIDATION_02 celkově:** stále **FAIL** (TikFinity live + plný stream řetězec).  
**STREAM_RECOVERY_01:** stále **OPEN**; P1 částečně zelená (MIA endpoint), TikFinity UI červená.

---

## FINAL GATE (uzavření poslední mezery)

**Status:** **FAIL_B_STABILITY** — běh 2026-08-06 **INVALIDATED** (neplatný pro clean PASS)  
**Monitor:** `node scripts/stream_validation_02_final_gate.js`  
**Evidence:** [`docs/STREAM_VALIDATION_02_FINAL_GATE.jsonl`](./STREAM_VALIDATION_02_FINAL_GATE.jsonl)

### Běh 2026-08-06 — INVALIDATED (~3 min, přerušeno)

| Položka | Hodnota |
|---------|---------|
| **Monitor start (UTC)** | `2026-08-06T07:30:39Z` → **09:30:39 lokální (+02:00)** |
| **Baseline RAM** | **204,9 MB** (~0,2 GB) — PowerShell před tím ~**0,08 GB** |
| **Baseline `/health`** | **timeout 8052 ms** → **B nezačala ve zdravém stavu** |
| **TikFinity během běhu** | ✅ COMMENT + GIFT (`This is a Test`, Rose) @ 07:31 UTC — **webhook funguje** |
| **Health latence tick 1–3** | 4058 / 6423 / 5712 ms (pomalé, ne vždy timeout) |
| **Rescue během běhu** | ❌ žádný (správně — restart OBS by test znehodnotil) |
| **Verdikt** | **FAIL_B_STABILITY** — nelze uzavřít RECOVERY; běh **neplatný pro PASS** |

> I kdyby TikFinity comment dorazil (dorazil), tento běh **nemůže čistě prokázat PASS** kvůli baseline timeoutu a RAM na hraně.

**Čas:** monitor zapisuje **UTC** (`Z`); lokální čas = UTC + 2 h (CEST).

### Co už **netestovat**

- ❌ přepis MIA / nové funkce  
- ❌ AI pipeline (pro ingest OK — viz INGEST GATE)  
- ❌ overlaye (bez důkazu chyby)

### Acceptance criteria — tvrdý PASS (GO)

Všechno musí platit **současně** po celých **15 minut**. „Nějak to běželo“ ≠ PASS.

**A) TikFinity → MIA (uptime + obsah)**

- [ ] **15 min bez pádu / odpojení TikFinity** (ingest uptime prakticky **100 %** v testovacím okně)  
- [ ] **Několik reálných COMMENT** (ne jen `Test User 123`; viewer ≠ audit/control)  
- [ ] **Alespoň 1 reálný GIFT**  
- [ ] Každý event: řádek v `logs/ingest-YYYY-MM-DD.jsonl` + `lastIngest` aktualizován  
- [ ] **Žádný restart** OBS / TikFinity / MIA během testu  

**B) Runtime stability**

- [ ] **Žádný `/health` timeout** po celých 15 min  
- [ ] OBS `obsConnected: true` po celou dobu  
- [ ] TikTok Studio watchdog bez nových timeout/recover reportů  
- [ ] **RAM před startem:** ideál **≥1,5–2 GB** volné; **≥0,8 GB jen nouzové minimum** (ne cíl)  
- [ ] **Hard STOP před startem:** volná RAM **&lt;~0,1 GB**  

**C) Viditelnost a slyšitelnost (operátor potvrzuje na TikTok výstupu)**

- [ ] Gift **video viditelné** ve výsledném TikTok obrazu (ne jen `video_playback_started` v logu)  
- [ ] **TTS slyšitelné** ve výsledném streamu (ne jen `tts_speak` v logu)  
- [ ] Overlay reakce na comment **viditelné** na Program / ve streamu  

**D) Pipeline (log důkaz)**

- [ ] Alespoň 1× COMMENT → DECISION → OVERLAY → TTS v `mia-events`  
- [ ] Alespoň 1× GIFT → video playback v `mia-events`  

### Decision

| Výsledek | Verdikt | Akce |
|----------|---------|------|
| **A + B + C + D** | **PASS → GO** | `STREAM_RECOVERY_01` → **CLOSED**, feature freeze OFF |
| A fail (výpadek TikFinity / málo live eventů) | **FAIL_A_TIKFINITY** | TikFinity room, crash, filtry; pak GENESIS startup jen pokud padá i s RAM |
| B fail | **FAIL_B_STABILITY** | RAM / Studio / health |
| A+B ok, C fail | **FAIL_C_OUTPUT** | OBS Program, vrstvy, audio routing — log OK, divák nevidí/slyší |
| Log OK, bez TTS/video ve streamu | **PARTIAL_PASS** | RECOVERY OPEN |

### Postup operátora (minimum)

1. Uvolnit RAM — **cíl 1,5–2 GB+** volné před live; **≥0,8 GB jen nouzově**; **nestartovat** pod ~**0,1 GB**  
2. Spustit OBS → TikTok LIVE Studio → TikFinity (`http://127.0.0.1:3000/ingest`) → **Connect na live room**  
3. Ověřit `/health` **&lt; 2 s** před startem monitoru  
4. V terminálu:

```bash
node scripts/stream_validation_02_final_gate.js --duration=900 --interval=10
```

5. Během běhu: **několik reálných commentů** z live chatu + **≥1 gift**; **nesahat** na restart OBS/TikFinity/MIA  
6. Po skončení: `SUMMARY` v evidence JSONL **+ operátorské potvrzení C** (vidím video, slyším TTS ve TikTok streamu)  
7. Teprve pak **GO**

### Aktuální odhad (2026-08-06)

| Vrstva | Stav |
|--------|------|
| MIA interní ingest | ✅ ~95 % potvrzeno |
| TikFinity webhook | ✅ **funguje** (test comment/gift během invalidated run) |
| RAM / stabilita | ❌ baseline timeout → **nový běh až po uvolnění RAM** |

**Uzavření recovery:** teprve po **PASS** FINAL GATE (A + B).

---

## Po PASS (až jednou projde)

- `STREAM_RECOVERY_01` → CLOSED  
- Feature freeze → OFF  
- Vývoj nových funkcí povolen  
