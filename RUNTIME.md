# MIA Runtime — source of truth

Production path:

```
index.js
  → MIA_NEXT/engine_shadow_runtime.js
  → MIA_NEXT/engine_spam_session.js          (gift spam)
  → shared/platform_runtime_rules/decision_engine.js
  → scripts/MIA_SUPPORT_REACTION_POLICY.js   (applied once in shadow runtime)
  → shared/platform_runtime/action_builder.js
  → scripts/MIA_RESPONSE_ENGINE.js
  → scripts/MIA_LLM_ADAPTER.js               (optional hybrid)
```

Do not edit duplicate forks under `_archive/` — they are not loaded at runtime.

## Kojnožrout companion loop

- **State persistence:** `data/kojnozout-state.json` (feedPoints, bowl, evolution)
- **Evolution tiers:** egg → hatchling (25) → sprout (250) → guardian (2500) → legend (25000)
- **Level-up moment:** detected in `MIA_KOJNOZROUT_ENGINE.js`, delivered via `MIA_KOJNOZROUT_EVOLUTION.js`
  - Gift event → MIA companion line + evolution toast (keeps Koj gift thanks primary)
  - Chat/community feed → Koj primary evolution speech + toast
- **OBS overlays:** `evolution-toast-overlay.html`, `kojnozrout-bowl-overlay.html`, `kojnozrout-runtime.html`, `kojnozrout-duel-overlay.html`

See `docs/KOJNOZROUT_VISION.md` for vitals, backpack, and TikTok duel model.
See `docs/KANON_MIA_ALIGNMENT.md` for project canon vs codebase audit.
See `docs/MIA_MULTI_AGENT_ECOSYSTEM.md` for multi-agent orchestration.

Intelligence modules: `MIA_CHAT_BRAIN.js`, `MIA_TEXT_BANK.js`, `MIA_CHAT_LEXICON.js`, `MIA_SESSION_MEMORY.js`.
