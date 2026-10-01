# Master Canon 0006 — soulad s projektem

Audit [`0006-platform-architecture.md`](./0006-platform-architecture.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-architecture-core/platformSystems.js`

---

## §1 Účel

| Bod | Stav | Důkaz |
|-----|------|-------|
| Mapa platformy jako celek | ✅ | 15 systémů v registry |
| Nový modul jen s aktualizací architektury | 🟡 | pravidlo v dokumentu; review proces |
| Dokumenty 0007+ rozepisují detaily | ✅ | `0007-core-system.md` · `nextDocId: 0008` u Core |

---

## §2 Definice platformy

| Požadavek | Stav | Poznámka |
|-----------|------|----------|
| Distribuovaný, modulární, event-driven | ✅ | ingest pipeline, HOST |
| Nepřetržitý provoz | 🟡 | single-node; watchdog |
| Rozšiřitelnost | ✅ | gift mapa, routes, plugins pattern |
| Auditovatelnost | 🟡 | jsonl logy |
| Testovatelnost | ✅ | preflight 140+ |
| Více AI modelů | 🟡 | LLM hybrid; ne pluggable registry |
| Více stream platforem | 🟡 | TikTok + Kick 🟢; Twitch/YouTube ❌ |
| Více grafických prostředí | 🟡 | 2D 🟢; 3D ❌ |
| Rozšíření bez přepisu jádra | ✅ | HOST/CTX, shared balíčky |

---

## §3–§18 Hlavní systémy

| Systém | § | Stav | Runtime kotva |
|--------|---|------|---------------|
| **CORE** | 4 | ✅ | index.js, ingest queue, pipeline, config |
| **AI** | 5 | 🟡 | shadow runtime, mood brain |
| **MEMORY** | 6 | 🟡 | session-memory, lexicon, story |
| **STREAM** | 7 | ✅ | ingest, Kick, normalize |
| **GRAPHICS** | 8 | ✅ | graphics-studio, animation-engine, overlay |
| **GAME** | 9 | ✅ | Kojnožrout engine, duely |
| **ECONOMY** | 10 | ✅ | gift map, MIA body, tiers |
| **USER** | 11 | 🟡 | streamer identity, participants |
| **DATA** | 12 | 🟡 | JSON files; ne SQL DB |
| **NETWORK** | 13 | ✅ | routes/, OBS WS, paint WS |
| **SECURITY** | 14 | 🟡 | runtime security, ingest guard |
| **ADMINISTRATION** | 15 | 🟡 | dashboard, /health, status |
| **DEVELOPMENT** | 16 | ✅ | tests/, preflight, docs |
| **MONITORING** | 17 | 🟡 | audit:live, perf contract |
| **INTEGRATION** | 18 | ✅ | OBS, TikFinity, Kick bridge |

**Souhrn:** 7× ✅ implemented · 8× 🟡 partial · 0× ❌ planned-only

---

## §19 Tok dat

| Krok | Stav | Modul |
|------|------|-------|
| Externí zdroj → Integration | ✅ | platform bridges |
| → Stream/Network | ✅ | ingest HTTP |
| → Event Bus (Core) | ✅ | MIA_INGEST_QUEUE |
| → AI/Game/Graphics/Economy | ✅ | pipeline fáze |
| → Action Orchestrator | ✅ | MIA_DELIVERY_RUNTIME |
| → Výstup OBS/Overlay | ✅ | OBS sync |

`describePlatformDataFlow()` — 9 kroků.

---

## §20 Architektonické zásady

| Zásada | Stav |
|--------|------|
| Všech 10 principů v enum | ✅ |
| Dodržení v kódu | 🟡 většina ano; výjimky dokumentovány v alignment |

---

## §21 Kontrolní seznam

| Otázka | Stav |
|--------|------|
| ☐ Všechny hlavní systémy? | ✅ 15/15 v registry |
| ☐ Core malý a stabilní? | 🟡 index.js tenký; pipeline bohatý |
| ☐ Rozhraní mezi systémy? | 🟡 event bus + routes |
| ☐ Modulární? | ✅ |
| ☐ Nový systém bez zásahu? | 🟡 adaptér pattern |
| ☐ Repo odpovídá architektuře? | 🟡 `scripts/`, `shared/`, `routes/` |

---

## §22 Mapa dokumentace

| ID | Téma | Stav |
|----|------|------|
| 0001–0005 | Slovník + vrstvy | ✅ |
| **0006** | Platform Architecture | ✅ tento dokument |
| 0007+ | Per-system hloubka | 📋 Core System další |

---

## Struktura repozitáře vs architektura

| Architektura | Cesta v repu |
|--------------|--------------|
| Core / Stream | `index.js`, `scripts/pipeline/`, `scripts/MIA_INGEST_*` |
| AI | `MIA_NEXT/`, `scripts/MIA_INTERPRETER_*` |
| Graphics | `shared/mia-graphics-studio/`, `mia-output-overlay/` |
| Game | `scripts/MIA_KOJNOZROUT_*` |
| Economy | `shared/gifts/` |
| Network / API | `routes/` |
| Development | `tests/`, `scripts/run_preflight_tests.js` |
| Integration | `MIA_OBS_*`, `MIA_KICK_BRIDGE.js` |

---

## Shrnutí 0006

Platforma MIA **odpovídá dokumentované architektuře** v oblasti stream runtime (TikFinity → MIA → OBS). Nejslabší oblasti pro dokumenty 0007+: **MEMORY** (verzování), **USER** (plný profil), **DATA** (SQL migrace), **MONITORING** (unified metrics).

---

## Další krok

**Dokument 0007 — Core System** — detail jádra: Runtime, Event Bus, Scheduler, Error Manager.
