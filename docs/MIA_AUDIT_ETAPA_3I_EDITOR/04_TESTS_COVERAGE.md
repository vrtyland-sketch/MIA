# Etapa 3I — Pokrytí testy (Editor)

Mapování Editor pravidel na existující contract/smoke testy.  
Preflight profil: `npm run test:preflight:fast` (`scripts/run_preflight_tests.js --fast`).

**Datum:** 2026-07-27  
**Poznámka:** V tomto docs-only běhu testy **neběžely** — tabulka mapuje **existenci** suites.

---

## Legenda pokrytí

| Symbol | Význam |
|--------|--------|
| 🟢 | Contract v preflight:fast (nebo runner volaný z FAST) |
| 🟡 | Test existuje, mimo fast preflight nebo partial |
| 🔴 | Pravidlo bez dedikovaného contractu |
| ❓ | Manuální / live-only / env (Tauri install, Whisper live, AI quality) |

---

## Editor suites v preflight:fast

| Suite | Soubor / runner | Oblast |
|-------|-----------------|--------|
| `mia_paint_integration` | `tests/mia_paint_integration_contract.js` | routes/bridge smoke path |
| `mia_paint_smoke` | `tests/mia_paint_smoke_contract.js` | static + status/WS |
| `graphics_body` | `scripts/run_graphics_body_tests.js` → 12g…14b (+ voice 13f) | Studio body/timeline/lip/staging |

> Plné `npm run test:mia-paint` (core/gpu/stroke/…/tauri) a `npm run test:animation-engine` (bank/phase15–22) jsou **definované**, ale **mimo** FAST list (kromě toho, co vytáhne `graphics_body`).

---

## Testy mimo preflight:fast (existují) — 🟡

| Skupina | Soubory (výběr) | Oblast |
|---------|-----------------|--------|
| Paint core | `mia_paint_core`, `_gpu`, `_stroke`, `_selection`, `_vector`, `_io`, `_animation`, `_ai`, `_plugin`, `_koj_bridge`, `_tauri` | Editor jádro |
| Studio 12b–12f | `mia_graphics_studio_12b…12f` (+ base `mia_graphics_studio_contract`) | Studio early (část mimo graphics_body runner) |
| Animation engine | `mia_animation_engine`, `mia_animation_bank_*`, `mia_timeline_editor`, `mia_phase15`, `mia_phase16` | Timeline / bank / bone |
| Gift visual | `gift_visual_animation_bank`, `gift_animation_*`, `story_animation` | Bank consume |
| Koj 2D | `npm run koj:2d-audit` | Factory audit |
| R1 live gfx | `mia_graphics_r1_contract` | Live HUD ≠ Paint |
| Master / remote | `remote_dev`, master canon graphics (pokud) | Volitelné |

`graphics_body` runner zahrnuje většinu `mia_graphics_studio_12g`…`14b` — ty jsou tedy 🟢 *přes* FAST `graphics_body`, ne jako samostatné FAST jméno.

---

## Mapování ED-* → pokrytí (zkráceně)

| Skupina | ED IDs | Pokrytí | Poznámka |
|---------|--------|---------|----------|
| Governance / isolation | ED-01…11,68 | 🟢/🔴 | smoke+integration 🟢; processEvent 🔴 code-only |
| Shared lip coupling | ED-12 | 🟡 | voice/lip contracts; ne paint suite |
| Bank / staging | ED-13,14,48…52,54 | 🟢/🟡 | graphics_body 🟢; animation-engine 🟡 |
| Desks / remote | ED-15,16 | 🟡 | gift_animation / remote_dev |
| Paint modules | ED-17…26 | 🟢/🟡 | integration/smoke 🟢; full paint 🟡 |
| Tauri / standalone | ED-27…33 | 🟡/❓ | tauri scaffold 🟡; install ❓ |
| Body / OBS | ED-34…44 | 🟢/❓ | graphics_body 🟢; live revive/verify ❓ |
| Timeline / export | ED-45…55 | 🟢/🟡/❓ | timeline+phase v engine 🟡; live camera gift ❓ |
| Bone / AI motion / Whisper | ED-56…60 | 🟡/❓ | phase15 🟡; Whisper live ❓ |
| Assets / plugins | ED-61…66 | 🟡 | koj:2d-audit · plugin · 13a/h |
| Fast ⊂ full | ED-67 | 🔴/⚠ | meta gap |

---

## Odhad pokrytí vůči 68 pravidlům

| Kategorie | Odhad | Poznámka |
|-----------|-------|----------|
| Má contract/evidence (🟢+🟡) | **~50** | Paint + graphics_body + phase/bank |
| Chybí dedikovaný test / jen code | **~12** | isolation meta, remote, sound cues thin, Master |
| Live/manual only (❓) | **~6** | ED-21,33,39,43,55,59 |

**Testováno (SUMMARY):** **50**  
**Chybí test:** 68 − 50 = **18**

---

## Doporučené manuální / live checklisty (❓)

| ID | Checklist |
|----|-----------|
| T-I01 | `npm run paint:tauri` na stroji s Rust → native dialog open/save |
| T-I02 | Paint bez `npm start` — co funguje offline vs co padá |
| T-I03 | Dashboard AI → staging → Paint → promote → gift na live |
| T-I04 | Multi-cam C3 export → live gift resolve shot |
| T-I05 | `obs:revive` body + `verifyGraphicsBodyLayers` proti běžícímu OBS |
| T-I06 | Whisper lip na reálném TTS sample (13v) |

---

## Preflight vs editor maturity

| Profil | Co kryje editor |
|--------|-----------------|
| `test:preflight:fast` | Tenká Paint brána + silný `graphics_body` |
| `npm run test:mia-paint` | Plný Paint stack |
| `npm run test:graphics-body` | Studio 12g–14b |
| `npm run test:animation-engine` | Bank + timeline + phase15–22 (+ immersive OUT) |
| `koj:2d-audit` | Koj factory assets |

*RC stream nepotřebuje Paint* — capability: Paint = lab/tooling mimo stream core. Fast subset je záměrně tenčí než plná editor maturita.
