# MIA — RC next steps

**Datum:** 2026-07-24  
**Stav:** Stream release candidate · **RC freeze aktivní**

---

## Te? (freeze)

Nic velkého nep?idávat, dokud neprojde **R1-C v OBS**.

1. Projít [10-krokový checklist](./MIA_GRAPHICS_R1_STATUS.md#r1-c--10-krokový-obs-checklist-exact) v OBS.
2. Vyplnit [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md) šablonou PASS/FAIL.
3. Vložit výsledek operátorovi (chat) — tag se ned?lá bez lidského sign-off.

---

## Po R1-C PASS

```powershell
git add docs/MIA_R1C_OBS_RESULT.md
git commit -m "Complete R1-C OBS validation"
git push
git tag v0.1.1-graphics
git push origin v0.1.1-graphics
```

**Nepoužívat** `git add .` — live `data/` nepat?í do commitu.

---

## Potom — MIA Cross-Platform Game Engine (první blok)

Jen tyto ?ty?i moduly. **Žádný poker.** Žádné pluginy.

```text
GameState
VisibilityEngine
PlatformProjection
PlatformRenderer
```

**Cíl:** d?kaz, že ?ty?i platformy dostanou ?ty?i bezpe?n? rozdílné obrazy.

Architektura: [`MIA_ENGINE_2_0_ARCHITECTURE.md`](./MIA_ENGINE_2_0_ARCHITECTURE.md)  
Roadmap: [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) (Phase E1)

---

## Reference

| Dokument | Ú?el |
|----------|------|
| [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) | R1 gates + 10-step OBS checklist |
| [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md) | Výsledek OBS session (vyplnit) |
| [`MIA_CAPABILITY_STATUS.md`](./MIA_CAPABILITY_STATUS.md) | Co MIA umí + RC freeze |
| [`MIA_MEGA_AUDIT_2026-07-24.md`](./MIA_MEGA_AUDIT_2026-07-24.md) | Mega audit entry point |
