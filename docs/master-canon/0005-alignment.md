# Master Canon 0005 — soulad s projektem

Audit [`0005-architecture-layers.md`](./0005-architecture-layers.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-architecture-core/`

---

## §1 Účel — jednotná terminologie

| Bod | Stav | Důkaz |
|-----|------|-------|
| 8 vrstev definováno | ✅ | `ARCHITECTURE_LAYER` |
| Vazba 0001–0004 | ✅ | dokument + `MAP_0004_COMPONENT_TO_LAYER` |
| Konzistentní použití v kódu | 🟡 | nové soubory řízeny canon testy; legacy názvy zůstávají |

---

## §2 Hierarchie

| Úroveň | V mapě | Stav |
|--------|--------|------|
| Platform | `mia.platform` | ✅ |
| Systems | 5 systémů | ✅ |
| Subsystems | streaming, ai, graphics | ✅ |
| Modules | stream, graphics, economy, … | ✅ |
| Engines | decision, animation, video, … | ✅ |
| Services | audio, storage | 🟡 |
| Components | ingest_queue, logger, config | 🟡 |
| Entities | `mia-entity-core` | ✅ |

---

## §3 Entita

| Bod | Stav | Důkaz |
|-----|------|-------|
| Objekt se stavem | ✅ | 0002 + Koj/Gift/user runtime |
| Nic neřídí | ✅ | odděleno od engine/modulů |

---

## §4 Komponenta (nejmenší jednotka)

| Příklad | Runtime | Stav |
|---------|---------|------|
| Logger | `writeLog`, `logs/` | ✅ |
| Config Reader | `MIA_CONFIG.js` | ✅ |
| Ingest Queue | `MIA_INGEST_QUEUE.js` | ✅ |
| Timer | `MIA_RUNTIME_LOOPS.js` | 🟡 |

---

## §5 Service

| Příklad | Runtime | Stav |
|---------|---------|------|
| Audio / TTS | `MIA_TTS_ENGINE.js` | ✅ |
| Storage | JSON persistence | 🟡 |
| Memory Service | session memory moduly | 🟡 |
| Auth Service | `MIA_STREAMER_IDENTITY.js` | 🟡 |

---

## §6 Engine

| Příklad | Runtime | Stav |
|---------|---------|------|
| Decision Engine | `engine_shadow_runtime.js` | ✅ |
| Animation Engine | `mia-animation-engine/` | ✅ |
| Video Engine | `MIA_VIDEO_ENGINE.js` | ✅ |
| Economy Engine | gift tiers + runtime | ✅ |
| Emotion Engine | mood brain | 🟡 |

---

## §7 Modul

| Modul | Dokumentace | Runtime | Stav |
|-------|-------------|---------|------|
| Stream | KANON_SOUCASNY | pipeline, ingest | ✅ |
| Graphics | MIA_GRAPHICS_STUDIO | mia-graphics-studio | ✅ |
| Economy | MIA_GIFT_ECONOMY | shared/gifts | ✅ |
| AI | KANON_MIA_AGENT | MIA_NEXT | 🟡 |
| Memory | — | data/*.json | 🟡 |

---

## §8 Subsystem

| Subsystem | Moduly v mapě | Stav |
|-----------|---------------|------|
| AI Subsystem | conversation, decision, memory | 🟡 |
| Graphics Subsystem | animation, video, paint, body | ✅ |
| Streaming Subsystem | tiktok, kick, obs, chat, overlay | ✅ |

---

## §9 System

| System | Stav |
|--------|------|
| Runtime | ✅ |
| AI | ✅ |
| Graphics | ✅ |
| Data | 🟡 |
| Administration | ✅ |

---

## §10 Platforma

| Bod | Stav |
|-----|------|
| MIA = platforma, ne aplikace | ✅ 0001 + 0005 |
| API, docs, testy v platformě | ✅ `routes/`, `tests/`, `docs/` |

---

## §11 Pojmenování

| Bod | Stav |
|-----|------|
| `validateArchitectureName()` | ✅ |
| Legacy `*EngineSystem` v repu | 🟡 minimální výskyt |

---

## §12 Závislosti vrstev

| Bod | Stav |
|-----|------|
| `assertLayerDependencyAllowed()` | ✅ |
| `mia-component-core` acyklický graph | ✅ |
| Full repo layer lint | ❌ budoucí tooling |

---

## §13 Odpovědnosti

| Vrstva | `LAYER_RESPONSIBILITY` | Soulad |
|--------|------------------------|--------|
| Všech 8 vrstev | ✅ enum | 🟡 enforcement v kódu |

---

## §14–§16 Rozšíření a checklist

| Bod | Stav |
|-----|------|
| Zařazení nových funkcí do vrstvy | ✅ dokument + platform map |
| Každý modul má docs | 🟡 většina ano, memory module chybí |
| Jednotný jazyk pro vývoj | ✅ Master Canon 0001–0005 |

---

## Most 0004 → 0005

| 0004 componentId | 0005 vrstva |
|------------------|-------------|
| `runtime.ingest_queue` | component |
| `runtime.event_pipeline` | engine |
| `ai.tts_engine` | service |
| `stream.obs_controller` | module |
| `game.gift_runtime` | engine |

Plná tabulka: `MAP_0004_COMPONENT_TO_LAYER`.

---

## Shrnutí 0005

| Oblast | ✅ | 🟡 | ❌ |
|--------|----|----|-----|
| Taxonomie + platform map | 12 | 4 | 0 |
| Runtime přiřazení | 14 | 10 | 0 |
| Enforcement | 4 | 4 | 1 |

**Celkově:** architektonický slovník je **kompletní**. Repozitář už strukturu largely odpovídá (Engines v `shared/`, Modules v `scripts/` doménách, Platform v `C:\MIA`). Chybí automatické **layer lint** na všechny soubory.

---

## Další krok

**Dokument 0006 — MIA Platform Architecture** — kompletní mapa systémů, vztahů a datových toků.
