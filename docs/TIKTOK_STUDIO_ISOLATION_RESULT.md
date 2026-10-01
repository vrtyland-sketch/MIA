# STREAM_RECOVERY_01 — TikTok LIVE Studio Isolation Result

**Protocol:** STREAM_RECOVERY_01  
**Feature freeze:** ON (no runtime fixes in this pass)  
**Evidence log:** `docs/TIKTOK_STUDIO_ISOLATION_EVIDENCE.jsonl`  
**Monitor:** `node scripts/tiktok_studio_isolation_test.js`

---

## Verdikt (preliminární)

### **`RESOURCE_EXHAUSTION`** + **`INGEST_CONNECTOR_FAILURE`**

| Kategorie | Stav | Důkaz |
|-----------|------|--------|
| **RESOURCE_EXHAUSTION** | **CONFIRMED** | **~200 MB volné RAM** z ~5,7 GB celkem (2026-08-05T22:15Z) |
| **INGEST_CONNECTOR_FAILURE** | **CONFIRMED** | `ingestStale: true`, `ingestAgeMs` > 7 min, poslední ingest = **test gift**, ne live chat |
| **OBS_CONFLICT** | NOT PRIMARY | `obsConnected: true`, WebSocket OK, watchdog `consecutiveObsDown: 0` |
| **PROCESS_CONFLICT** | INCONCLUSIVE | TikTok LIVE Studio proces v době snapshotu **nebyl nalezen** (možná zavřený) |
| **NOT_REPRODUCED** | — | Plný 5min A/B test s TikTok Studio spuštěným operátorem — **dokončit** |

---

## Baseline (MIA + OBS, bez TikTok Studio v procesech)

**Čas:** 2026-08-05 ~22:15 UTC (00:15 local)

| Signál | Hodnota |
|--------|---------|
| RAM free | **~0,2 GB** / 5,74 GB |
| MIA `/health` | **OK** |
| `obsConnected` | **true** |
| `lastIngest` | tikfinity **GIFT test** (Rose, Test User 123) @ 22:07 — **ne live** |
| Watchdog | `ingestStale: true`, `ingestAgeMs: ~466000` |
| OBS RAM | ~150 MB |
| Top RAM | Cursor ~305 MB, Edge ~235 MB, ChatGPT ~150 MB, OBS ~150 MB |

**Interpretace:** MIA jádro běží, OBS je připojené, ale **TikFinity neposílá live události** (nebo TikTok room není navázaný). Při **200 MB volné RAM** jakýkoli další proces (TikTok LIVE Studio) spadne systém do swap/throttle → health timeouty, CEF lag, ingest výpadky.

---

## Symptom uživatele (live session)

> MIA je live, obraz z OBS jde do TikTok, ale MIA nereaguje.

**Mechanismus (hypotéza potvrzená logy):**

```text
OBS Virtual Camera → TikTok LIVE Studio → TikTok obraz OK
TikFinity / ingest → MIA           → ingest STALE → MIA „mrtvá“
RAM kriticky nízká → TikTok Studio → další degradace / timeouty
```

Obraz ≠ ingest. MIA může být „online“ v `/health`, ale **bez comment/gift eventů neodpoví**.

---

## První okamžik degradace

Z logu `mia-events-2026-08-05.jsonl`:

- Watchdog opakovaně: `obsConnected: true`, **`ingestStale: true`**
- Ingest age roste 120s → 438s+ bez nového live eventu
- **Degradace ingestu před/chybě reakce MIA** — ne nutně pád OBS

---

## Co nedělat (feature freeze)

- Neměnit overlaye / genesis / birth sekvence
- Neměnit OBS rozměry (operátor ručně)
- Necommitovat hotfixy naslepo

---

## Doporučený izolační test (operátor)

1. Zavřít Edge, ChatGPT, Epic, zbytečné Cursor okna → **cíl > 2 GB free RAM**
2. Spustit: `node scripts/tiktok_studio_isolation_test.js`
3. Po 30 s baseline **spustit TikTok LIVE Studio** + Go Live
4. Sledovat evidence log 5 min
5. Do chatu poslat 1 komentář — ověřit, zda `lastIngest` v logu skočí

---

## Blokery před dalším live

| P0 | Akce |
|----|------|
| RAM | Uvolnit min. **2 GB** před TikTok Studio |
| Ingest | TikFinity → live room connected, test comment v `/health` `lastIngest` |
| A/B | Dokončit 5min isolation log se zapnutým TikTok Studio |

---

## PASS / FAIL pro „MIA reaguje na live“

| | |
|-|-|
| **FAIL** | ingest stale > 2 min během live + live komentář v chatu |
| **PASS** | `lastIngest` comment/gift do 30 s od chat zprávy + MIA odpověď |

*Aktuálně: **FAIL** (ingest stale, pouze test gift).*

---

*Aktualizováno: 2026-08-06 — Cursor STREAM_RECOVERY_01 baseline pass*
