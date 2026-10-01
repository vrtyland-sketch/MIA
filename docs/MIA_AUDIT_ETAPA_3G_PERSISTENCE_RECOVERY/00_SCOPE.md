# MIA Audit — Etapa 3G: Persistence & Recovery (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **Stream Core persistence & recovery** proti kánonu (disk `data/*.json`, boot hydrate, corrupt soft-fail, watchdog napojení na stav, cross-link 3A–3F).  
**Metodika:** Canon ↔ Implementation ↔ Tests ↔ Status + **Poslední ověření** (fresh vs hist. vs nikdy). Stejný bar jako **Etapa 3F** (uživatel četl celý pack 00–05).

---

## Stream Core vs Master Canon (povinné rozlišení)

| Vrstva | Co to je | Status v tomto auditu |
|--------|----------|------------------------|
| **Stream Core subset** | Live stream runtime: `data/*.json`, `MIA_KOJNOZROUT_*_PERSISTENCE`, `core/runtime-state.js`, `viewer-memory` / inventory / arena / session / theme / AQ flag, `core/stream-watchdog.js`, `MIA_OBS_WATCHDOG` (process relaunch — ownership detail **3D**), `scripts/mia_replay.js` | Primární měřítko shody |
| **Master Canon** | `0065` Recovery Manager, `0066` Watchdog Engine, `0068` Safe Mode, `0075` Event Store (+ související 0064/0067/0069…) v `shared/mia-*-core/` | **Vize / lab** — contracty existují; **live wiring do `index.js` stream path NE** → ⚠/❓, ne ❌ proti Stream Core |

> Capability inventář (`docs/MIA_AUDIT_ETAPA_3/08_PERSISTENCE_WATCHDOG_RECOVERY.md`) = **schopnosti**, ne compliance. Tento pack = **shoda s kánonem**.

---

## Co Etapa 3G pokrývá (IN)

| Oblast | Rozsah |
|--------|--------|
| **Inventář `data/`** | `kojnozout-state`, `kojnozout-world`, `runtime-state`, `viewer-memory`, `viewer-inventory`, `platform-arena`, `mia-action-queue`, `mia-theme`, `mia-session-memory`, `mia-chat-lexicon`, `story-memory`, `gift-map-stats`, `streamer-identity`, související JSON |
| **Atomic write** | `tmp` + `rename` kde je; přímý `writeFileSync` kde není |
| **Boot hydrate** | `loadPersistedSeed` / `loadWorldSeed` / `composeKojSeed` / `MIA_RUNTIME_STATE_SEED_CTX` |
| **Corrupt / partial JSON** | try/catch → safe defaults; přítomnost/absence `.bak` / quarantine |
| **Verze / migrace** | pole `version: 1`; migrátory v1→v2; soft identity rewrite (arena) |
| **Crash recovery MIA procesu** | co se obnoví po restartu Node; debounce window ztráty |
| **Ephemeral vs durable** | overlay queue, voice timing, gift ledger, `rotationIndexByTier` |
| **Watchdog** | stream ingest/OBS WS health → zápis do runtime-state; OBS process relaunch (**cross 3D**) |
| **Replay** | `phase1_replay` / `mia_replay` — reprocess event log |
| **Cross-consistency** | Koj ↔ bowl ↔ runtime-state ↔ economy (viewer-memory / gift-map) |
| **Uživatelsky kritická témata** | (1) konzistence uloženého stavu (2) obnova po pádu (3) verzování (4) migrace (5) poškozené snapshoty (6) návaznost Economy / Overlay / Voice / Koj |

**Mimo rozsah 3G (OUT):**

| Oblast | Kde |
|--------|-----|
| Gift tier math / spam / rotation **algoritmus** | **3A** (persist indexu napříč restartem = IN zde) |
| miaPoints **konverzní vzorce** | **3B** (persist ledger hodnot = IN; vzorce OUT) |
| Koj CARE / vitals **chování** | **3C** (persist vitals = IN) |
| OBS bootstrap / manifest / bust | **3D** (OBS process recovery detail IN jen cross-link) |
| TTS engine / dual voice | **3E** (voice state persist IN jako ephemeral) |
| Overlay HTML UX / public strip | **3F** (overlay in-memory IN jako ephemeral) |
| Battle scoring deep | → **3H** |
| Editor assets | → **3I** |
| Plné Master Recovery / Event Store live wiring | poznámka Master vs Stream — ne auto-fix |

