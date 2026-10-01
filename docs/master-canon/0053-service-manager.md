# MIA MASTER CANON — Dokument 0053

**Název:** Service Manager  
**ID:** MIA-0053  
**Vrstva:** Kernel Layer 0  
**Verze:** 1.0.0  
**Stav:** Platný dokument (ACTIVE)  
**Priorita:** Absolutně kritická  
**Nadřazený dokument:** [0050 – MIA Core Kernel](./0050-mia-core-kernel.md)  
**Souvisí:** [0051 – Boot Manager](./0051-boot-manager.md), [0052 – Startup Sequence Manager](./0052-startup-sequence-manager.md)

---

## 1. Účel

Service Manager je centrální správce všech dlouhodobě běžících služeb platformy MIA. Jediné místo pro create/start/stop/restart/pause/resume/unregister. Žádná služba nesmí běžet mimo jeho správu.

---

## 2. Definice služby

Služba je dlouhodobě běžící komponenta (Event Bus, Memory, Decision, Battle, OBS, Speech, Monitoring, Watchdog…). Není jednorázová úloha (Task).

---

## 3. Architektura

```text
MIA Core Kernel → Service Manager → Core / AI / Gameplay / OBS / Platform / Plugins
```

---

## 4. Service Registry

Povinné údaje: ServiceID, Name, DisplayName, Version, Owner, Category, Priority, Dependencies, Configuration, AutoStart, HealthStatus.

---

## 5. Kategorie služeb

Kernel · Core · AI · Gameplay · Presentation · Platform · Plugin

---

## 6. Životní cyklus služby

```text
CREATED → REGISTERED → INITIALIZED → READY → RUNNING → PAUSED → STOPPING → STOPPED → UNREGISTERED
```

Při chybě: `FAILED`.

---

## 7. Povinné rozhraní služby

`initialize`, `start`, `stop`, `pause`, `resume`, `restart`, `health`, `dispose`  
Volitelné: `reload`, `backup`, `restore`, `metrics`

---

## 8. Service Descriptor

Jediný zdroj konfigurace (id, version, priority, autostart, dependencies, permissions, restartPolicy).

---

## 9. Priorita služeb

CRITICAL → HIGH → NORMAL → LOW → OPTIONAL

---

## 10. Automatické spouštění

AutoStart · ManualStart · Disabled

---

## 11. Restart Policy

never · immediate · delayed · exponential · recovery_confirm

---

## 12. Health Check

HEALTHY · DEGRADED · UNAVAILABLE · FAILED — periodická aktualizace.

---

## 13. Komunikace mezi službami

Pouze Event Bus, veřejné API, schválené Service Contracts. Přímé interní volání zakázáno.

---

## 14. Izolace služeb

Selhání nekritické služby nezastaví ostatní. Pouze kritické Kernel služby mohou zastavit Runtime.

---

## 15. Monitoring

Počet služeb, aktivní/zastavené, restarty, pády, uptime, CPU, RAM, doba inicializace.

---

## 16. Audit

Čas, actor, akce, předchozí/nový stav, důvod — neměnný log.

---

## 17. Integrace s Plugin Runtime

Plugin registruje služby jen přes Service Manager (validace, závislosti, oprávnění). Přímý start zakázán.

---

## 18. Bezpečnost

Blokace duplicitních ID, verze, oprávnění, neověřené služby, ochrana Kernel služeb.

---

## 19. Audit Cursor

Registrace, rozhraní, metadata, duplicity, Restart Policy, Health, komunikace, audit, izolace, plugin registrace.

---

## 20. Definice HOTOVO

Všechny služby registrovány, žádný běh mimo manager, lifecycle dle specifikace, Restart Policy + Health + Recovery + audit.

---

## 21. Vazba na projekt MIA

Provozní páteř platformy — jednotný lifecycle od Kernelu po platformní konektory a pluginy.

---

## Konec dokumentu 0053

**Architektonická poznámka:** Dokument **0054** bude věnován **Runtime Health & Watchdog**.
