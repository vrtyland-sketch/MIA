# MIA Genesis Mode — Audio & Assets Spec

---

## 1. Avatar — pose bank (cíl)

Ne dvě pózy. Cílové stavy Genesis:

| State | Význam | Existující mapování (dnes) | Mezera |
|-------|--------|----------------------------|--------|
| IDLE | klid | `parts/head/idle.png` | jemné blink/breath varianty |
| LISTENING | poslouchá | ≈ idle / think | **dedicated listening** POST-LOCK pokud chybí |
| SPEAKING / TALKING | mluví | `cyber/speak.png` + holo motion | OK |
| GREETING | zdraví | `parts/head/wave.png` | OK |
| THINKING | přemýšlí | `parts/head/think.png` | OK |
| HAPPY / HYPE | radost | `parts/head/happy.png` | OK |
| SURPRISED | překvapení | — | **POST-LOCK** nebo reuse gift/combo |
| SYSTEM_ALERT | upozornění | — | **POST-LOCK**; dočasně duel/combo |
| CALIBRATION | kalibrace | — | **POST-LOCK**; dočasně think |
| DIAGNOSTICS | diagnostika | — | **POST-LOCK**; dočasně think |
| THANK_YOU | dík za přítomnost | gift/happy | map `gift` / `happy` |
| POINT / OVERLAY_HINT | ukazuje k HUD | — | **POST-LOCK** |

**v1 bezpečná mapa (bez nové architektury):**

```text
idle        → parts/head/idle.png
listening   → parts/head/think.png   (do dedicated asset)
speaking    → cyber/speak.png
greeting    → parts/head/wave.png
thinking    → parts/head/think.png
happy       → parts/head/happy.png
surprised   → parts/head/combo.png   (dočasně)
system_alert→ parts/head/duel.png    (dočasně)
calibration → parts/head/think.png
diagnostics → parts/head/think.png
thank_you   → parts/head/gift.png
```

**Pravidla assetů:** stejný canvas, ukotvení, styl, průhledné pozadí, žádný text v PNG.  
Jemné pohyby: blink, breath, head tilt — přes `MiaHoloMotion` (už existuje), ne nový skeleton.

Gift/Koj sprite bank (`animation-bank/`) **není** Genesis hero — neplést.

---

## 2. SFX katalog

| ID | Kdy | Hlasitost | Max/hod |
|----|-----|-----------|---------|
| `boot` | Genesis Sequence start | střední | 1–2 |
| `confirm` | STATUS → LIVE / unlock | střední | dle unlocků |
| `error` | WARNING / reconnect fail (narativ nebo real) | nízká–střední | vzácně |
| `reconnect` | OBS/network revive | střední | vzácně |
| `online` | Voice/OBS ONLINE | střední | 1 / session start |
| `notification` | denní change / milestone | nízká | ≤ 6 |
| `loading` | diagnostics RUNNING | velmi nízká | ≤ 12 |

**Implementace:** preferovat krátké WAV/OGG pod `mia-output-overlay/assets/genesis/sfx/`; fallback WebAudio z `mia-sound-cues.js` stylu jen pokud opt-in.  
Default: SFX **ON** v Genesis scéně (na rozdíl od live `?sfx=1` default OFF) — ale master volume operátor.

Žádný SFX nesmí maskovat MIA_VOICE.

---

## 3. BGM režimy

| Mode | Nálada | Kdy |
|------|--------|-----|
| `startup` | slavnostní, krátký | T+0–2 min Sequence |
| `ambient` | dlouhý bedro | default presence |
| `cyber` | datový, rytmičtější | diagnostics / „scan“ pasáže |
| `calm` | měkký | community / late hours |
| `diagnostics` | tenký pulse | Active diagnostics RUNNING |

**Anti-monotonie:**

1. Track pool ≥ 2 kusy / mode.  
2. Crossfade 4–8 s mezi módy.  
3. Žádný jeden 3h loop bez střihu.  
4. BGM duck −6…−10 dB při TTS.  
5. Licence: pouze cleared / vlastní / výslovně povolené stopy (seznam v `assets/genesis/music/LICENSE.md` při implementaci).

**Stavový soundtrack (APPROVED):** hudba a efekty se mění podle stavu systému:

| Stav | BGM | SFX |
|------|-----|-----|
| Běžný běh | `ambient` / `calm` | řídké |
| Diagnostics / scan | `diagnostics` / `cyber` | `loading` vzácně |
| Unlock ceremony | krátký lift + duck | `confirm` výraznější |
| Důležité oznámení / milestone | `cyber` nebo `startup` stinger | `notification` |
| WARNING / reconnect | `diagnostics` tlumené | `error` / `reconnect` |

---

## 4. Vizuální FX (non-character)

| FX | Spec |
|----|------|
| Datové linky | pomalé bezier / grid pulses, nízká opacity |
| Částice | ≤ 80 aktivních, bez bloom overload |
| Terminal caret | blikání 530 ms |
| Status LED | soft glow, ne neon spam |
| Readiness bar | tenký, brand-aligned |

Preferovat CSS/canvas v `genesis-fx.html` — ne zatěžovat gift video engine.

---

## 5. Logo a brand

- Logo MIA = hero-level v první viewport kompozici (viz Experience Design).  
- Žádné detachované promo badge přes avatar.  
- Text v HUD: systémový font / mono pro terminal; display font jen pro logo wordmark pokud existuje.

---

## 6. Stav

```text
04_AUDIO_AND_ASSETS_SPEC: APPROVED 2026-07-30
```