---

## Vztah k ostatním etapám (handoffs)

| Etapa | Složka | Handoff |
|-------|--------|---------|
| **3A** | `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` | Gift map stats disk; `rotationIndexByTier` runtime vs persist |
| **3B** | `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` | `viewer-memory` miaPoints; streak persist gap; gift-map coins |
| **3C** | `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` | Koj/world JSON; walk nepersistováno; CARE OUT |
| **3D** | `docs/MIA_AUDIT_ETAPA_3D_OBS_RUNTIME/` | OBS watchdog relaunch; persistent browser layers ≠ app state |
| **3E** | `docs/MIA_AUDIT_ETAPA_3E_VOICE_TTS/` | Voice timing / speak queue **in-memory** → 3G |
| **3F** | `docs/MIA_AUDIT_ETAPA_3F_OVERLAY_RUNTIME/` | Overlay state **in-memory**; handoff Persistence → tento pack |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/08_PERSISTENCE_WATCHDOG_RECOVERY.md` | Inventář schopností |
| **3G (tento)** | `docs/MIA_AUDIT_ETAPA_3G_PERSISTENCE_RECOVERY/` | **Persistence & Recovery vs kánon** |
| **3H** | `docs/MIA_AUDIT_ETAPA_3H_BATTLE/` | Battle scoring / choreography ✅ |
| **3I** | (příští) | Editor |

---

## Zdroje důkazů

- Kánon: `docs/KANON_MIA_ALIGNMENT.md` (OBS resilience, Master 0065/66/75 🟡), guardrails `.cursor/rules/mia-guardrails.mdc`
- Capability: `docs/MIA_AUDIT_ETAPA_3/08_PERSISTENCE_WATCHDOG_RECOVERY.md`
- Prior: Etapa 2 state map; 3A–3F SUMMARY (persist handoffs)
- Master: `docs/master-canon/0065-*`, `0066-*`, `0075-*` (skim — vize)
- Kód: `scripts/MIA_KOJNOZROUT_PERSISTENCE.js`, `MIA_KOJNOZROUT_WORLD_PERSISTENCE.js`, `MIA_RUNTIME_STATE_SEED_CTX.js`, `core/runtime-state.js`, `core/viewer-memory.js`, `core/viewer-inventory.js`, `core/action-queue.js`, `core/theme-manager.js`, `core/stream-watchdog.js`, `scripts/MIA_PLATFORM_ARENA.js`, `MIA_SESSION_MEMORY.js`, `MIA_CHAT_LEXICON.js`, `MIA_OBS_WATCHDOG.js`, `shared/gifts/runtime.js`, `shared/mia-recovery-core/`, `shared/mia-event-store-core/`
- Testy: `phase1_runtime_state`, `runtime_state_*`, `phase1_stream_watchdog`, `phase2_viewer_memory`, `phase1_action_queue`, `phase1_replay`, `phase3_game_layer`, `obs_watchdog*`, `theme_manager`, `status_snapshot`, master canon 0065/66/75 (mimo fast)

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a implementace se shodují (kód a/nebo contract) |
| ⚠ | Částečná shoda / drift — jádro OK, chybí atomic/bak/migrace/live wiring |
| ❌ | Rozpor — porušení tvrdého pravidla Stream Core |
| ❓ | Neověřeno — chybí důkaz (live crash session, multi-file kill mid-write) |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.  
**Gaps = Decision later** — **žádný auto-fix**.

**Poslední ověření:** *fresh* = code/contract review **2026-07-27**; *hist.* = starší live (např. R1-C **2026-07-26**); *nikdy* = bez důkazu. Historický PASS **není** fresh.

---

## Omezení auditu

- **Žádné změny aplikačního kódu** — pouze dokumentace.
- Live „zabít Node mid-write / corrupt JSON na produkci“ **nebyl** součástí tohoto běhu.
- Gift math, CARE, TTS, Overlay UX, OBS bootstrap — **neopravujeme**; cross-link.
- Master Recovery/Event Store hodnotíme jako **vizi vs Stream subset**, ne jako povinný produkční runtime.
