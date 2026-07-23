# MIA — Předstreamový DoD (operátorský plán)

**Datum:** 2026-07-21  
**Audit:** [`MIA_AUDIT_2026-07-21.md`](./MIA_AUDIT_2026-07-21.md) — verdikt **~92 %** (potvrzeno)  
**Checkpoint 1–5:** **DONE** lokálně (nepushnuto) — viz níže  
**Commit plán:** [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md) · dirty tree: [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md)

### Confirmed status 2026-07-21 evening

| Položka | Stav |
|---------|------|
| Preview | 🟢 |
| AQ soak | 🟢 |
| Mute logika | 🟢 |
| Ucho (manuál listen) | ⏳ stále otevřené |
| DoD | **~94 %** |
| Push | **NE** — až po explicitním go |
| C1–C5 + docs | lokálně commitnuto (`874227d6`…`bc126646`, docs `4bf3e582`) |
| Zbytek dirty | odděleně — [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md) · dávky [`MIA_DIRTY_TREE_NEXT_COMMITS.md`](./MIA_DIRTY_TREE_NEXT_COMMITS.md) |

MIA ready na finální manuální check + safe checkpoint. Největší otevřené: **ucho** + push wait + leftover dávky (ne C1–C5 — ty jsou hotové).

Toto je poctivý předstreamový checklist — ne marketingové „skoro hotovo“.

---

## 1. Co je skutečně hotové

MIA má zelený hlavní řetězec:

```text
TikFinity / Kick
→ runtime F1–F4
→ Director / gift logika / Koj
→ OBS overlaye
→ aktivní grafika 36 + gift momenty 37
```

Nejde o rozbitý prototyp. Je to **funkční stream runtime** s pár provozními dluhy před ostrým nasazením.

| Úroveň | Bust | Role |
|--------|------|------|
| Freeze baseline | `32-gfx-whole` | Oficiální grafický checkpoint — neměnit |
| Active runtime | `36-koj-unify` | Speech / Koj / bowl |
| Gift-only polish | `37-stream-polish` | Gift animation overlay + desk |

---

## 2. Největší riziko teď není funkce

**~923 necommitnutých paths na masteru** — větší riziko než vypnutý Theme Manager nebo Tech Forms.

Bez checkpointu bude při regresi těžké poznat:

- co bylo funkční,
- co patří k Runtime F1–F4,
- co je grafika,
- co jsou mazání archivů,
- co je experiment,
- co způsobilo regresi.

**Necommittovat** vše jedním obřím „MIA hotovo“ commitem.

---

## 3. Doporučené pořadí

### 3.1 Bezpečný checkpoint — **DONE** (lokálně, nepushnuto)

| # | Obsah | Hash (short) |
|---|--------|--------------|
| 1 | Runtime F1–4 | `874227d6` |
| 2 | Post-DoD / AQ / gift 37 | `b5d51352` |
| 3 | Graphics 36/37 | `34f9816e` |
| 4 | Docs / DoD | `306eb61d` |
| 5 | Archive deletes | `bc126646` |

HEAD po C5 = `bc126646`; docs checkpoint hashes = `4bf3e582`. **Push stále čeká** na explicitní go.

Zbytek dirty tree (odděleně od C1–C5): [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md). Detail splitů: [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md).

### 3.2 OBS Preview test — **PASS** (2026-07-21 ~20:00 CEST)

Automatizace + screenshoty:

- [x] `MIA_BUBBLE` enabled + refresh (`36-koj-unify`) — viz `.tmp-audit/prestream-mia-bubble.png`
- [x] `KOJNOZROUT_RUNTIME` enabled — half-robot Koj viditelný (`.tmp-audit/prestream-kojnozrout-runtime.png`)
- [x] bowl (`KOJNOZROUT_BOWL_V2`) enabled — `.tmp-audit/prestream-kojnozrout-bowl-v2.png`
- [x] `MIA_GIFT_ANIMATION` URL `?v=37-stream-polish` (OBS + `/health`)
- [x] body-parts OFF (`MIA_HEAD/TORSO/EYES/HANDS/FEET` + preview)
- [x] gift idle = průhledný (screenshot černý = OK)
- [ ] profilovka / jméno / `miaPoints` na aktivním gift momentu — **human** po ostrém T3/T4 stubu v Preview

Pomůcka: `npm run obs:refresh-overlays` — běh OK (`refreshed:26`, core 6/6). Scéna: `.tmp-audit/prestream-preview-scene.png`.

### 3.3 Mute test — **PASS** (logika) / **⏳** (ucho)

Cesta: **OBS `SetInputMute` na `MIA_VOICE`** (žádné admin/env TTS mute API). TikFinity widget už muted.

- [x] TTS mute **nezastaví** logiku — T1 při mute → `viewerMemory` (`prestream-mute-t1`, 15 pts)
- [x] dual voice **OFF** (`MIA_DUAL_VOICE` unset; TikFinity muted, jen `MIA_VOICE` unmuted po testu)
- [x] po unmute AQ depth 0 (OBS mute drainí TTS do muted zdroje → žádný AQ dump)
- [ ] ucho: žádná fronta starých vět po unmute — **human 3–5 s**

Report: `.tmp-audit/prestream-mute-report.json`.

