# MIA MASTER CANON — Dokument 0009

**Název:** Lifecycle Manager – Správa životního cyklu platformy  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

**Nadřazený dokument:** [0007 – Core System](./0007-core-system.md)

---

## 1. Účel dokumentu

Lifecycle Manager je **centrální správce životního cyklu** všech aktivních částí platformy MIA.

Zajišťuje, aby každá komponenta, služba, engine, modul i systém procházely stejnými stavy a stejnými pravidly. Díky tomu lze předvídat chování, bezpečně spouštět, aktualizovat i vypínat části platformy.

Lifecycle Manager je **jediná autorita**, která smí měnit životní stav registrovaných částí platformy.

---

## 2. Definice životního cyklu

Životní cyklus je sled přesně definovaných stavů, kterými objekt během existence prochází.

- Každý objekt má v daném okamžiku **právě jeden** aktivní stav.
- Stavy **nesmí být přeskakována**, pokud to výslovně nepovoluje tento dokument (viz §17).

---

## 3. Objekty pod správou

Lifecycle Manager spravuje:

| Typ | Příklad |
|-----|---------|
| Systems | CORE, STREAM, GRAPHICS |
| Subsystems | AI Subsystem, Streaming Subsystem |
| Modules | Gift Module, Memory Module |
| Engines | Decision Engine, Animation Engine |
| Services | Memory Service, Audio Service |
| Components | Logger, Ingest Queue |
| Pluginy | Route extensions |
| Runtime procesy | HTTP server process |
| Long Running Tasks | Watchdog loops |

**Na běžné entity** (Viewer, Gift, Kojnožrout jako herní entita) se tento dokument **nevztahuje** — viz [0002 Entity Definition](./0002-entity-definition.md).

---

## 4. Standardní stavový model

```
REGISTERED → CREATED → INITIALIZED → READY → STARTING → RUNNING
  ⇄ PAUSING / PAUSED / RESUMING → STOPPING → STOPPED → ARCHIVED
```

V případě chyby: přechod do **FAILED**.

Enum: `PLATFORM_LIFECYCLE` v `shared/mia-core-canon/lifecycleManager.js`

---

## 5. Význam jednotlivých stavů

| Stav | Význam |
|------|--------|
| REGISTERED | Objekt znám systému, instance neexistuje |
| CREATED | Instance vytvořena |
| INITIALIZED | Interní struktury připraveny |
| READY | Čeká na spuštění |
| STARTING | Probíhá spuštění |
| RUNNING | Objekt vykonává práci |
| PAUSING | Bezpečné pozastavení |
| PAUSED | Dočasně zastaven |
| RESUMING | Návrat do provozu |
| STOPPING | Řízené ukončení |
| STOPPED | Nepracuje |
| ARCHIVED | Historicky uložen |
| FAILED | Selhání — vyžaduje zásah |

---

## 6. Povolené přechody

Lifecycle Manager dovoluje pouze definované přechody.

Příklady:

| Přechod | Povoleno |
|---------|----------|
| READY → STARTING | ✔ |
| STARTING → RUNNING | ✔ |
| RUNNING → PAUSED | ✔ (přes PAUSING) |
| RUNNING → STOPPED | ✖ (přes STOPPING) |
| PAUSED → CREATED | ✖ |

Neplatný přechod musí být **odmítnut** a zaznamenán do logu.

API: `validateLifecycleTransition(from, to)` · `applyLifecycleTransition(registration, newState)`

---

## 7. Registrace objektu

Každý objekt se nejprve registruje. Minimální pole:

- ObjectID, Název, Typ, Verze, Vlastník
- Závislosti, Požadované služby, Podporované události

Bez registrace **nelze** objekt spustit.

API: `createManagedObjectRegistration()` · pole: `REGISTRATION_FIELDS`

---

## 8. Inicializace

Inicializace zahrnuje: interní struktury, konfiguraci, registraci událostí, ověření závislostí, kontrolu oprávnění.

Inicializace **nesmí** spouštět obchodní logiku.

Přechod: `CREATED` → `INITIALIZED` → `READY`

---

## 9. Spuštění

Při spuštění Lifecycle Manager:

1. ověří závislosti,
2. ověří konfiguraci,
3. ověří zdravotní stav systému,
4. změní stav na `STARTING`,
5. zavolá startovací rozhraní objektu,
6. změní stav na `RUNNING`.

Selhání → `FAILED`.

---

## 10. Pozastavení

Objekt přestane přijímat nové úlohy, dokončí rozpracované operace, uloží stav, přejde do `PAUSED`.

Pozastavení **nesmí** vést ke ztrátě dat.

Přechod: `RUNNING` → `PAUSING` → `PAUSED`

---

## 11. Obnovení

Návrat z `PAUSED` do `RUNNING` po ověření závislostí a konfigurace.

Přechod: `PAUSED` → `RESUMING` → `RUNNING`

---

## 12. Řízené ukončení

Odmítnutí nových požadavků → dokončení operací → uvolnění prostředků → odhlášení událostí → uložení stavu → `STOPPED`.

Přechod: `RUNNING` nebo `PAUSED` → `STOPPING` → `STOPPED`

---

## 13. Restart

Restart = `STOPPING` → `STOPPED` → `STARTING` → `RUNNING`

Každý restart má vlastní **RestartID** a důvod. Audit povinný.

API: `createRestartRecord()`

---

## 14. Selhání

Při selhání: `FAILED` → Error Event → Error Manager → Monitoring → rozhodnutí Runtime Manageru.

Samovolný restart pouze pokud to povolí konfigurace.

---

## 15. Aktualizace za běhu

Typický postup: `PAUSING` → `PAUSED` → aktualizace → validace → `RESUMING` → `RUNNING`

Při selhání validace: návrat k předchozí verzi.

---

## 16. Audit

Každá změna stavu vytváří **Lifecycle Event**.

Pole: LifecycleID, ObjectID, Původní stav, Nový stav, Čas, Vyvolávající komponenta, Důvod.

Auditní záznamy jsou **neměnné**.

API: `createLifecycleEventRecord()` · pole: `LIFECYCLE_EVENT_FIELDS`

---

## 17. Výjimky

Krátkodobý úkol může používat zkrácený model:

```
CREATED → RUNNING → STOPPED
```

Každá výjimka musí být popsána v dokumentaci daného objektu.

API: `validateLifecycleTransition(from, to, { shortPath: true })`

---

## 18. Zakázané chování

Není dovoleno:

- měnit stav objektu přímo,
- přeskakovat definované přechody,
- měnit stav bez auditního záznamu,
- spouštět objekt bez registrace.

Enum: `LIFECYCLE_FORBIDDEN_BEHAVIOR`

---

## 19. Kontrolní seznam implementace

- [ ] Existuje centrální Lifecycle Manager?
- [ ] Jsou všechny systémy registrovány?
- [ ] Používají jednotný stavový model?
- [ ] Jsou neplatné přechody blokovány?
- [ ] Jsou všechny změny auditovány?
- [ ] Je podporováno pozastavení a obnovení?
- [ ] Je podporován řízený restart?
- [ ] Je podporována bezpečná aktualizace?

Automatická kontrola: `tests/mia_master_canon_0009_contract.js` · [`0009-alignment.md`](./0009-alignment.md)

---

## 20. Poznámka architekta

Lifecycle Manager je **garantem pořádku** v celé platformě. Bez jednotného řízení stavů by se platforma stávala nepředvídatelnou a obtížně udržovatelnou.

---

**Konec dokumentu 0009**

**Další krok:** Dokument **0010** — [Event Bus](./0010-event-bus.md). Dokument **0011** — Event Gateway.
