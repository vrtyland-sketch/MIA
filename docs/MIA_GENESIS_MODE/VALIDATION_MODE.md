# MIA — Validation Mode & Project Status

**Od:** 2026-07-30  
**Režim:** **VALIDATION** (ne vývoj funkcí)

> **Žádná nová funkce, dokud neprojde Gate.**

Cíl už není „něco vymyslet“, ale ověřit v praxi to, co je navrženo.

---

## Aktuální stav

```text
========================================
MIA PROJECT STATUS
========================================
STREAM CORE
🔒 FROZEN

GENESIS DESIGN
✅ COMPLETE

GENESIS INFRASTRUCTURE
✅ COMPLETE

OBS INTEGRATION (WebSocket setup)
✅ COMPLETE

CORE ISOLATION
✅ PASS

OBS DUAL-SCENE CHECKLIST
▶ NEXT — vyplnit v OBS (12 bodů)

COMMIT
🟡 HOLD

PUSH
🟡 HOLD

PUBLIC ACTIVATION
🔒 LOCKED
========================================
NEXT
========================================
1. OBS Dual-Scene Verification
2. First 60 Seconds Test
3. Soak Test
4. Stranger Test
5. Release Review (GO / NO GO)
6. COMMIT → PUSH → Public Activation Day 1
========================================
```

Posuzovat podle **výsledků validačních kroků**, ne podle počtu souborů/funkcí.
Až bude Dual-Scene Verification hotový, projít výsledky → teprve pak First 60 Seconds.
---

## Pravidlo

| Ano | Ne |
|-----|-----|
| Vyplňovat checklisty / Gate PASS hlášení | Nové Genesis funkce |
| Zapisovat nápady do Post-Launch Ideas | Míchat nápady do Genesis v1 |
| Drobné bugfixy kritické pro validaci (po výslovném OK) | Engine 2.0 / battle / hry do v1 |
| Daily Report po Day 1 | Hot-fixy drobností během Day 1 |

Nápady → [`POST_LAUNCH_IDEAS.md`](./POST_LAUNCH_IDEAS.md)

Gate → [`PRE_LAUNCH_GATE.md`](./PRE_LAUNCH_GATE.md)  
OBS ověření → [`OBS_DUAL_SCENE_VERIFICATION.md`](./OBS_DUAL_SCENE_VERIFICATION.md)
