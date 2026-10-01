# FIRST LIVE OBSERVATION — TikTok (ostrý stream)

**Režim:** OBSERVE ONLY — žádné automatické opravy, žádný commit/push, žádná změna YT/Twitch/Kick/OBS config, žádné OBS Start Streaming.

**Session start (Cursor arm):** 2026-08-04T14:05:37Z  
**Platforma:** TikTok only (LIVE Studio ← OBS Virtual Camera ← SPINAK_HLAVNI)  
**MIA:** `http://127.0.0.1:3000` · pid 17212

---

## Baseline (před startem vysílání)

| Check | Stav |
|-------|------|
| `/health` ok | **true** |
| `obsConnected` | **true** |
| OBS WS :4455 | listening · connected |
| `lastIngest` | **null** (čeká na první TikFinity/TikTok event) |
| `bowlPercent` | 0 |
| Kick bridge | connected (chat only — ne obraz) |
| Twitch | token 401 — **ignorovat dnes** |
| YouTube | odstaveno — **nesahat** |
| Dual voice | očekáváno OFF |

**Řetězec vysílání (operátor):** OBS scéna → Virtual Camera → TikTok LIVE Studio → TikTok. OBS **ne** Start Streaming.

---

## Timeline prvních událostí

| # | Událost | Čas (ISO / local) | Evidence | Poznámka |
|---|---------|-------------------|----------|----------|
| 1 | první TikTok comment | | | |
| 2 | první „Ahoj MIA“ | | | |
| 3 | první odpověď MIA | | | |
| 4 | první gift | | | |
| 5 | první gift video/overlay | | | |
| 6 | první bowl update | | | |

---

## Sledované signály

- MIA `/health`
- TikTok ingest (`lastIngest`, `logs/mia-events-YYYY-MM-DD.jsonl`)
- comment / gift events
- TTS queue / voice playback
- overlay actions / queue size
- bowl updates
- dropped / expired actions
- errors/min (`logs/mia-errors-*.jsonl`)

## Kritické stavy → jen hlásit

| Stav | Safe layer k vypnutí (návrh) |
|------|------------------------------|
| žádný TikTok ingest po zprávě | TikFinity / ingest path — ne celý stream |
| zaseknutá TTS fronta | hlas / voice overlay |
| opakovaná odpověď na stejný event | response layer |
| nekonečné přehrávání videa | gift video / media layer |
| rychlý nekontrolovaný růst bowl | bowl overlay / economy display |
| crash / health != OK | hold obraz, restart MIA až po souhlasu |

---

## PASS / FAIL / DEVIATIONS

*(vyplní se po ukončení → FIRST LIVE REPORT)*

| | |
|-|-|
| **PASS** | |
| **FAIL** | |
| **DEVIATIONS** | |
| **Důkazy z logů** | |
| **Blokery před 2. streamem** | |

---

## Guardrails této session

1. Neměnit YouTube, Twitch, Kick ani OBS konfiguraci.
2. Nespouštět OBS Start Streaming.
3. Neprovádět runtime hotfix bez výslovného souhlasu.
4. Při kritice: čas · vstup · očekávání · skutečnost · nejbezpečnější vrstva.
