# MIA Graphics Day Log

Append-only session notes for graphics/R1 work.

---

## 2026-07-24 — Full graphics day (session start)

**Baseline:** `0b6fdc65` (R1 acceptance contract + R1-C checklist)  
**Preflight baseline:** green (`npm run test:preflight:fast`)

### Slice 1 — Combo moment belly HUD (in progress)

- **Goal:** Show combo moment title/count on Koj belly HUD when no gift media / spam wave.
- **Files:** `lib/koj-runtime-belly.js`, `assets/kojnozrout/koj-runtime.css`, split bust bump.
- **Bust:** `44-r1-combo` ? `45-r1-combo-belly` (split libs only; 36/37 unchanged).
