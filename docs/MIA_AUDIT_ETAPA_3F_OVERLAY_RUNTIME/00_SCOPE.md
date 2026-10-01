# MIA Audit — Etapa 3F: Overlay Runtime (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **stream overlay presentation layer** proti kánonu (poll `/overlay-state`, fronta, pin/priority, public strip, HUD HTML).  
**Metodika od 3E:** u live/ops oblastí uvádět **Poslední ověření** (fresh vs historický důkaz).

---

## Co Etapa 3F pokrývá

| Oblast | Rozsah |
|--------|--------|
| **Public `/overlay-state` strip** | `stripValueFieldsForPublic` — jen `miaPoints` / žádné coins / gift value (cross-link 3B) |
| **Overlay queue** | `MIA_OVERLAY_QUEUE` + flush v `MIA_DELIVERY_RUNTIME` (overlay strana) |
| **Pin vs TTS / priority** | `speech-overlay.html` `pickActiveOverlay` / `resolveVisibleOverlay` — support vs chatter, pin break |
| **Voice-first (overlay side)** | `voiceMirror` filter, TTS mirror přes `voicePlayback`, hide primary bubble (cross-link 3E TTS) |
| **Gift / combo / spam HUD** | `gift-animation-overlay`, `combo-overlay`, wave HUD (cross-link 3A tier math) |
| **Viewer strip / entity / host** | `viewer-strip-overlay`, `entity-overlay`, `host-mode-overlay` (NEJSEM TU prezentace) |
| **Response contract** | `speech_text` / `overlay_text`, intent v meta / responseContract |
| **Music gift → bubble path** | Overlay ≠ doslovný TTS (cross-link 3E suppress) |
| **Cache bust / HTML entrypoints** | bust konstanty v HTML; ownership manifest → 3D |
| **Layout hard zones** | `tiktok-viewer-zones.css` — overlay-owned CSS |
| **Engine2 overlay profiles** | `main\|clean\|host\|game` — stub **OFF** default |
| **Hosts/ctx** | `MIA_OVERLAY_*`, `MIA_OVERLAY_PUBLIC_*`, `MIA_OVERLAY_STATE*`, `MIA_OVERLAY_QUEUE*`, `mia-output-overlay/*.html` |

**Mimo rozsah 3F (cross-link):**

| Oblast | Kde |
|--------|-----|
| Gift tier / spam / rotation math | **Etapa 3A** `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` |
| miaPoints conversion / ledger | **Etapa 3B** `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` |
| Koj vitals / CARE / bowl 95/100 | **Etapa 3C** `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` |
| OBS bootstrap / manifest / watchdog | **Etapa 3D** `docs/MIA_AUDIT_ETAPA_3D_OBS_RUNTIME/` |
| Edge TTS / dual voice / `MIA_VOICE` audio | **Etapa 3E** `docs/MIA_AUDIT_ETAPA_3E_VOICE_TTS/` |
| Deep persistence overlay snapshots | → **3G Persistence & Recovery** |
| Battle scoring choreography deep | → **3H Battle** |
| Editor / Graphics Studio / Paint | → **3I Editor** |

---

## Vztah k ostatním etapám

| Etapa | Složka | Co měří |
|-------|--------|---------|
| **2** | `docs/MIA_AUDIT_ETAPA_2/` | Flow map overlay/speech |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/04_TTS_OVERLAY_OBS.md` | Schopnosti (ne compliance) |
| **3A** | Gift video + combo moments | 3F ověřuje **HUD prezentaci**, ne tier ekonomiku |
| **3B** | miaPoints / strip sémantika | 3F ověřuje **public API hranici** v overlay runtime |
| **3D** | OBS manifest / bust / sync | 3F ověřuje **HTML poll + UX**; OBS ownership v 3D |
| **3E** | Voice/TTS engine + voice-first policy | 3F ověřuje **speech HTML + mirror filter**; TTS engine v 3E |
| **3F (tento audit)** | `docs/MIA_AUDIT_ETAPA_3F_OVERLAY_RUNTIME/` | **Overlay Runtime vs kánon** |

> **Cross-link 3E:** VT-06/VT-47/VT-51 — voice-first + music→bubble; zde pin/pick + HTML.  
> **Cross-link 3D:** OR-* bust/manifest; zde entrypoint HTML a poll UX.  
> **Cross-link 3B:** public strip coins → miaPoints.  
> **Cross-link 3A:** gift tier → combo/gift overlay presentation.

---

## Zdroje důkazů

- Kánon: `docs/KANON_MIA_ALIGNMENT.md` §14–15, § Stream Engine, public strip, voice-first  
- Guardrails: `.cursor/rules/mia-guardrails.mdc` — overlay jen `miaPoints`  
- Prior: `docs/MIA_AUDIT_ETAPA_3/04_TTS_OVERLAY_OBS.md`, Etapa 2 overlay flow, 3A–3E SUMMARY  
- Historický live: `docs/MIA_R1C_OBS_RESULT.md` — Speech 36 / Gift 37 / Combo HUD PASS **2026-07-26** (ne fresh 2026-07-27)  
- Kód: `mia-output-overlay/`, `scripts/MIA_OVERLAY_*`, `MIA_DELIVERY_RUNTIME.js` (queue), `MIA_OVERLAY_PUBLIC_RESPONSE.js`, `speech-overlay.html`  
- Testy: `tests/overlay_*`, `tests/*overlay*`, `tests/mia_graphics_r1_contract.js`, `tests/overlay_layout_contract.js`, `tests/combo_overlay_contract.js`

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a implementace se shodují (kód a/nebo contract) |
| ⚠ | Částečná shoda / drift — jádro OK, detail, docs nebo aspirace |
| ❌ | Rozpor — porušení tvrdého pravidla |
| ❓ | Neověřeno — chybí důkaz bez live session v tomto běhu |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.

**Poslední ověření:** rozlišovat **fresh v tomto běhu (2026-07-27, code/contract review)** vs **historický live (např. R1-C 2026-07-26)** vs **nikdy**.

---

## Omezení auditu

- **Žádné změny aplikačního kódu** — pouze analýza a dokumentace.
- Live OBS overlay end-to-end **nebyl součástí tohoto běhu** — spoléháme na contract testy + historický R1-C.
- Gift ekonomika, Koj CARE, TTS engine, OBS bootstrap — **neopravujeme**; cross-link.
- Mezery jsou záznam pro **DECISION later**, ne auto-fix.
