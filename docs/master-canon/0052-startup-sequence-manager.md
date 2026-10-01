# MIA MASTER CANON — Dokument 0052

**Název:** Startup Sequence Manager  
**ID:** MIA-0052  
**Vrstva:** Kernel Layer 0  
**Verze:** 1.0.0  
**Stav:** Platný dokument (ACTIVE)  
**Priorita:** Absolutně kritická  
**Nadřazený dokument:** [0050 – MIA Core Kernel](./0050-mia-core-kernel.md)  
**Souvisí:** [0051 – Boot Manager](./0051-boot-manager.md)

---

## 1. Účel

Startup Sequence Manager (SSM) řízeně spouští systémové služby a Engine po úspěšném Boot Manageru. Rozhoduje o pořadí startu — ne o Battle, AI ani herní logice.

---

## 2. Hlavní odpovědnosti

Spouští služby, hlídá pořadí, kontroluje závislosti, čeká na inicializaci, řeší selhání startu, vytváří Startup Report.

---

## 3. Architektura

```text
Boot Manager → Startup Sequence Manager → Kernel Services → Core Runtime
→ Infrastructure → AI Core → Gameplay → Presentation → Platform Connectors → READY
```

Existuje pouze jeden SSM.

---

## 4. Startup Fáze

- **Layer 0:** Kernel, Logger, Configuration, Diagnostics, Recovery
- **Layer 1:** Runtime, Registries, Monitoring, Scheduler, Watchdog
- **Layer 2:** Memory, Event Bus, Module Runtime, Plugin Runtime
- **Layer 3:** Decision, Action Orchestrator, Conversation, Speech, Personality, Emotion
- **Layer 4:** Inventory, Economy, Battle, Quest, Community, Story, World
- **Layer 5:** OBS, Overlay, Video, Audio, Platform Connectors
- **Layer 6:** TikTok, Kick, Twitch, Discord, YouTube, API Connectors
- **Layer 7:** READY

---

## 5. Startup Graph

Každá služba má závislosti. Battle startuje až když Inventory, Economy a Event Bus jsou READY.

---

## 6. Startup Queue

Fronta se vytváří automaticky z Dependency Graph.

---

## 7. Paralelní start

Služby bez vzájemných závislostí mohou startovat paralelně (např. Logger + Monitoring + Diagnostics).

---

## 8. Startup State

```text
Waiting → Starting → Initializing → Ready → Running
```

Při chybě: `Failed`.

---

## 9. Synchronizační body

Po každé vrstvě Synchronize — vyšší vrstva nepokračuje, dokud není předchozí připravena.

---

## 10. Startup Timeout

Start / Initialization / Ready timeouty — po překročení Recovery Manager. Konfigurovatelné.

---

## 11. Startup Retry

Start → Retry 1–3 → Recovery. Počet pokusů konfigurovatelný.

---

## 12. Startup Report

Seznam služeb, pořadí, časy, paralelní skupiny, chyby, varování, vypnuté moduly.

---

## 13. Startup Metrics

Celkový čas, počet služeb, nejpomalejší služba, paralelní starty, Retry, Failed.

---

## 14. Startup Priority

CRITICAL (Kernel) → HIGH (Runtime) → NORMAL (AI) → LOW (Pluginy) → OPTIONAL (experimentální).

---

## 15. Integrace s Plugin Runtime

```text
Kernel Ready → Plugin Discovery → Validation → Initialization → Plugin Ready
```

Plugin nikdy neblokuje Kernel.

---

## 16. Integrace s OBS

OBS až po Runtime, Event Bus, Decision Engine, Overlay Runtime. Nedostupné OBS = omezený režim.

---

## 17. Integrace s Platformami

TikTok/Kick/Twitch/Discord/YouTube až po dokončení startupu (READY). Nikdy před Kernelem.

---

## 18. Bezpečnost

Ověření pořadí, závislostí, zákaz cyklů, zákaz dvojité inicializace, audit pokusů.

---

## 19. Audit Cursor

Vrstvy, Dependency Graph, Queue, paralelní start, sync body, timeouty, retry, report, OBS fáze, platformy po READY.

---

## 20. Definice HOTOVO

Dependency Graph dodržen, žádný předčasný start, paralelní start nezávislých služeb, kompletní Report, nekritické selhání nezastaví platformu, stav READY.

---

## 21. Vazba na projekt MIA

SSM je orchestrátor spuštění celé platformy — nové moduly/hry/platformy bez změny základního mechanismu startu.

---

## Konec dokumentu 0052

**Architektonická poznámka:** Dokument **0053** bude věnován **Runtime Health & Watchdog** (nebo další Kernel Layer 0 službě dle roadmapy).
