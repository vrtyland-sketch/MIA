# Master Canon 0004 — soulad s projektem

Audit [`0004-component-definition.md`](./0004-component-definition.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-component-core/`

---

## §1 Účel dokumentu

| Bod | Stav | Důkaz |
|-----|------|-------|
| Komponenta = vykonavatel práce | ✅ | 60× `MIA_*_HOST.js` + runtime moduly |
| Oddělení od entity (0002) a event (0003) | ✅ | registry vs `mia-entity-core` / `mia-event-core` |

---

## §2 Definice komponenty

| Bod | Stav | Poznámka |
|-----|------|----------|
| Jednotka s odpovědností | ✅ | HOST refactor dle domény |
| Vstupy / výstupy | 🟡 | canon registry; ne každý modul má manifest |
| Nahraditelnost | ✅ | HOST/CTX wiring |
| Komponenta ≠ entita | ✅ | `mia.main` entity vs `runtime.event_pipeline` komponenta |

---

## §3 Jedna odpovědnost

| Bod | Stav | Poznámka |
|-----|------|----------|
| SRP v architektuře | 🟡 | většina modulů ano; `MIA_EVENT_PIPELINE_HOST` agreguje mnoho handlerů |
| Split při růstu | ✅ | index.js → routes + HOST |

---

## §4 Povinné vlastnosti

| Pole | Canon | Runtime |
|------|-------|---------|
| componentId | ✅ | 🟡 implicitní název souboru |
| name, version, purpose | ✅ registry | 🟡 |
| inputs / outputs | ✅ registry | 🟡 |
| state | ✅ lifecycle enum | 🟡 |
| dependencies | ✅ registry + acyclic check | 🟡 |
| logging | ✅ per-component channel | ✅ `writeLog` |
| configuration | ✅ registry sources | ✅ `MIA_CONFIG.js` |

---

## §5 Životní cyklus

| Stav | Enum | Runtime |
|------|------|---------|
| designed → archived | ✅ | 🟡 bez unified `component.state` v modulu |
| Přechody v logu | 🟡 | startup/obs log částečně |

---

## §6 Komunikační pravidla

| Kanál | Stav | Modul |
|-------|------|-------|
| Event Bus | ✅ | `MIA_INGEST_QUEUE` + pipeline |
| API | ✅ | `routes/` |
| HOST/CTX | ✅ | 60 HOST souborů |
| Přímé propojení dokumentované | 🟡 | alignment mapa |

---

## §7 Typy komponent

| Typ | Příklad v registry | Stav |
|-----|-------------------|------|
| runtime | ingest_queue, scheduler | ✅ |
| ai | decision_layer, tts_engine | ✅ |
| graphic | animation_engine, video_engine | ✅ |
| stream | delivery, obs_controller, platform_bridges | ✅ |
| data | config_loader | ✅ |
| game | kojnozout_engine, gift_runtime | ✅ |

Registry: **13** canon komponent.

---

## §8 Rozhraní

| Požadavek | Stav |
|-----------|------|
| listensTo / emits v registry | ✅ |
| errors v registry | ✅ |
| Veřejné API každého modulu | 🟡 contract testy částečně |

---

## §9 Konfigurace

| Zdroj | Stav |
|-------|------|
| JSON config | ✅ `stream_economy_config.json` |
| ENV / `.env` | ✅ |
| `MIA_CONFIG.js` | ✅ |
| Admin `/status` | ✅ |
| Hardcoded bez override | 🟡 některé defaulty v kódu s ENV fallback |

---

## §10 Chybové stavy

| Úroveň | Stav |
|--------|------|
| ok / warning / error / critical | ✅ `COMPONENT_HEALTH` |
| Izolace pádu | 🟡 `obs_safe_call`, try/catch v queue; ne všude |

---

## §11 Výkonnost

| Metrika | Stav |
|---------|------|
| runtime perf contract | ✅ |
| `/health` | ✅ |
| pipeline summary | 🟡 |

---

## §12 Testovatelnost

| Bod | Stav |
|-----|------|
| Contract testy per doména | ✅ 140+ preflight |
| HOST/CTX izolace | ✅ `*_ctx_contract.js` |
| Izolovaný run komponenty | 🟡 částečně |

---

## §13 Závislosti

| Bod | Stav |
|-----|------|
| `assertAcyclicDependencies()` | ✅ |
| Canon graph acyklický | ✅ |
| Full repo dependency graph | ❌ budoucí tooling |

---

## §14–§16 Rozšíření a architektura

| Bod | Stav |
|-----|------|
| Nové komponenty bez přepisu jádra | ✅ routes + HOST pattern |
| Desítky komponent | 🟡 ~60 HOST + shared balíčky |
| Kontrolní seznam §15 | 🟡 viz registry + contract test |

---

## Shrnutí 0004

| Sekce | ✅ | 🟡 | ❌ |
|-------|----|----|-----|
| §1–§3 Definice + SRP | 4 | 2 | 0 |
| §4–§6 Vlastnosti + komunikace | 8 | 6 | 0 |
| §7–§9 Typy + rozhraní + config | 10 | 4 | 0 |
| §10–§13 Health + test + deps | 6 | 4 | 1 |
| §14–§16 Architektura | 2 | 2 | 0 |

**Celkově:** MIA už **fakticky běží jako sada komponent** (HOST refactor). Canon vrstva sjednocuje metadata. Chybí **automatický manifest** pro každý z 60 HOST modulů a **unified lifecycle logging**.

---

## Vazba 0002 + 0003 + 0004

```
Event (0003) → Component (0004) → mění stav Entity (0002)
```

Příklad: `GIFT` event → `game.gift_runtime` → `kojnozout.pet` entity bowl state.

---

## Další krok

**Dokument 0005 — Modul (Module)** — rozdíl entity / komponenta / modul / service / engine.
