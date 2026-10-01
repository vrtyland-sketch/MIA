# Master Canon 0008 — soulad s projektem

Audit [`0008-runtime-manager.md`](./0008-runtime-manager.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-core-canon/runtimeManager.js`

---

## §1–§3 Účel a odpovědnosti

| Bod | Stav | Důkaz |
|-----|------|-------|
| Runtime = první aktivní část po startu procesu | ✅ | `server.js` → `startMiaServer()` |
| Orchestrace bez business logiky | 🟡 | bootstrap čistý; `index.js` drží wiring + require graph |
| Spuštění, dohled, řízené vypnutí | 🟡 | listen + SIGINT/SIGTERM graceful shutdown |

---

## §4 Runtime Context

| Pole kánonu | Stav | Implementace |
|-------------|------|--------------|
| Runtime ID | 🟡 | `createRuntimeContextRecord()` generuje UUID; runtime ho zatím neexponuje |
| Verze platformy | 🟡 | `package.json` 1.0.0; není v runtime snapshot |
| Čas spuštění | ✅ | `serverStartedAt` v `index.js` |
| Aktivní konfigurace | ✅ | `buildRuntimeConfig()` |
| Seznam systémů | 🟡 | `platformSystems.js`; ne live registry |
| Stav platformy | 🟡 | `RUNTIME_STATE` enum; ne řízen v runtime |
| Session ID | 🟡 | stream session phase; ne jednotné Session ID |

**Souhrn:** kanonický model ✅ · runtime adopce 🟡

---

## §5 Fáze spuštění

| Fáze | Stav | Kotva |
|------|------|-------|
| 1 Start procesu | ✅ | `server.js`, `MIA_ENV.loadLocalEnv()` |
| 2 Kontrola prostředí | 🟡 | `MIA_PORT_GUARD` (port); ne plný env audit |
| 3 Načtení konfigurace | ✅ | `MIA_CONFIG`, `config_contract_smoke` |
| 4 Inicializace Core | 🟡 | moduly require-time; ne explicitní fáze |
| 5 Registrace systémů | 🟡 | `routes/index.js` `registerAllRoutes` |
| 6 Aktivace RUNNING | ✅ | HTTP listen + startup hooks |

Fáze existují jako **dokumentovaný a testovaný enum**, ne jako explicitní state machine v bootstrapu.

---

## §6 Stavový automat

| Požadavek | Stav |
|-----------|------|
| 11 stavů CREATED→STOPPED | ✅ enum + transition map |
| Zakázané přeskakování | ✅ `canTransitionRuntimeState()` |
| Runtime řídí přechody | ❌ stavy nejsou v `index.js` aplikovány |

---

## §7 Hlavní smyčka

| Požadavek | Stav | Poznámka |
|-----------|------|----------|
| Periodická kontrola | ✅ | `MIA_RUNTIME_LOOPS.js` |
| Bez náročných výpočtů v runtime vrstvě | 🟡 | loops delegují na doménové moduly |
| Shutdown request check | 🟡 | SIG handlers; ne unified loop tick |

---

## §8 Registr systémů

| Požadavek | Stav |
|-----------|------|
| SystemID, verze, health | 🟡 | `/health`, `MIA_STATUS_SNAPSHOT` |
| Formal registry record | ✅ | `createSystemRegistryRecord()` |
| Live errorCount per system | 🟡 | agregované logy |

---

## §9 Restart systému

| Požadavek | Stav |
|-----------|------|
| Restart bez kill celé platformy | 🟡 | `mia_restart.js`, self-restart po OBS |
| Audit restartu | 🟡 | console log |
| Core systém nelze restartovat izolovaně | ✅ | design |

---

## §10 Watchdog

| Požadavek | Stav |
|-----------|------|
| Detekce neaktivity / zamrznutí | 🟡 | OBS watchdog ✅; moduly obecně ❌ |
| Pravidla před auto-zásahy | ✅ | OBS cooldown + max attempts |

---

## §11 Bezpečnostní režimy

| Režim | Stav |
|-------|------|
| Development / Testing / Production | 🟡 | `resolveRuntimeMode()` z ENV |
| Safe Mode | 🟡 | OBS safe_mode_or_websocket_off; ne platform-wide |

---

## §12–§14 Kritické chyby, výkon, zakázané činnosti

| Oblast | Stav |
|--------|------|
| Kritická chyba → shutdown | 🟡 | port in use → exit; ne unified critical handler |
| Minimální režie runtime | 🟡 | bootstrap lehký; index.js velký |
| Zakázané činnosti v bootstrap | ✅ | `MIA_SERVER_BOOTSTRAP` bez TikTok/AI/grafiky |

---

## §15 Kontrolní seznam (ruční)

| Položka | Stav |
|---------|------|
| Runtime Context | 🟡 |
| Fáze spuštění | 🟡 |
| Validace config | ✅ |
| Registr systémů | 🟡 |
| Watchdog | 🟡 |
| Restart systémů | 🟡 |
| Stavový automat | 🟡 (enum ✅, runtime ❌) |
| Řízené vypnutí | ✅ |

**Celkem:** 2× ✅ · 6× 🟡 · 0× ❌ (u stavového automatu enum ✅, aplikace ❌)

---

## Doporučené kroky implementace

1. **0009 Lifecycle Manager** — sjednotit entity + runtime + modul lifecycle
2. Explicitní bootstrap runner v `MIA_SERVER_BOOTSTRAP` s fázemi a `RUNTIME_STATE`
3. Export `getRuntimeContext()` z veřejného API (`/health` nebo status snapshot)
4. Platform-wide Safe Mode flag

---

## Vazby

| Dokument | Vztah |
|----------|-------|
| [0007](./0007-core-system.md) | Runtime Manager jako Core manager §5 |
| [0006](./0006-platform-architecture.md) | 15 systémů k registraci |
| **0009** (plánováno) | Lifecycle Manager detail |
