# MIA Audit — Etapa 3E: MIA Voice / TTS (shoda s kánonem)

**Datum:** 2026-07-27  
**Typ auditu:** Behavior correctness — **Voice/TTS pipeline** proti kánonu (Edge TTS, speaker routing, fronta, MIA_VOICE audio delivery).  
**Metodika od 3E:** u live/ops oblastí uvádět **Poslední ověření** (fresh vs historický důkaz).

---

## Co Etapa 3E pokrývá

| Oblast | Rozsah |
|--------|--------|
| **Edge TTS / speech synthesis** | `MIA_TTS_ENGINE.js`, `edge-tts-universal`, cache, OpenAI fallback, hlasy Vlasta/Antonín |
| **Voice queue / lock / priority** | `MIA_DELIVERY_RUNTIME` speak queue (max 6), `MIA_VOICE_PRIORITY`, preempt |
| **Voice timing** | `MIA_VOICE_TIMING` → `voiceHoldUntilTs` |
| **Dual voice policy** | `MIA_DUAL_VOICE` default **OFF**; opt-in `=1` |
| **Speaker routing** | `MIA_SPEAKER_ROUTING` — MIA vs Koj TTS/speech stránka (ne vitals) |
| **`MIA_VOICE` OBS browser** | TTS audio delivery; cross-link 3D pro OBS infra |
| **Anti-echo / monitor / single authority** | Desktop mute, Monitor and Output, client localStorage lock, `voiceMirror` filter |
| **Voice revive** | `obs:revive-voice`, dashboard, autoplay unlock |
| **Delivery runtime TTS path** | `maybeDeliverMiaVoice`, overlay queue flush po TTS |
| **Voice-first** | bublina skrytá při TTS (`applyVoiceOverlayPolicy`) |
| **Gift s hudbou → bublina** | TTS potlačen (`suppressGiftVoice`) — cross-link 3A |
| **AQ / auto-queue** | default OFF pokud souvisí s voice (kill switch) |
| **Hosts/ctx** | `MIA_VOICE_*`, `MIA_TTS_*`, `MIA_SPEAKER_ROUTING`, `MIA_DELIVERY_RUNTIME`, `mia-voice-overlay` |

**Mimo rozsah 3E (cross-link):**

| Oblast | Kde |
|--------|-----|
| Gift tier/spam/rotation | **Etapa 3A** `docs/MIA_AUDIT_ETAPA_3A_GIFTS/` |
| miaPoints / ledger | **Etapa 3B** `docs/MIA_AUDIT_ETAPA_3B_MIA_BODY_ECONOMY/` |
| Koj vitals / CARE / bowl 95/100 | **Etapa 3C** `docs/MIA_AUDIT_ETAPA_3C_KOJNOZROUT/` |
| Full OBS manifest / bootstrap / watchdog | **Etapa 3D** `docs/MIA_AUDIT_ETAPA_3D_OBS_RUNTIME/` |
| Overlay HTML layout / public strip (full) | → **3F Overlay Runtime** |
| Persistence voice state files (hlubší) | → **3G Persistence & Recovery** |

---

## Vztah k ostatním etapám

| Etapa | Složka | Co měří |
|-------|--------|---------|
| **2** | `docs/MIA_AUDIT_ETAPA_2/03_FLOW_MIA_BODY_SPEECH.md` | Flow map TTS |
| **3 (Capability)** | `docs/MIA_AUDIT_ETAPA_3/04_TTS_OVERLAY_OBS.md` | Schopnosti (ne compliance) |
| **3A** | Gift video + music → bubble | 3E ověřuje **TTS suppress**, ne tier ekonomiku |
| **3C** | Koj identity / dual voice OFF | 3E ověřuje **TTS/speech routing**, ne CARE |
| **3D** | OBS `MIA_VOICE` browser, ensure-voice | 3E ověřuje **audio path + TTS engine**, ne bootstrap/manifest |
| **3E (tento audit)** | `docs/MIA_AUDIT_ETAPA_3E_VOICE_TTS/` | **Voice/TTS vs kánon** |

> **Cross-link 3D:** OR-16/OR-17/OR-57/OR-62 — OBS transport; zde Edge TTS + queue + routing.  
> **Cross-link 3C:** KJ-70 dual voice OFF; speaker lanes → TTS strana zde.  
> **Cross-link 3A:** Gift s embedded audio → bublina, TTS off.

---

## Zdroje důkazů

- Kánon: `docs/KANON_MIA_ALIGNMENT.md` §14–15, Stream Engine 13f/13g/13w/13x, `docs/OBS_LIVE_SETUP.md` §4–5, `docs/master-canon/0035-speech-engine.md` (skim), `docs/MIA_PRESTREAM_DOD.md`, Etapa 2/3 TTS docs
- Guardrails: dual voice default OFF (`MIA_DUAL_VOICE.js`, Prestream DoD, capability matrix) — v `.cursor/rules/mia-guardrails.mdc` explicitně neuváděno (viz GAP)
- Kód: `scripts/MIA_TTS_ENGINE.js`, `MIA_SPEAKER_ROUTING.js`, `MIA_DELIVERY_RUNTIME.js`, `MIA_VOICE_*`, `MIA_DUAL_VOICE.js`, `obs_ensure_voice.js`, `obs_revive_voice.js`, `mia-voice-overlay.html`, `routes/tts.js`, `routes/voice.js`
- Testy: `tests/speaker_routing*`, `voice_*`, `tts_*`, `mia_voice_revive_13f*`, `overlay_voice_queue*`, `delivery_runtime*`
- Historický live: `docs/MIA_R1C_OBS_RESULT.md` — Audio krok 9 PASS **2026-07-26** (ne fresh 2026-07-27)

---

## Metodika a statusy

| Symbol | Význam |
|--------|--------|
| ✅ | Shoda — kánon a implementace se shodují (kód a/nebo contract) |
| ⚠ | Částečná shoda / drift — jádro OK, detail, docs nebo aspirace master canon |
| ❌ | Rozpor — porušení tvrdého pravidla |
| ❓ | Neověřeno — chybí důkaz bez live session v tomto běhu |

**Pravidlo:** Při nejasnosti → **❓ NEOVĚŘENO**, ne domněnka.

**Poslední ověření:** rozlišovat **fresh v tomto běhu (2026-07-27, code/contract review)** vs **historický live (např. R1-C 2026-07-26)** vs **nikdy**.

---

## Omezení auditu

- **Žádné změny aplikačního kódu** — pouze analýza a dokumentace.
- Live OBS / Edge TTS end-to-end **nebyl součástí tohoto běhu** — spoléháme na contract testy + historický R1-C Audio PASS.
- Gift ekonomika, Koj CARE, plný OBS bootstrap — **neopravujeme**; cross-link.
- Mezery jsou záznam pro **DECISION later**, ne auto-fix.
