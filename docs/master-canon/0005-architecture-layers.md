# MIA MASTER CANON — Dokument 0005

**Název:** Architektonické stavební prvky (Module, Service, Engine a System)  
**Verze:** 1.0  
**Stav:** Platný dokument  
**Priorita:** Kritická

Předchozí: [0004 — Definice komponenty](./0004-component-definition.md)

---

## 1. Účel dokumentu

Tento dokument zavádí **jednotnou terminologii** pro celou platformu MIA.

Od tohoto okamžiku mají pojmy **Entita**, **Komponenta**, **Modul**, **Service**, **Engine**, **Subsystem** a **Systém** přesně definovaný význam.

Tyto názvy nesmí být používány nahodile. Každý nový vývojář musí být schopen z názvu okamžitě pochopit, jakou roli daná část plní.

> **Vazba na 0004:** Dokument 0004 popisuje *provozní deployable jednotky* (HOST moduly). Dokument 0005 definuje *architektonické vrstvy* — každá položka z `mia-component-core` registry má přiřazenou vrstvu v `mia-architecture-core`.

---

## 2. Hierarchie architektury

```
MIA Platform
│
├── Systems
│
├── Subsystems
│
├── Modules
│
├── Engines
│
├── Services
│
├── Components
│
└── Entities
```

Každá nižší úroveň je součástí vyšší úrovně.

Technická kotva: `shared/mia-architecture-core/platformMap.js`

---

## 3. Entita (Entity)

Entita představuje **objekt**. Její úlohou je uchovávat identitu a stav.

Příklady: Kojnožrout, Divák, Gift, Inventář, Sprite.

**Entita sama o sobě nic neřídí.** → viz [0002](./0002-entity-definition.md), `shared/mia-entity-core/`

---

## 4. Komponenta (Component)

Komponenta představuje **nejmenší samostatnou logickou jednotku** s jednou činností.

Příklady: Logger, Cache, JSON Parser, Image Loader, Timer, Configuration Reader.

Komponenta řeší **jednu konkrétní činnost**.

---

## 5. Service

**Service** poskytuje určitou službu ostatním částem systému. Obvykle neřídí celý proces, ale čeká na požadavky.

Příklady: Memory Service, Audio Service, Authentication Service, Notification Service, Storage Service.

Service lze přirovnat ke specialistovi, který vykonává konkrétní práci **na vyžádání**.

---

## 6. Engine

**Engine** je aktivní řídicí jednotka. Provádí složitou logiku, koordinuje více komponent a vytváří výsledné chování.

Příklady: Decision Engine, Animation Engine, Emotion Engine, Video Engine, Economy Engine.

Engine **rozhoduje**, jak budou jednotlivé části spolupracovat.

---

## 7. Modul (Module)

**Modul** představuje větší funkční celek složený z více komponent, služeb a engine. Je zaměřen na **jednu oblast** platformy.

Příklady: Stream Module, Graphics Module, Memory Module, Economy Module, AI Module.

Každý modul má vlastní veřejné rozhraní a vlastní dokumentaci.

---

## 8. Subsystem

**Subsystem** sdružuje více modulů, které společně řeší širší oblast.

| Subsystem | Moduly |
|-----------|--------|
| **AI Subsystem** | Conversation, Decision, Memory, Planning, Emotion |
| **Graphics Subsystem** | Renderer, Animation, Camera, Sprite, UI |
| **Streaming Subsystem** | TikTok, Kick, OBS, Chat, Overlay |

---

## 9. System

**System** je nejvyšší funkční celek uvnitř platformy.

Příklady: Runtime System, AI System, Graphics System, Administration System, Data System.

Systém sdružuje více subsystémů a zajišťuje jejich spolupráci.

---

## 10. Platforma

Nejvyšší úroveň představuje samotná **platforma MIA**.

Platforma zahrnuje: všechny systémy, databáze, API, konfigurace, dokumentaci, vývojové nástroje, testovací prostředí, administraci, budoucí rozšíření.

**MIA není aplikace. MIA je platforma.**

---

## 11. Pravidla pojmenování

Názvy musí odpovídat skutečné funkci.

| Správně | Špatně |
|---------|--------|
| `DecisionEngine` | `DecisionManagerEngineSystem` |

Každý název má být krátký, jednoznačný a srozumitelný.

Validace: `validateArchitectureName()` v `shared/mia-architecture-core/namingRules.js`

---

## 12. Pravidla závislostí

| Vrstva | Pravidlo |
|--------|----------|
| Komponenta | nesmí znát celý systém |
| Service | nesmí znát celý modul |
| Engine | smí používat pouze veřejná rozhraní |
| Modul | nesmí zasahovat do interní logiky jiného modulu |
| Subsystem | komunikuje přes definované rozhraní |
| System | koordinuje subsystémy, neřídí interní implementaci |

Kontrola: `assertLayerDependencyAllowed()` v `shared/mia-architecture-core/layerRules.js`

---

## 13. Odpovědnost jednotlivých vrstev

| Vrstva | Odpovědnost |
|--------|-------------|
| Entity | Data a stav |
| Component | Jedna jednoduchá činnost |
| Service | Poskytování služby |
| Engine | Řízení logiky |
| Module | Jedna funkční oblast |
| Subsystem | Sdružení modulů |
| System | Koordinace celé oblasti |
| Platform | Celá MIA |

---

## 14. Budoucí rozšiřování

Každá nová funkce musí být nejprve zařazena do správné vrstvy:

| Novinka | Vrstva |
|---------|--------|
| AI překladač | AI Module |
| Systém emocí | Emotion Engine |
| Nový renderer | Graphics Module |
| Logger | Logging Component |
| Databáze | Storage Service |

---

## 15. Kontrolní seznam implementace

- [ ] Je každá část zařazena do správné vrstvy?
- [ ] Odpovídá název funkci?
- [ ] Nepřekrývají se odpovědnosti?
- [ ] Komunikace pouze přes rozhraní?
- [ ] Bez kruhových závislostí?
- [ ] Má každý modul dokumentaci?

Automatická kontrola: `tests/mia_master_canon_0005_contract.js` · [`0005-alignment.md`](./0005-alignment.md)

---

## 16. Poznámka architekta

Tento dokument stanovuje **jednotný jazyk** celého projektu MIA. Od této chvíle musí každý nový soubor, třída, adresář i dokument používat tuto terminologii konzistentně.

---

## Vazba na další dokument

Dokumenty **0001–0005** vytvořily základní slovník architektury:

| ID | Téma |
|----|------|
| 0001 | Ústava projektu |
| 0002 | Entita |
| 0003 | Událost |
| 0004 | Komponenta (provozní jednotka) |
| 0005 | Architektonické vrstvy |

Od dokumentu **0006** začneme definovat jádro platformy: **MIA Platform Architecture** — kompletní mapa systémů, vztahů a toků dat.

---

**Konec dokumentu 0005**