### 3.4 Krátký AQ soak — **PASS** (2026-07-21)

Admin API soak (AQ default zůstává OFF po testu):

| Krok | Výsledek |
|------|----------|
| AQ ON | 🟢 `enabled:true`, killSwitch false |
| T1 spam ×8 | 🟢 8/8 ok |
| T2 + chat + T3 | 🟢 |
| depth během soaku | 🟢 max **0** (coalesce/drain; window 2500→1800 po T3) |
| Flush | 🟢 `flushed:true`, depth 0 |
| AQ OFF | 🟢 `enabled:false` |

Report: `.tmp-audit/prestream-aq-soak.json`.

Detail: [`MIA_AQ_PRODUCTION.md`](./MIA_AQ_PRODUCTION.md) · [`MIA_POST_DOD_PROGRESS.md`](./MIA_POST_DOD_PROGRESS.md).

### 3.5 Srovnat dokumentaci

Starší tvrzení `gift overlay = 36` nahradit modelem:

```text
freeze baseline = 32-gfx-whole
active runtime bust = 36-koj-unify
gift-only polish = 37-stream-polish
```

---

## 4. Co před streamem vůbec nezapínat

| Věc | Proč |
|-----|------|
| Theme Manager | MVP OFF by design; neskákat do theming refactorem |
| Tech Forms | OFF / stub |
| User Mode | stub |
| multi-tenant | deferred |
| dual voice | musí zůstat OFF |
| rozsáhlý split `index.js` | důležitý, ale **ne těsně před streamem** — riziko rozbití fungujícího runtime |

Nejdřív checkpoint + živý test, potom chirurgický rozklad monolitu.

---

## 5. Finální DoD před ostrým streamem (100 %)

Za **stream-ready 100 %** považovat:

| Podmínka | Nutnost | Stav (21.7.) |
|---------|---------|--------------|
| Runtime F1–F4 testy zelené | ✅ | 🟢 |
| OBS všechny aktivní zdroje viditelné | ✅ | 🟢 refresh+screenshoty (gift moment jméno/pts ⏳ human) |
| Gift overlay opravdu načítá v37 | ✅ | 🟢 URL live `37-stream-polish` + idle transparent |
| TTS mute/unmute bez backlogu | ✅ | 🟢 logika+AQ; ⏳ ucho 3–5 s |
| AQ buď otestovaná, nebo bezpečně OFF | ✅ | 🟢 soak PASS · default OFF |
| Funkční stav commitnutý | ✅ | 🟢 C1–C5 lokálně (`874227d6`…`bc126646`); push ⏳ |
| Archive deletes oddělené | ✅ | 🟢 C5 `bc126646` |
| Restart obnoví runtime bez ručního opravování | ✅ | 🟡 ověřit po checkpointu |
| Jeden krátký testovací stream bez kritické chyby | ✅ | ⏳ |

---

## 6. Verdikt

| Režim | Verdikt |
|-------|---------|
| **Neveřejný / privátní test stream** | OK — technicky dost daleko |
| **Veřejný ostrý stream** | Checkpoint C1–C5 lokálně hotov; Preview/AQ soak 🟢; zbývá **ucho mute** + push až po go |

AQ může klidně zůstat **OFF**.

---

## Appendix A — Ucho listen (≈ 30 s, human)

Cíl: po unmute **žádná fronta starých vět** (logika mute už 🟢; chybí jen sluch).

1. **0–5 s** — OBS: `MIA_VOICE` unmuted; TikFinity widget zůstává muted; dual voice OFF.  
2. **5–10 s** — mute `MIA_VOICE` → pošli T1 stub (nebo známý test gift) → ověř v logu/memory, že event doběhl.  
3. **10–20 s** — drž mute 5–8 s (TTS by měla jít do muted zdroje / nespílat do ucha).  
4. **20–25 s** — unmute `MIA_VOICE` → **poslouchej 3–5 s**: ticho nebo jen *nová* věta, ne dump starých.  
5. **25–30 s** — PASS = žádný backlog; FAIL = slyšíš frontu → nechat AQ OFF, nepushovat, zapsat do mute reportu.

Po PASS: zaškrtnout „ucho“ v §3.3 / §5 → DoD směrem k 100 %. Push stále jen na explicitní go.

---

## Související

- [`MIA_AUDIT_2026-07-21.md`](./MIA_AUDIT_2026-07-21.md)
- [`MIA_LIVE_DOD.md`](./MIA_LIVE_DOD.md) · [`MIA_LIVE_DOD_RESULTS.md`](./MIA_LIVE_DOD_RESULTS.md)
- [`MIA_COMMIT_PLAN_RUNTIME_1_4.md`](./MIA_COMMIT_PLAN_RUNTIME_1_4.md)
- [`MIA_DIRTY_TREE_AFTER_C5.md`](./MIA_DIRTY_TREE_AFTER_C5.md) · [`MIA_DIRTY_TREE_NEXT_COMMITS.md`](./MIA_DIRTY_TREE_NEXT_COMMITS.md)
- [`MIA_GRAPHICS_WHOLE.md`](./MIA_GRAPHICS_WHOLE.md)
- [`GIFT_ANIMATION_STREAM.md`](./GIFT_ANIMATION_STREAM.md)
