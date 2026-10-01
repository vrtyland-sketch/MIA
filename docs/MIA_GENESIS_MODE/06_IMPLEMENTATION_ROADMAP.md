# MIA Genesis Mode — Implementation Roadmap

**Předpoklad:** Operátor **APPROVE** dokumentů 01–05.  
**Do té doby:** žádný runtime kód, žádný zásah do Stream Core.  
**Větev (až schváleno):** `feature/mia-genesis-mode`

---

## 0. Gate

```text
[ ] 01 Experience Design APPROVED
[ ] 02 Overlay & Scene APPROVED
[ ] 03 Voice Bank APPROVED
[ ] 04 Audio & Assets APPROVED
[ ] 05 Cadence & Unlock APPROVED
[ ] Branch created
[ ] MIA_GENESIS_MODE flag design confirmed (default OFF)
```

Stream Core zůstává FROZEN vůči R1-D; Genesis práce jen na větvi / oddělených souborech.

---

## Phase A — Skeleton (1–2 dny)

1. `mia-output-overlay/genesis-overlay.html` — STATUS + terminal + % (static/demo data)  
2. `genesis-fx.html` — částice / linky  
3. `genesis-community.html` — YouTube + platforms  
4. OBS scéna `MIA_GENESIS` (manual create) + browser sources  
5. Smoke: scéna se zobrazí, nic nehýbe Core queues  

**Exit:** vizuální kompozice drží 5 min bez TTS.

---

## Phase B — Voice & cadence (2–4 dny)

1. `text-bank/packs/genesis/` — CS pack ≥ 300 lines (EN/DE/ES follow)  
2. Genesis cadence scheduler (client nebo malý server modul) — **mimo** gift voice queue  
3. TTS playback sink pro Genesis only  
4. Anti-repeat terminal pool ≥ 40  
5. Mood map na `PRESENCE.faces` / genesis host  

**Exit:** 20min watch test checklist z 01 — self-run.

---

## Phase C — Audio (1–2 dny)

1. SFX files + hook  
2. BGM modes + duck on TTS  
3. Volume master  

**Exit:** Sequence zní jako start entity, ne jako budík.

---

## Phase D — Unlock UI (1–2 dny)

1. Manual `genesis-state.json` gates  
2. Ceremony flow  
3. Operator checklist page (internal)  

**Exit:** jeden mock unlock Voice→LIVE bez zapnutí Core gift.

---

## Phase E — Soft launch

1. Flag OFF default; ON jen Genesis session  
2. Denní change notes  
3. Paralelní R1-D zůstává nezávislý  

**Exit:** komunita běží na Genesis; Core Live gate odděleně.

---

## Explicitně později (ne Phase A–E)

| Položka | Kdy |
|---------|-----|
| Skutečné wiring Gift/Video unlock → Stream Core | po R1-D RESULT + výslovný příkaz |
| Live operator metrics | Etapa 9 |
| FR/IT/PL | po CS/EN/DE/ES pack completeness |
| Dedicated SURPRISED/ALERT/POINT art | POST-LOCK art pass |
| Platform-specific rendering | Level 3 (po Multi-Ingest) |
| Engine 2.0 / games / battle | mimo Genesis |

---

## Rizika

| Riziko | Mitigace |
|--------|----------|
| Contaminace live OBS manifest | samostatná scéna `MIA_GENESIS` |
| TTS kolize s gift voice | oddělený scheduler + dual voice OFF |
| „LIVE“ v UI ≠ Core zapnutý | manual gates + dokumentace |
| Monotónní BGM | pool + mode rotate |
| Scope creep do Core | charter hranice |

---

## Definition of Done (projekt Genesis v1)

- [ ] 20min watch test PASS  
- [ ] ≥ 300 CS hlášek + EN/DE/ES skeleton  
- [ ] Cadence 20–60 s stabilní 2h běh  
- [ ] Žádný diff v gift/video/persistence Core bez výslovného schválení  
- [ ] R1-D checklist beze změny  

---

## Stav

```text
06_IMPLEMENTATION_ROADMAP: ACTIVE
Phases: A overlay skeleton → B panels → C voice → D audio/assets → E cadence
STREAM CORE: FROZEN (no patches)
BRANCH: feature/mia-genesis-mode
```
