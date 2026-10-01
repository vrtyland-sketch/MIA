# Master Canon 0035 — soulad s projektem

Audit [`0035-speech-engine.md`](./0035-speech-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-speech-core/speechEngine.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Speech API | ✅ | `createSpeechEngine` |
| Jediná hlasová vrstva | ✅ | `validateSpeechInput` vyžaduje CE |
| Tok text → profil → emoce → TTS → sync | ✅ | `speak()` contract |
| Bez mutace textu | ✅ | `mutatesText: false` |

---

## §3 Architektura — 14 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Voice Manager | ✅ | `manageVoice` |
| Speech Queue | ✅ | `enqueueSpeech` |
| TTS Manager | 🟡 | anchor `scripts/MIA_TTS_ENGINE.js` |
| Voice Profile Manager | ✅ | `getVoiceProfile` |
| Emotion Voice Adapter | ✅ | `adaptEmotionVoice` |
| Lip Sync Engine | ✅ | `planLipSync` |
| Facial Sync Manager | ✅ | `planFacialSync` |
| Gesture Synchronizer | ✅ | `planGestureSync` |
| Overlay Synchronizer | ✅ | `planOverlaySync` |
| Speech Scheduler | ✅ | `scheduleSpeech`, `interruptSpeech` |
| Speech Cache | ✅ | `lookupSpeechCache`, `storeSpeechCache` |
| Voice Effects | ✅ | `applyVoiceEffects` |
| Speech Analytics | ✅ | `collectSpeechAnalytics` |
| Speech API | ✅ | `createSpeechEngine` |

---

## §19–§21 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| Conversation Engine → Speech | ✅ contract pipeline |
| MIA vs Koj voice profiles | ✅ oddělené profily |
| OBS / overlay runtime | 🟡 `speech-overlay.html`, `mia-live-lip.js` |
| Centrální ingest hook | ❌ |
| Zakázané aktivity | ✅ `SE_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0034](./0034-conversation-engine.md) | Conversation Engine |
| **0035** Speech Engine | 🟢 kanon + kotva + contract |
| **0036** Animation Engine | 🟢 kanon + kotva + contract |
| **0037** (plánováno) | Visual Rendering System |
