# MIA Genesis Mode — Cadence & Unlock Story

---

## 1. Cadence engine (MIA nesmí mlčet)

### 1.1 Hard rules

| Rule | Hodnota |
|------|---------|
| Min interval mezi „událostmi“ | **20 s** |
| Typický interval | **30–45 s** |
| Max ticho (bez hlasu **a** bez vizuální změny) | **90 s** |
| Max TTS gap | **60 s** doporučeno (vizuál může vyplnit) |
| Platform / YouTube voice | ≥ **8–12 min** |
| **Significant events** | Každých 20–60 s **jen jedna** významná událost |

**Jedna významná událost** = právě jedno z: hlas · terminál · změna statusu · animace/FX pulse · reakce na chat.  
**Ne** všechno najednou — stream nesmí působit přeplácaně. Doprovodné mikro-detaily (caret blink, jemné částice) nepočítají jako significant.

### 1.2 Event types (weighted)

| Event | Weight | Efekt |
|-------|--------|--------|
| Terminal line | 25 | nový řádek logu |
| Diagnostics step | 15 | RUNNING→DONE |
| Status flicker/update | 10 | bezpečná změna labelu |
| Readiness +δ | 10 | +0.1–0.5 % |
| FX pulse | 10 | částice / datová linka |
| Voice line | 20 | TTS + talking pose |
| Community beat | 5 | community text / soft |
| Platform / YT beat | 3 | řídké |
| Unlock ceremony | 2 | event-driven only |

Scheduler: weighted random + cooldowns + „recent tags“ blacklist (posledních 5 tagů).

### 1.3 Minute sketch (prvních 10 min)

| t | Událost |
|---|---------|
| 0:00 | SFX boot · BGM startup · „Genesis Sequence aktivní.“ |
| 0:25 | Terminal ×2 · STATUS Voice VERIFYING |
| 0:50 | „Inicializuji hlasový modul.“ |
| 1:20 | Voice → ONLINE · SFX online · % → 8 |
| 2:00 | Konec Sequence BGM → ambient · diagnostics Memory |
| 2:40 | Terminal · „Synchronizuji paměť.“ |
| 3:30 | Community short |
| 4:20 | FX pulse · % +0.3 |
| 5:10 | System line |
| 6:00 | Terminal anti-repeat |
| 7:00 | Listening pose idle beat |
| 8:00 | Soft YouTube **nebo** skip (50 %) |
| 9:00 | System / ambient |
| 10:00 | Steady cadence mode |

---

## 2. Unlock story (veřejný příběh)

Pořadí odemykání (narativ):

```text
Voice
  → Chat
    → Gift Engine
      → Bowl
        → Video
          → (další: Economy HUD, Arena, …)
```

### 2.1 Stavy modulu (UI)

| State | Divák vidí | Význam |
|-------|------------|--------|
| `LOCKED` | šedý | ještě ne |
| `VERIFYING` | jantar | probíhá ověření |
| `LIVE` | cyan/zelená | veřejně aktivní v Genesis příběhu |
| `WARNING` | červená | problém — rare |

### 2.2 Ceremony (30–45 s)

1. STATUS → VERIFYING  
2. Terminal: `Verifying <Module>...`  
3. Hláška unlock  
4. SFX `confirm`  
5. STATUS → LIVE  
6. Readiness skok +1–3 %  
7. Avatar happy / surprised  

### 2.3 Oddělení od Stream Core reality

| Genesis UI říká LIVE | Skutečný Core |
|----------------------|---------------|
| Voice LIVE | TTS může běžet v Genesis speakeru |
| Chat LIVE | teprve když operátor zapne chat ingest reakce |
| Gift LIVE | **jen** po R1-D / výslovném GO — jinak UI zůstane VERIFYING/LOCKED i když příběh „blízko“ |
| Video LIVE | totéž — media queue Core |

**Pravidlo:** Genesis může **předbíhat příběhem** jen do úrovně, kterou operátor nastaví v `genesis-state` (manual unlock gates). Nikdy auto-enable gift/video queues.

---

## 3. Operátorský panel (design only)

Interní (ne ve veřejném canvas), matice:

| Modul | PASS | FAIL | WARNING | Notes |
|-------|------|------|---------|-------|
| Voice | ☐ | ☐ | ☐ | |
| Chat | ☐ | ☐ | ☐ | |
| Gift | ☐ | ☐ | ☐ | |
| Overlay | ☐ | ☐ | ☐ | |
| Video | ☐ | ☐ | ☐ | |
| OBS | ☐ | ☐ | ☐ | |
| Memory | ☐ | ☐ | ☐ | |
| Persistence | ☐ | ☐ | ☐ | |
| Economy | ☐ | ☐ | ☐ | |
| Bowl | ☐ | ☐ | ☐ | |

- PASS = ověřeno pro odemčení v Genesis + případně Core  
- FAIL = blokuje unlock ceremony  
- WARNING = LIVE s omezením  

Live napojení na metriky = Etapa 9 později; v1 stačí manuální checkbox / JSON gate file.

---

## 4. Denní progress loop

```text
Day N morning: operator sets unlock goals + daily voice note
Day N stream: cadence + optional 1 ceremony
Day N evening: update public „what changed“
Day N+1: viewers return for delta
```

---

## 5. Stav

```text
05_CADENCE_AND_UNLOCK_STORY: APPROVED 2026-07-30
```
