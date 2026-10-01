# MIA MASTER CANON
# Dokument 0054
# Dependency Manager
---
## Metadata
| Položka            | Hodnota                                                 |
| ------------------ | ------------------------------------------------------- |
| ID                 | MIA-0054                                                |
| Název              | Dependency Manager                                      |
| Vrstva             | Kernel Layer 0                                          |
| Priorita           | ABSOLUTNĚ KRITICKÁ                                      |
| Verze              | 1.0.0                                                   |
| Stav               | ACTIVE                                                  |
| Nadřazený dokument | 0050 – MIA Core Kernel                                  |
| Souvisí            | 0052 – Startup Sequence Manager, 0053 – Service Manager |
---
## 1. Účel
Dependency Manager (DM) je centrální správce všech závislostí v platformě MIA.
Jeho úkolem je zajistit, aby:
* žádná služba nebyla spuštěna bez splnění svých závislostí,
* nevznikly kruhové závislosti,
* systém znal přesný graf všech propojení,
* bylo možné bezpečně přidávat nové moduly, platformy i hry.
Dependency Manager je jedinou autoritou pro řešení závislostí.
---
## 2. Hlavní odpovědnosti
Dependency Manager:
* vytváří Dependency Graph,
* validuje závislosti,
* určuje pořadí inicializace,
* detekuje konflikty,
* blokuje neplatné konfigurace,
* poskytuje informace Startup Sequence Manageru.
---
## 3. Architektura
```text
                    Dependency Manager
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
 Service Registry    Module Registry    Plugin Registry
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                    Dependency Graph
                           ▼
               Startup Sequence Manager
```
Dependency Manager neřídí služby – pouze jejich vztahy.
---
## 4. Co je závislost
Závislost znamená, že jedna komponenta nemůže správně fungovat bez jiné komponenty.
Příklad:
```text
Battle Engine
      │
      ├── Inventory Engine
      ├── Economy Engine
      ├── Event Bus
      └── Memory Engine
```
Pokud chybí Inventory Engine, Battle Engine nesmí být spuštěn.
---
## 5. Typy závislostí
### Hard Dependency
Bez této komponenty nelze pokračovat.
Například:
* Event Bus
* Runtime
* Memory
---
### Soft Dependency
Komponenta může fungovat omezeně.
Například:
* Discord Connector
* Spotify Module
* Experimentální Overlay
---
### Optional Dependency
Je pouze rozšířením.
Například:
* Plugin
* Minihra
* Externí AI modul
---
## 6. Dependency Graph
Dependency Manager vytváří orientovaný graf.
```text
Kernel
 │
 ├── Runtime
 │      │
 │      ├── Event Bus
 │      │       │
 │      │       ├── Memory
 │      │       │      │
 │      │       │      ├── Decision Engine
 │      │       │      │        │
 │      │       │      │        ├── Battle
 │      │       │      │        └── Conversation
 │      │       │      │
 │      │       └── OBS
 │      │
 │      └── Platform Connectors
```
Graf musí být acyklický (DAG).
---
## 7. Kruhové závislosti
Příklad zakázané konfigurace:
```text
Battle
 │
 ▼
Inventory
 │
 ▼
Economy
 │
 ▼
Battle
```
Takový stav je neplatný.
Startup je okamžitě zastaven.
---
## 8. Dependency Descriptor
Každá služba nebo modul deklaruje své závislosti.
Příklad:
```yaml
id: battle-engine
dependsOn:
  - event-bus
  - inventory-engine
  - economy-engine
optional:
  - discord-module
conflicts:
  - legacy-battle-engine
```
Dependency Descriptor je povinnou součástí registrace.
---
## 9. Řešení pořadí
Dependency Manager používá topologické třídění.
Výsledkem je například:
```text
Logger
↓
Configuration
↓
Runtime
↓
Event Bus
↓
Memory
↓
Decision Engine
↓
Battle
↓
OBS
↓
TikTok Connector
```
Pořadí je automaticky generováno.
---
## 10. Validace
Při každém startu kontroluje:
* chybějící závislosti,
* konfliktní moduly,
* duplicity,
* verze,
* kruhové vazby,
* neplatné odkazy.
Bez úspěšné validace nelze pokračovat.
---
## 11. Dynamické změny
Pokud je během běhu načten nový modul:
```text
Plugin Install
↓
Dependency Validation
↓
Conflict Check
↓
Graph Update
↓
Runtime Update
```
Restart Kernelu není nutný.
---
## 12. Konflikty
Dependency Manager detekuje například:
* dvě stejné služby,
* dvě různé verze stejného modulu,
* nekompatibilní API,
* zakázané kombinace modulů.
Konflikty jsou předány Recovery Manageru.
---
## 13. Integrace s Plugin Runtime
Každý plugin před registrací projde:
1. Validací podpisu.
2. Kontrolou kompatibility.
3. Analýzou závislostí.
4. Kontrolou oprávnění.
5. Zařazením do Dependency Graph.
Bez splnění všech kroků není plugin aktivován.
---
## 14. Integrace s Platformami
Každý platformní modul deklaruje své závislosti.
Příklad:
```text
TikTok Connector
↓
OBS Overlay
↓
Speech Engine
↓
Event Bus
```
Odpojení platformy nesmí poškodit ostatní části systému.
---
## 15. Integrace s hrami
Každá hra (Battle, Fishing, Racing, Dungeon...) je samostatný modul.
Dependency Manager umožňuje přidávat nové hry bez úprav Kernelu.
Každá hra pouze deklaruje své závislosti.
---
## 16. Monitoring
Dependency Manager sleduje:
* počet uzlů grafu,
* počet hran,
* počet konfliktů,
* počet dynamických změn,
* dobu výpočtu pořadí,
* počet aktivních modulů.
---
## 17. Bezpečnost
Dependency Manager:
* blokuje kruhové závislosti,
* blokuje konfliktní moduly,
* ověřuje kompatibilitu verzí,
* chrání Kernel před neplatnou konfigurací,
* nedovolí obejít Dependency Validation.
---
## 18. Audit Cursor
Při kontrole ověřit:
* ☐ Existuje centrální Dependency Manager.
* ☐ Každá služba deklaruje své závislosti.
* ☐ Dependency Graph je bez cyklů.
* ☐ Topologické třídění určuje pořadí startu.
* ☐ Hard a Soft závislosti jsou rozlišeny.
* ☐ Pluginy procházejí validací.
* ☐ Dynamické změny aktualizují graf.
* ☐ Konflikty jsou správně detekovány.
* ☐ Platformy lze odpojit bez pádu systému.
* ☐ Nové hry lze přidat pouze deklarací závislostí.
---
## 19. Definice HOTOVO
Dependency Manager je implementován správně pouze tehdy, když:
* všechny služby, moduly a pluginy deklarují své závislosti,
* systém nikdy nespustí komponentu s nesplněnými Hard Dependencies,
* Dependency Graph je vždy acyklický,
* pořadí startu je generováno automaticky,
* konflikty jsou detekovány před spuštěním,
* dynamické přidání nebo odebrání modulu bezpečně aktualizuje graf bez narušení běhu platformy.
---
## 20. Vazba na projekt MIA
Dependency Manager je architektonická pojistka celé platformy. Umožňuje bezpečné rozšiřování MIA o nové AI systémy, platformní konektory, Kojnožrouty, hry i pluginy, aniž by vznikaly skryté závislosti nebo nestabilní konfigurace. Díky němu může MIA dlouhodobě růst jako modulární platforma bez nutnosti zásahů do Kernelu.
---
**Architektonická poznámka:** Dokument **0055** bude věnován **Runtime Health & Watchdog**.

## Konec dokumentu 0054
