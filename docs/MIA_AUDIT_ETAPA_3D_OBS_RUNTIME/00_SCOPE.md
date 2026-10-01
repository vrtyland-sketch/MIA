# MIA Audit — Etapa 3D: OBS Runtime (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **OBS jako render vrstva** proti kánonu TikFinity → MIA → OBS (žádná business logika v OBS).

---

## Co Etapa 3D pokrývá

| Oblast | Rozsah |
|--------|--------|
| **Architektonická role OBS** | Render-only; rozhodování, ekonomika, vitals, gift logika v MIA |
| **Bootstrap / connect / reconnect** | `MIA_OBS_BOOTSTRAP.js`, WebSocket lifecycle, health snapshot, `/obs/reconnect` |
| **Live manifest** | `MIA_OBS_LIVE_MANIFEST.js` — jediný zdroj pravdy pro browser sources |
| **Cache bust vrstvy** | `36-koj-unify` (speech/bowl/manifest URL), `37-stream-polish` (gift anim), `49-r1-milestone-polish` (Koj split libs uvnitř runtime HTML) |
| **`obs:refresh-overlays`** | Refresh cache + URL bust v OBS browser sources |
| **Browser source URLs** | Split režim, aliasy jmen (`MIA_BUBBLE` ↔ `MIA_SPEECH`), gift/koj/speech/bowl/voice |
| **Layout / scene transforms** | `obs:fix-layout`, `obs_fix_overlay_layout.js`, hard zones v CSS |
| **Portrait / landscape** | `obs:portrait` / `obs:landscape` — canvas 1080×1920 vs 1920×1080 |
| **Video engine → OBS** | `MIA_VIDEO_ENGINE.js` — Media Source sloty T1–T5, queue, scene switch |
| **Overlay sync** | `MIA_OBS_OVERLAY_SYNC.js` — URL update, refresh, voice monitor, visibility |
| **Post-connect bootstrap** | Hands, layout fix, voice ready, persistent layers on top, optional vision refresh |
| **Hands / body sources** | `MIA_OBS_HANDS.js`, `bodyPartsCatalog` — **default OFF** na live |
| **Scene guard** | `MIA_OBS_SCENE_GUARD.js` — diagnostika mrtvých souborů ve scénách |
| **Watchdog** | `MIA_OBS_WATCHDOG.js` — relaunch OBS po pádu procesu |
| **Away scéna** | `MIA_OBS_AWAY_SCENE.js`, `SPINAK_NEJSEM_TU` — částečně stub |
| **R1-C historický důkaz** | PASS 2026-07-26 — speech 36, gift 37, Koj 49, layout, audio |

**Mimo rozsah 3D (cross-link):**

| Oblast | Kde |
|--------|-----|
| Gift tier resolver, spam cap, video rotace logika | **Etapa 3A** `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` |
| miaPoints konverze, ledger, public strip sémantika | **Etapa 3B** `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` |
| Koj vitals, CARE, bowl **behavior** (95/100 trigger) | **Etapa 3C** `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` |
| TTS engine, voice queue, dual voice policy | Etapa 3 capability `04_TTS_OVERLAY_OBS.md` → **3E MIA Voice/TTS** |
| Editor / Graphics Studio export | Etapa 3 `06_EDITOR_GRAPHICS.md` |

---

## Vztah k ostatním etapám

| Etapa | Složka | Co měří |
|-------|--------|---------|
| **2** | `docs/MIA_AUDIT_ETAPA_2/` | Flow (`04_TTS_OVERLAY_OBS` oblast) |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/` | Schopnosti (`04_TTS_OVERLAY_OBS.md`, `08_PERSISTENCE_WATCHDOG_RECOVERY.md`) |
| **3A** | `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` | Gift video path, bowl fill wiring, overlay public API |
| **3B** | `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` | miaPoints — OBS jen zobrazuje stripnutý snapshot |
| **3C** | `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` | Koj browser sources, anchors, render-report |
| **3D (tento audit)** | `docs/MIA_AUDIT_ETAPA_3D_OBS_RUNTIME/` | **OBS runtime infra vs kánon** |

> **Cross-link 3A:** G-01 architektura, G-06 overlay strip, gift overlay bust `37`, video sloty T1–T5 — zde ověřeno **OBS transport**, ne gift ekonomika.  
> **Cross-link 3B:** Public API strip na `/overlay-state` — OBS browser sources jen pollují; coin leak = MIA hranice, ne OBS.  
> **Cross-link 3C:** KJ-02 Koj pozice, KJ-04 runtime/bowl overlays, KJ-55 render-report — zde layout + manifest + propriocepce.

---

## Zdroje důkazů

- Kánon: `docs/OBS_LIVE_SETUP.md`, `docs/KANON_MIA_ALIGNMENT.md` § Stream Engine, `.cursor/rules/mia-guardrails.mdc`, `docs/KANON_MIA_AGENT.md`
- Kód: `scripts/MIA_OBS_*.js`, `scripts/MIA_VIDEO_ENGINE.js`, `scripts/obs_*.js`, `shared/mia-graphics-studio/bodyPartsCatalog.js`
- HTML/runtime: `mia-output-overlay/*.html`, `mia-output-overlay/kojnozrout-runtime.html`
- Testy: 24+ contract souborů `tests/obs_*`, `tests/mia_obs_*`, `tests/mia_graphics_r1_contract.js`
- Manuální gate: `docs/MIA_R1C_OBS_RESULT.md` (PASS 2026-07-26), `docs/MIA_GRAPHICS_R1_STATUS.md`

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a implementace se shodují (kód a/nebo contract / R1-C) |
| ⚠ | Částečná shoda / drift — jádro OK, detail, docs nebo live mezera |
| ❌ | Rozpor — OBS dělá business logiku nebo porušuje tvrdé pravidlo |
| ❓ | Neověřeno — chybí důkaz bez live OBS session v tomto běhu |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.

---

## Omezení auditu

- **Žádné změny kódu** — pouze analýza a dokumentace.
- Live OBS end-to-end **nebyl součástí tohoto běhu** — spoléháme na contract testy + historický R1-C PASS.
- Gift ekonomika, Koj CARE, bowl 95/100 — **neopravujeme**; cross-link na 3A/3C pro rozhodnutí později.
- Mezery jsou záznam pro **DECISION later**, ne auto-fix.
