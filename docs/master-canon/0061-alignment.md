# Master Canon 0061 — soulad s projektem

Audit [`0061-state-manager.md`](./0061-state-manager.md) vůči stavu `C:\MIA` k 2026-07-16.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-state-core/stateManager.js`

---

## §1–§11 Registry a FSM

| Bod | Stav | Důkaz |
|-----|------|-------|
| Jediný State Manager | ✅ | `singleton` / `soleStateAuthority` |
| Typy system/service/module/gameplay/entity | ✅ | `SM_STATE_KIND` |
| State Machine + validace | ✅ | `transition` / `validateTransition` |
| StateChanged → Event Bus | ✅ | `publishStateChanged` |
| Historie změn | ✅ | `history` / `auditTrail` |

---

## §12–§17 Provoz

| Oblast | Stav |
|--------|------|
| Persist / restore (durable) | ✅ `snapshot` / `restore` |
| Sync view (stejná verze) | ✅ `getSyncedView` |
| AI jen přes API / subscribe | ✅ `assertDirectMutationForbidden` |
| Battle FSM | ✅ `registerBattleState` |
| System state ochrana | ✅ |
| Live wiring | 🟡 |

---

| Dokument | Stav |
|----------|------|
| [0060](./0060-timer-engine.md) | Timer Engine |
| **0061** State Manager | 🟢 kanon + kotva + contract |
| **0062** Runtime Manager | 🟢 kanon + kotva + contract |
| **0063** (plánováno) | Runtime Health & Watchdog |
