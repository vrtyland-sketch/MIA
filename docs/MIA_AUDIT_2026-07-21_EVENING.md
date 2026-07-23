# MIA Audit — 2026-07-21 (evening)

**Scope:** Re-test po C1–C5 + C6a/b · phase1–4 · preflight:fast · live `/health` + admin status  
**Předchozí audit:** [`MIA_AUDIT_2026-07-21.md`](./MIA_AUDIT_2026-07-21.md) (~92 %)  
**Commit tohoto doc:** viz git (message `docs: refresh evening audit after C6a/b and test run`)

---

## 1. Verdikt

**Stream-ready ~94 %** — automatika zelená; operátorské Preview/ucho a push C1–C6 stále čekají.  
Runtime Fáze 1–4, OBS WS, dual bust `36`/`37`, admin API a post-C6a leftover runtime jsou v historii. Zbývá **canon dirty** (`_canon_import` / `shared/mia-*-core` / master-canon tests) + **živá `data/`**.

---

## 2. Commits on master (local, not pushed)

Z `git log -12 --oneline` (HEAD `9bef6b5e`):

| Tag | Hash | Message |
|-----|------|---------|
| **C6a** | `9bef6b5e` | chore: leftover arena/speaker/gift-media runtime after C5 |
| **C6b** | `a41c5a9b` | docs: note User Mode stub flags in .env.example |
| **C6docs** | `653f83ad` | docs: triage leftover dirty tree into next commit batches after C5 |
| docs DoD | `fbe33969` | Record confirmed pre-stream status Preview/AQ/mute at ~94% DoD |
| docs hashes | `4bf3e582` | Record local pre-stream checkpoint hashes for commits 1-5 |
| **C5** | `bc126646` | Move Koj archive and prenorm backups offline for hot-path cleanup |
| **C4** | `306eb61d` | Sync pre-stream DoD docs and dual-bust graphics documentation |
| **C3** | `34f9816e` | Checkpoint graphics 36/37: Koj unify, Soft Neon stack, and gift creatures |
| **C2** | `b5d51352` | Add post-DoD gift stages, AQ production controls, and gift bust 37 |
| **C1** | `874227d6` | Checkpoint Runtime phases 1–4: event pipeline, Director, game layer, profiles |
| hygiene | `d579e1fd` | Ignore local hero-alpha debug PNG scratch files |
| hygiene | `55bf7e4f` | Ignore generated TTS audio-cache artifacts |

Plán: [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md) · leftover triage: [`MIA_DIRTY_TREE_NEXT_COMMITS.md`](./MIA_DIRTY_TREE_NEXT_COMMITS.md).  
**Push:** ne (čeká explicitní go).

---

## 3. Dirty remaining (canon vs data)

`git status --porcelain` ≈ **177 paths** (evening):

| Bucket | ~Count | Commit? |
|--------|--------|---------|
| **Canon** — `shared/mia-*-core/` | ~67 | **C6canon** (oddělený track) |
| **Canon** — `tests/mia_master_canon_*` | ~87 | s C6canon |
| **Canon** — `_canon_import/` · `docs/master-canon/` | 2 dirs | s C6canon |
| **Data** — modified + untracked live JSON/bin | ~16 | **ne** (živý stav / cache) |
| **Docs export scratch** — `docs/_export_*.md` | ~5 | triage / ignore |

Runtime leftover z bucketu B po C5 = **hotovo v C6a**. Necommitovat `data/**`.

---

## 4. Flags defaults (live status)

| Flag / vrstva | Default | Live evening |
|---------------|---------|--------------|
| Action Queue | **OFF** | `enabled:false` · depth 0 |
| Director | **ON** | `enabled:true` |
| Theme Manager | **OFF** | `enabled:false` · active `cyber` |
| Tech Forms | **OFF** | `enabled:false` |
| Battle MVP | **ON** | `mvpEnabled:true` |
| User Mode | **OFF** (stub) | `enabled:false` · `stub:true` |
| Profiles / export | **ON** | phase **4** |
| Stream session | — | `PRELIVE` |

