# Dirty tree po checkpointu C5

**Datum:** 2026-07-21  
**HEAD (C5):** `bc126646` (Archive deletes) · **docs tip:** `fbe33969`  
**C1–C5:** lokálně DONE · **nepushnuto**  
**Zdroj:** `git status --short` (~230 paths) — **refresh 21.7. večer: shoda** s inventářem níže  
**Další dávky (ready `git add`):** [`MIA_DIRTY_TREE_NEXT_COMMITS.md`](./MIA_DIRTY_TREE_NEXT_COMMITS.md)

Checkpoint hashes: viz [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md).

---

## Verdikt

Zbytek dirty tree **není** jedna sada na další mega-commit.  
Doporučení: **necommittovat leftovers teď** — až po manuálním uchu, a pak jen malé koherentní balíčky (C6a/C6b odděleně od C6canon). Detail: [`MIA_DIRTY_TREE_NEXT_COMMITS.md`](./MIA_DIRTY_TREE_NEXT_COMMITS.md).

| Bucket | Akce teď |
|--------|----------|
| **A** data / live | ignorovat (gitignore / necommit) |
| **B** runtime leftovers | budoucí malý commit až po smoke |
| **C** master-canon / `mia-*-core` | oddělený kanonický track — **ne** předstream |
| **D** tmp / noise | smazat nebo ignorovat |
| **E** ostatní | case-by-case (`.env.example` OK drobný commit později) |

---

## (A) Safe to ignore / data live

Živý stav, cache, generované artefakty — **necommitovat**.

**Modified `data/`:**

- `data/gift-map-stats.json`
- `data/koj-obs-visual-audit.json`
- `data/kojnozout-state.json`
- `data/kojnozout-world.json`
- `data/mia-chat-lexicon.json`
- `data/mia-session-memory.json`
- `data/platform-arena.json`
- `data/story-memory.json`

**Untracked `data/`:**

- `data/avatar-cache/*.bin` (3 soubory)
- `data/mia-action-queue.json`
- `data/mia-theme.json`
- `data/runtime-state.json`
- `data/viewer-inventory.json`
- `data/viewer-memory.json`

**Generated overlays:**

- `mia-output-overlay/generated/gift-animations/`
- `mia-output-overlay/generated/gift-moments/*.png`
- `mia-output-overlay/generated/media-templates/*.png`
- `mia-output-overlay/generated/story-moments/*.png`

---

## (B) Leftover runtime — kandidát na budoucí commit

Není součástí C1–C5; ~30 modified files (+ pár untracked skriptů). Diff ~+1097/−133.  
**Až** bude jeden jasný příběh (např. arena/speaker/gift-media), ne dřív.

**Overlay / routes:**

- `mia-output-overlay/arena-battle-overlay.html`
- `mia-output-overlay/assets/mia-sound-cues.js`
- `mia-output-overlay/assets/mia/hologram.png`
- `mia-output-overlay/assets/kojnozrout/moods/_OFFLINE_MOVED.md` (untracked)
- `routes/obs.js`
- `routes/overlay.js`

**Scripts (modified):**

- `scripts/MIA_ARENA_BATTLE_DEMO.js`
- `scripts/MIA_CAPYBARA_FLOW_RUNTIME.js`
- `scripts/MIA_ECOSYSTEM_ORCHESTRATOR.js`
- `scripts/MIA_GIFT_MEDIA_RUNTIME.js`
- `scripts/MIA_GIFT_PRESENTATION.js`
- `scripts/MIA_INGEST_UTILS_RUNTIME.js`
- `scripts/MIA_KOJNOZROUT_PERSISTENCE.js`
- `scripts/MIA_OBS_SAFE_CALL.js`
- `scripts/MIA_OVERLAY_STATE.js`
- `scripts/MIA_PLATFORM_ARENA.js`
- `scripts/MIA_SPEAKER_ROUTING.js`
- `scripts/MIA_STARTUP_CHECK.js`
- `scripts/MIA_SUPPORT_REACTION_POLICY.js`
- `scripts/run_preflight_tests.js`

**Scripts (untracked, zvážit s B):**

- `scripts/MIA_DUAL_VOICE.js`
- `scripts/kojnozrout_offline_paths.js`

**Shared + tests:**

- `shared/gifts/gift_map/gift_catalog.json`
- `shared/gifts/gift_map/gift_voice_map.json`
- `shared/next_decision/share_decision_engine.js`
- `shared/platform_runtime_rules/decision_engine.js`
- `shared/runtime_execution/run_runtime_execution_bridge.js`
- `tests/capybara_flow_runtime_contract.js`
- `tests/platform_arena_contract.js`
- `tests/runtime_smoke.js`
- `tests/runtime_state_seed_ctx_contract.js`
- `tests/speaker_routing_contract.js`
- `tests/vitals_companion_contract.js`

---

## (C) Master-canon / shared `mia-*-core`

Velký parallel track — **ne míchat** s předstream runtime.

- `docs/master-canon/`
- `docs/_export_*.md` (5 exportů pro ChatGPT / plán)
- `_canon_import/`
- `shared/mia-*-core/` (~60 balíčků: achievement … world)
- `tests/mia_master_canon_0001` … `0087_contract.js`

---

## (D) Tmp-audit / noise

Smazat nebo nechat mimo git.

- `.git-c2-status.txt`
- `.tmp-audit-inner.json`
- `.tmp-audit/` (Edge profile + PNG proofy)
- `.tmp-git-status-c5.txt`
- `.tmp-preflight-out.txt`
- `scripts/_tmp_bump_0054.js`
- `test-write-tmp.txt`
- `tmp_canon_0065_out.txt`

---

## (E) Other

- `.env.example` — +4 řádky (User Mode stub komentáře); drobný commit = **C6b** v [`MIA_DIRTY_TREE_NEXT_COMMITS.md`](./MIA_DIRTY_TREE_NEXT_COMMITS.md)
- (žádné secrets v dirty listu — `.env` není ve statusu)

---

## Doporučení (pořadí)

1. **Teď:** docs triage → [`MIA_DIRTY_TREE_NEXT_COMMITS.md`](./MIA_DIRTY_TREE_NEXT_COMMITS.md) (+ ear appendix v PRESTREAM).  
2. **Manuál:** ucho 30 s — viz PRESTREAM appendix. Preview/mute/AQ už 🟢.  
3. **Push C1–C5** až operátor řekne „push“.  
4. **Později:** **C6b** (`.env.example`) → **C6a** (runtime leftovers) → **C6canon** zvlášť; **(A)(D)** necommitovat.
