# Kojnožrout — sladění kánonu s kódem

Audit proti [KOJNOZROUT_KANON.md](./KOJNOZROUT_KANON.md) · aktualizováno 2026-06-23

## Legenda

| Symbol | Význam |
|--------|--------|
| ✅ | Implementováno |
| 🟡 | Částečně / stub |
| ⬜ | Plánováno |

## Identita a umístění

| Požadavek | Stav | Kód |
|-----------|------|-----|
| Samostatná entita (ne dekorace) | ✅ | `MIA_KOJNOZROUT_ENGINE.js` |
| Pravý dolní roh, stále viditelný | ✅ | Vision tiktok anchors + runtime |
| Většinu času spí / pozoruje | ✅ | vitals sleepDepth + display `calm`/`cozy` |
| Aktivace při významných událostech | ✅ | gift, care, T4, duel, combo |

## Zdroje energie

| Zdroj | Stav | Modul |
|-------|------|-------|
| Chat | ✅ | community ping, vitals communityVibe |
| CARE | ✅ | `MIA_KOJNOZROUT_CARE.js` |
| Support / gifty | ✅ | `applySupportToKojnozout` |
| Nálada komunity | ✅ | `MIA_KOJNOZROUT_VITALS.js` |
| Přítomnost diváků | 🟡 | streamState engagement, spam session |

## Doménová hierarchie

| Vrstva | Stav |
|--------|------|
| Community → CARE → SUPPORT → Events | 🟡 orchestrátor + lanes |
| CARE silnější než chat | ✅ validace + bond impact |

## CARE

| Požadavek | Stav |
|-----------|------|
| Krmení, podrbání, léčení, uklidnění, pozornost | ✅ |
| Venčení | 🟡 `MIA_KOJNOZROUT_WALK.js` |
| Validace (kdo, spam, kontext) | ✅ `MIA_KOJNOZROUT_CARE_VALIDATION.js` |
| Výstupy: mood, bond, neglect | ✅ |

## Reakční pořadí MIA → Koj

| Požadavek | Stav |
|-----------|------|
| Emoční chat: MIA první | ✅ `buildDirectChatResponse` |
| Koj companion po zpoždění | ✅ `deferredKojCompanion` v execution bridge |

## Miska → T4

| Požadavek | Stav |
|-----------|------|
| Plnění z giftů/supportu | ✅ |
| Přechod 95 %+ → T4 na giftu | ✅ `resolveBowlFullSpecialPlayback` |
| Bowl cycle 100 % → T4 | ✅ `resolveBowlCycleSpecialPlayback` |
| Celebrate sprite při plné misce | ✅ display `celebrate` |

## Nálady / sprity

| Požadavek | Stav |
|-----------|------|
| 48 PNG canon set | ✅ |
| Kontextové nálady (combo, duel, gift…) | ✅ `MIA_KOJNOZROUT_DISPLAY.js` |
| 12 eating variant | ✅ |
| Video watch→hype | ✅ |

## Neglect

| Požadavek | Stav |
|-----------|------|
| Bond neglect levels | ✅ `MIA_KOJNOZROUT_BOND.js` |
| Bowl overlay hints | ✅ |

## Batoh, duel, evoluce

| Oblast | Stav |
|--------|------|
| Batoh + item commands | ✅ |
| Duel cross-stream | ✅ |
| Evoluce tiery | ✅ |
| Platform aréna — 4 coin-žrouti | ✅ `MIA_PLATFORM_ARENA.js`, `MIA_KOJ_ROSTER.js` |
| Platform aréna — team bar overlay | ✅ `arena-overlay.html` — live battle pózy z `/arena/status` |
| Battle choreografie + pose cykly | ✅ `MIA_KOJ_BATTLE_CHOREOGRAPHY.js`, `battle-*` pose cykly, `arena-battle-overlay.html` |
| Platformní PNG formy (attack/hit/win/defend/item…) | ✅ `assets/kojnozrout/forms/{platform}/`; regenerace `npm run generate:platform-forms` |
| 2D grafická továrna (100 %) | ✅ projectile · arena · itemy · evoluce · multi-frame battle — `npm run generate:koj-2d-factory` · audit `npm run koj:2d-audit` |

## Budoucí (kánon ⬜)

| Oblast | Stav |
|--------|------|
| Avatar viewer interakce | ⬜ |
| Song playlist queue | ⬜ |
| Docházka bonus batohu | ⬜ |
| Plná integrace NEJSEM TU | ⬜ |