Kill/enable: `MIA_ACTION_QUEUE` · `MIA_DIRECTOR=0` · `MIA_THEME_MANAGER=1` · `MIA_TECH_FORMS=1` · `MIA_USER_MODE=1` (stub).

---

## 5. Graphics busts 32 / 36 / 37

| Úroveň | Bust | Role | Live URL |
|--------|------|------|----------|
| **Freeze** | `32-gfx-whole` | Oficiální art baseline — neměnit | checkpoint doc |
| **Aktivní** | `36-koj-unify` | Speech / Koj runtime / bowl | `/health` overlays ✓ |
| **Gift only** | `37-stream-polish` | Gift animation overlay + desk | `giftAnimation?v=37-stream-polish` ✓ |

OBS musí mít gift source na **37**, ne starý gift URL na 36.

---

## 6. DoD ~94 % status

| Kontrola | Evening |
|----------|---------|
| `/health` | 🟢 `ok:true`, `obsConnected:true`, Kick bridge connected |
| `/api/mia-admin/status` | 🟢 `phase:4`, director ON, AQ OFF, theme OFF |
| Overlay busts | 🟢 speech/bowl/runtime `36` · gift `37` |
| `node --check index.js` | 🟢 |
| `test:phase1` … `phase4` (+ storyboard v phase2) | 🟢 |
| `test:preflight:fast` | 🟢 152/152 po **1× retry** (1. běh: flaky `ingest_contract` Kick logs) |
| `test:master-canon` | ⏭ skip — ~87 contract files, dlouhý chain (C6canon track) |
| Preview / TikFinity mute | 🟡 manuál (beze změny) |
| AQ live soak | 🟡 záměrně OFF |
| Git dirty | 🟡 canon+data (~177); runtime C6a hotovo |
| Push C1–C6 | 🔴 čeká |

**Skóre: ~94 % 🟢 stream-ready** — shoda s `fbe33969` pre-stream záznamem. Blokující automatika: žádná. Operátor + push + C6canon zůstávají.

---

## 7. Top risks

| Riziko | Závažnost | Poznámka |
|--------|-----------|----------|
| **Push neproveden** | střední | C1–C6a/b jen lokálně — ztráta při disk fail |
| **Canon dirty (~155+)** | střední | `_canon_import` + `mia-*-core` + 87 tests — nesměšovat s runtime |
| **`index.js` monolyt** | vysoká (dlouhodobě) | Fáze 1–4 = obal, ne split jádra |
| **AQ default OFF** | střední (záměr) | bez live soaku; zapnutí mění TTS/gift path |
| **Flaky ingest_contract** | nízká | Kick log assert; 1. preflight fail → retry OK |
| **Dual bust 36/37** | nízká | OBS gift musí být na 37 |
| **Živá `data/` dirty** | info | neočekávat v commitách |

---

## 8. Smoke snapshot (evening)

```
ok: true
obsConnected: true
phase: 4
streamSession: PRELIVE
director.enabled: true
actionQueue.enabled: false
themeManager.enabled: false (active: cyber)
userMode.enabled: false (stub)
giftAnimation: …?v=37-stream-polish
speech/runtime/bowl: …?v=36-koj-unify
kickBridge: connected
```

**Server:** již běžel na `127.0.0.1:3000` (start nebyl nutný).

---

## 9. Test run summary (evening)

| Test | Result |
|------|--------|
| `node --check index.js` | PASS |
| `npm run test:phase1` | PASS |
| `npm run test:phase2` (incl. Lion/Universe/Galaxy/Rose storyboard) | PASS |
| `npm run test:phase3` | PASS |
| `npm run test:phase4` | PASS |
| `npm run test:preflight:fast` | PASS (retry; 1. běh FAIL ingest_contract) |
| `npm run test:master-canon` | SKIPPED (huge / C6canon) |
