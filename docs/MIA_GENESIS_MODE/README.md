# MIA Genesis Mode

**Značka:** Genesis Mode / MIA Genesis  
**Typ:** Samostatný projekt (paralelní k Stream Core)  
**Stav:** **VALIDATION MODE** · Genesis v1 Design Complete · infrastruktura READY  
**Pravidlo:** žádná nová funkce, dokud neprojde Gate — [VALIDATION_MODE.md](./VALIDATION_MODE.md)  
**Výjimka (48h rezerva):** chat-only adaptéry Twitch/YouTube — [MIA_MULTI_PLATFORM_ADAPTER_VALIDATION.md](../MIA_MULTI_PLATFORM_ADAPTER_VALIDATION.md) (ne Genesis, ne economy)  
**Nápady:** [POST_LAUNCH_IDEAS.md](./POST_LAUNCH_IDEAS.md) (parkované)  
**Commit/push:** **🟡 HOLD** — [PRE_LAUNCH_GATE.md](./PRE_LAUNCH_GATE.md)  
**OBS ověření:** [OBS_DUAL_SCENE_VERIFICATION.md](./OBS_DUAL_SCENE_VERIFICATION.md)  
**Po Day 1:** [07_DESIGN_COMPLETE_AND_NEXT.md](./07_DESIGN_COMPLETE_AND_NEXT.md)  
**Core isolation:** [CORE_ISOLATION_AUDIT.md](./CORE_ISOLATION_AUDIT.md)  
**Owner:** Váša Špíňák — Project Owner / Operator  

---

## Co to je

Genesis Mode **není** čekací obrazovka ani „Boot Screen“.

Je to **první veřejné probouzení MIA** — živá digitální entita, která se před očima diváků připravuje na plný provoz. Komunita nemá čekat „až začne stream“, ale „co se dnes u MIA změnilo“.

```text
„Genesis Sequence aktivní.“
„Vítejte v Genesis Mode.“
„Právě sledujete moje první veřejné probuzení.“
```

---

## Vztah ke Stream Core / R1-D

| Vrstva | Stav |
|--------|------|
| Stream Core | **FROZEN** → gate = R1-D LIVE |
| Genesis Mode | **PARALLEL** — design-first; runtime Core se nemění |

Genesis **nenahrazuje** R1-D. Nezasahuje do gift economy, video/voice queue, persistence ani ingest.

---

## Dokumenty

| Soubor | Obsah |
|--------|--------|
| [00_PROJECT_CHARTER.md](./00_PROJECT_CHARTER.md) | Cíl, hranice, značka, rozhodnutí |
| [01_EXPERIENCE_DESIGN.md](./01_EXPERIENCE_DESIGN.md) | Týden-1 journey + 20min watch test |
| [02_OVERLAY_AND_SCENE_SPEC.md](./02_OVERLAY_AND_SCENE_SPEC.md) | OBS scéna `MIA_GENESIS`, overlaye |
| [03_VOICE_BANK_SPEC.md](./03_VOICE_BANK_SPEC.md) | 300+ hlášek, CS/EN/DE/ES |
| [04_AUDIO_AND_ASSETS_SPEC.md](./04_AUDIO_AND_ASSETS_SPEC.md) | SFX, BGM, pózy |
| [05_CADENCE_AND_UNLOCK_STORY.md](./05_CADENCE_AND_UNLOCK_STORY.md) | 20–60s cadence + odemykání modulů |
| [07_DESIGN_COMPLETE_AND_NEXT.md](./07_DESIGN_COMPLETE_AND_NEXT.md) | Design Complete · metriky po Day 1 · Genesis jako značka kapitol |
| [PRE_LAUNCH_GATE.md](./PRE_LAUNCH_GATE.md) | Soak · strangers · GO/NO GO · Public Activation |

---

## Pravidlo

```text
DESIGN FIRST → operator APPROVE → branch feature/mia-genesis-mode → implement
```

Žádný runtime patch, dokud operátor neschválí Experience Design Pack.
