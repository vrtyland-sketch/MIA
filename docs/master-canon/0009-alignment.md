# Master Canon 0009 — soulad s projektem

Audit [`0009-lifecycle-manager.md`](./0009-lifecycle-manager.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-core-canon/lifecycleManager.js`

---

## §1–§3 Účel a rozsah

| Bod | Stav | Důkaz |
|-----|------|-------|
| Centrální správce životního cyklu | 🟡 | kanonický modul ✅; runtime autorita ❌ |
| Jednotná pravidla pro moduly/systémy | 🟡 | `PLATFORM_LIFECYCLE` enum |
| Entity (Viewer, Gift) mimo scope | ✅ | odděleno od `entityLifecycle.js` (0002) |

---

## §4–§6 Stavový model a přechody

| Požadavek | Stav | Implementace |
|-----------|------|--------------|
| 13 stavů včetně FAILED | ✅ | `PLATFORM_LIFECYCLE` |
| Zakázané přeskakování | ✅ | `validateLifecycleTransition()` |
| RUNNING → STOPPED blokováno | ✅ | contract test |
| PAUSED → CREATED blokováno | ✅ | contract test |
| Centrální enforcement v runtime | ❌ | přímé mutace stavu v modulech |

---

## §7 Registrace

| Pole | Stav |
|------|------|
| ObjectID, typ, verze, závislosti | ✅ `createManagedObjectRegistration()` |
| Všechny systémy registrovány | 🟡 | `platformSystems.js` bez lifecycle stavu |
| Start bez registrace blokován | 🟡 | pravidlo v kánonu; ne runtime guard |

---

## §8–§12 Inicializace, spuštění, pause, resume, stop

| Fáze | Stav | Kotva |
|------|------|-------|
| Inicializace bez business logiky | 🟡 | HOST init pattern |
| Spuštění READY→STARTING→RUNNING | 🟡 | implicitní v bootstrapu |
| Pozastavení / obnovení | 🟡 | stream session PRELIVE/LIVE; ne univerzální |
| Řízené ukončení | ✅ | graceful shutdown v bootstrapu |

---

## §13 Restart

| Požadavek | Stav |
|-----------|------|
| Restart path STOPPING→STOPPED→STARTING→RUNNING | ✅ | `createRestartRecord()` |
| RestartID + audit | 🟡 | model ✅; `mia_restart.js` částečně |

---

## §14 Selhání

| Požadavek | Stav |
|-----------|------|
| FAILED stav | ✅ | enum + přechody do/z FAILED |
| Error Event → Error Manager | 🟡 | ingest error chain; ne lifecycle hook |
| Rozhodnutí Runtime Manageru | 🟡 | manuální / restart skripty |

---

## §15 Aktualizace za běhu

| Požadavek | Stav |
|-----------|------|
| PAUSE → update → RESUME | 🟡 | hot reload částečně (remote dev); ne formalizováno |
| Rollback při selhání validace | ❌ |

---

## §16 Audit

| Požadavek | Stav |
|-----------|------|
| Lifecycle Event při každé změně | 🟡 | `applyLifecycleTransition()` vytváří event |
| Neměnné záznamy | 🟡 | frozen records; ne perzistentní store |
| Pole LifecycleID, důvod, invokedBy | ✅ | `createLifecycleEventRecord()` |

---

## §17 Výjimky

| Požadavek | Stav |
|-----------|------|
| Short path CREATED→RUNNING→STOPPED | ✅ | `SHORT_PATH_LIFECYCLE_TRANSITIONS` |
| Dokumentace výjimky per objekt | 🟡 | zatím jen v kánonu |

---

## §18 Zakázané chování

| Pravidlo | Stav |
|----------|------|
| Enum zakázaných chování | ✅ |
| Runtime blokace přímých mutací | ❌ |

---

## Paralelní lifecycle modely v repu

| Model | Dokument | Použití |
|-------|----------|---------|
| `PLATFORM_LIFECYCLE` | **0009** | systémy, moduly, služby |
| `ENTITY_LIFECYCLE` | 0002 | Viewer, Gift, Koj entita |
| `COMPONENT_LIFECYCLE` | 0004 | HOST komponenty (design-time) |
| `CORE_LIFECYCLE` | 0007 | Core manager stavy |
| `RUNTIME_STATE` | 0008 | Runtime Manager proces |
| `EVENT_LIFECYCLE` | 0003 | události ve frontě |
| Stream session PRELIVE/LIVE/ENDED | doména | stream relace |

**Cíl:** postupná konvergence na `PLATFORM_LIFECYCLE` pro spravované objekty; entity zůstávají v 0002.

---

## §19 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Centrální Lifecycle Manager | 🟡 |
| Registrace systémů | 🟡 |
| Jednotný model | 🟡 |
| Blokace neplatných přechodů | ✅ (API) / ❌ (runtime) |
| Audit změn | 🟡 |
| Pause / resume | 🟡 |
| Řízený restart | 🟡 |
| Bezpečná aktualizace | ❌ |

**Souhrn:** kanonický model ✅ · runtime adopce 🟡 · 0× plně hotovo end-to-end

---

## Doporučené kroky

1. **0010 Event Bus** — lifecycle events jako first-class události
2. `LifecycleRegistry` singleton volaný z bootstrapu
3. Mapovat `platformSystems.js` na `createManagedObjectRegistration()`
4. Perzistentní audit log `logs/lifecycle-*.jsonl`

---

## Vazby

| Dokument | Vztah |
|----------|-------|
| [0007](./0007-core-system.md) | Lifecycle Manager jako Core §6 |
| [0008](./0008-runtime-manager.md) | Runtime rozhoduje při FAILED |
| [0002](./0002-entity-definition.md) | Entity lifecycle odděleně |
| **0010** (plánováno) | Event Bus infrastruktura |
