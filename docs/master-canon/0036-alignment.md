# Master Canon 0036 — soulad s projektem

Audit [`0036-animation-engine.md`](./0036-animation-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-animation-core/animationEngine.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Animation API | ✅ | `createAnimationEngine` |
| Vizualizace bez rozhodování | ✅ | `decides: false` |
| Tok událost → emoce → stav → OBS | ✅ | `animate()` contract |
| Bez přehrávání zvuku | ✅ | `playsAudio: false` |

---

## §3 Architektura — 13 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Animation Manager | ✅ | `manageAnimation` |
| Animation State Machine | ✅ | `resolveAnimationState`, `getCharacterStates` |
| Animation Scheduler | ✅ | `scheduleAnimation` |
| Transition Manager | ✅ | `planTransitionPath` |
| Layer Manager | ✅ | `manageLayers` |
| Blend Engine | ✅ | `blendAnimations` |
| Emotion Adapter | ✅ | `adaptEmotionAnimation` |
| Speech Adapter | ✅ | `adaptSpeechAnimation` |
| Battle Adapter | ✅ | `adaptBattleAnimation` |
| OBS Adapter | ✅ | `planObsSync` |
| Animation Cache | ✅ | `lookupAnimationCache`, `storeAnimationCache` |
| Animation Metrics | ✅ | `collectAnimationMetrics` |
| Animation API | ✅ | `createAnimationEngine` |

---

## §16–§19 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| Speech → Animation sync | ✅ contract pipeline |
| Emotion → Animation | ✅ `adaptEmotionAnimation` |
| MIA vs Koj state machines | ✅ oddělené stavy |
| PNG runtime / animation bank | 🟡 `mia-animation-engine/`, `bodyPartState.js` |
| Centrální OBS wiring | 🟡 `MIA_OBS_OVERLAY_SYNC.js` |
| Zakázané aktivity | ✅ `AE_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0035](./0035-speech-engine.md) | Speech Engine |
| **0036** Animation Engine | 🟢 kanon + kotva + contract |
| **0037** Visual Rendering System | 🟢 kanon + kotva + contract |
| **0038** (plánováno) | OBS Integration Layer |
