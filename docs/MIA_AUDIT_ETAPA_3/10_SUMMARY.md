# Etapa 3 — Executive Summary

**Datum:** 2026-07-27  
**Typ:** Funkční audit (Capability Audit)  
**Output:** `docs/MIA_AUDIT_ETAPA_3/`  
**Metoda:** Cross-check Etapa 2 map, capability status, ingest audit, R1 status, preflight suite list; grep flagů; **bez změn kódu**

---

## Etapa 3 HOTOVO

Vytvořeno 11 dokumentů:

| Soubor | Obsah |
|--------|-------|
| `00_CAPABILITY_MATRIX.md` | Master tabulka 90 schopností |
| `01_INGEST_CHAT.md` | Ingest + chat |
| `02_GIFTS_VIDEO.md` | Gifty + video rotace |
| `03_KOJ_BOWL.md` | Kojnožrout + miska |
| `04_TTS_OVERLAY_OBS.md` | TTS + overlaye + OBS |
| `05_ECONOMY_BATTLE_INVENTORY.md` | Ekonomika + battle + inventář + playlist |
| `06_EDITOR_GRAPHICS.md` | Editor + grafika (mimo core) |
| `07_ADMIN_API_CONFIG.md` | Admin + API + config |
| `08_PERSISTENCE_WATCHDOG_RECOVERY.md` | Persist + watchdog + recovery |
| `09_ENGINE2_AND_FLAGS.md` | Engine2 / AQ / dual voice / theme |
| `10_SUMMARY.md` | Tento soubor |

---

## Počty stavů (master matrix)

| Stav | Počet | Podíl |
|------|-------|-------|
| ✅ funguje | **58** | 64 % |
| ⚠ částečně | **22** | 24 % |
| ❌ nefunguje / jen návrh | **10** | 11 % |

*(Celkem 90 hodnocených schopností v `00_CAPABILITY_MATRIX.md`)*

---

## Stream-ready core vs lab

### ✅ Stream-ready core (RC)

Produkční řetězec ověřený kódem + contracty + historicky R1-C OBS PASS (2026-07-26):

```text
TikFinity / Kick
  → ingest + normalizer + queue
  → MIA NEXT shadow runtime (8 fází)
  → gift economy (miaPoints) + Koj/bowl + combo/spam
  → TTS (single voice default) + overlay-state
  → OBS browser sources + tier video rotace
```

**Důkazy:**
- Preflight fast: **159/159** PASS (`MIA_CAPABILITY_STATUS.md`, 2026-07-26)
- R1-C: 10/10 kroků OK (`MIA_R1C_OBS_RESULT.md`)
- Tag `v0.1.1-graphics` applied

### ⚠ Lab / volitelné (existuje v kódu, default OFF nebo mimo stream)

- Action Queue, Engine2 stub, dual voice, theme manager
- Twitch, Telegram, remote dev
- MIA Paint / Graphics Studio / animation bank
- Gift animation bank override (slow tests)
- Viewer inventory hloubka, care quest depth
- Feature flag precedence (3 zdroje)

### ❌ Design-only / záměrně vypnuté

- Playlist economy (jen canon stub)
- Poker / Monopoly / stream plugin engine
- Away host mode
- Body parts overlay (MIA_HEAD–FEET)
- Tech forms, user mode
- `shared/mia-*-core` untracked canon (ne live wired)

---

## Klíčová zjištění

1. **MIA je stream release candidate** — jádro funguje; většina ⚠ jsou volitelné mosty nebo lab flags, ne broken core.

2. **Engine2 ≠ produkce** — live path je `MIA_NEXT/engine_shadow_runtime.js`; `engine2/` je admin preview stub (default OFF).

3. **Guardrails drží** — overlay public jen miaPoints; dual voice/AQ/Engine2 default OFF; per-tier rotace bez resetu.

4. **NEOVĚŘENO v této etapě** — live OBS session neběžela; spoléháme na R1-C historický PASS + automated contracts. Nové live checks = Etapa 4.

5. **Operátorský dluh** — flag precedence across env/runtime.json/disk; dirty tree; canon import untracked.

---

## Testovací pokrytí (reference)

| Suite | Počet (fast) |
|-------|--------------|
| `FAST_SUITE_NAMES` | 159 suites |
| Slow (mimo fast) | `video_rotation`, `video_timing`, `gift_visual`, `obs_persistent_layers`, `away_host_mode`, master_canon 0001–0087, sprint3–6 |
| Příkaz | `npm run test:preflight:fast` |

---

## Rozdíl: existuje v kódu ≠ stream-ready

| Příklad | V kódu | Stream-ready |
|---------|--------|--------------|
| Engine2 stub | ✅ moduly + testy | ❌ default OFF, ne live path |
| MIA Paint | ✅ routes + editor | ❌ mimo ingest pipeline |
| Playlist economy | ✅ canon stub | ❌ ne v live pipeline |
| Kick chat | ✅ bridge | ✅ default ON, RC core |
| Dual voice | ✅ routing | ⚠ funguje při `=1`, default OFF |

---

## Etapa 3 HOTOVO — čeká Etapa 4

**Doporučený scope Etapy 4:**
- Targeted runtime trace testy pro NEOVĚŘENO položky
- Live OBS re-verify (volitelně) nebo mock integrace (Kick Pusher)
- Capability matrix vs kánon alignment
- Flag precedence dokumentace / operátorský cheat sheet
- Recovery/safe-mode live wiring audit

**Žádné změny kódu nebyly provedeny.** Dokumentace necommitnutá na disku.

---

*Generováno: 2026-07-27 — MIA Audit Etapa 3*
