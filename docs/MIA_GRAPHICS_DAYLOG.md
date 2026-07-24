# MIA Graphics Day Log

Append-only session notes for graphics/R1 work.

---

## 2026-07-24 ù Full graphics day (session start)

**Baseline:** `0b6fdc65` (R1 acceptance contract + R1-C checklist)  
**Preflight baseline:** green (`npm run test:preflight:fast`)

### Slice 1 ù Combo moment belly HUD ?

- **Commit:** `1f52ff98`
- **Goal:** Show combo moment title/count on Koj belly HUD when no gift media / spam wave.
- **Files:** `lib/koj-runtime-belly.js`, `assets/kojnozrout/koj-runtime.css`, split bust bump.
- **Bust:** `44-r1-combo` ? `45-r1-combo-belly` (split libs only; 36/37 unchanged).
- **Preflight:** green

### Slice 2 ù Dashboard manifest cache-bust links ?

- **Goal:** Streamer dashboard reads `/obs/live-manifest` and wires Koj runtime / animBank links with canonical bust URLs; shows overlay bust row.
- **Files:** `mia-streamer-dashboard.html`, `tests/mia_graphics_studio_13n_operator_polish_contract.js`
- **Preflight:** green (pending commit)

### Slice 3 ó Gift Animation Desk manifest bust ?

- **Goal:** Desk loads gift overlay bust from `/obs/live-manifest` instead of stale hardcoded label only.
- **Files:** `mia-paint/gift-animation-desk.html`, `tests/gift_animation_generate_contract.js`
- **Preflight:** green (pending commit)
