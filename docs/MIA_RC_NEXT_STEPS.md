# MIA – RC next steps

**Datum:** 2026-07-26  
**Stav:** R1-C PASS — graphics gate uzavřen; tag `v0.1.1-graphics`

---

## Hotovo (R1-C PASS 2026-07-26)

- [x] 10-krokový OBS checklist — viz [MIA_R1C_OBS_RESULT.md](./MIA_R1C_OBS_RESULT.md)
- [x] Commit `Complete R1-C OBS validation` + tag `v0.1.1-graphics` + push

RC freeze na velké featury zvednut; **Engine2 zůstává default OFF**, **žádný poker**.

---

## Teď (volba operátora)

1. **Live stream** s jistotou na tagu `v0.1.1-graphics` (rollback: `v0.1-stream-core`).
2. **Engine 2.0 E2+** — rozšíření za E1 stubem (viz roadmap); zapínat jen `MIA_ENGINE2_STUB=1` pro zkoušku, ne pro produkční stream bez domluvy.


---

## Potom � MIA Cross-Platform Game Engine (prvn� blok)

**E1 stub hotov�** (2026-07-26): `GameState`, `VisibilityEngine`, `PlatformProjection`, `PlatformRenderer` v `engine2/`.  
?ty?i platformy (tiktok/kick/obs/admin) ? ?ty?i odli�n� projekce � contract test green.  
**Flag default OFF:** `MIA_ENGINE2_STUB=0` � ��dn� zm?na streamu. Zapnout pro zkou�ku: `MIA_ENGINE2_STUB=1` ? admin status uk�e `engine2.projections`.

Jen tyto ?ty?i moduly. **��dn� poker.** ��dn� pluginy.

```text
GameState
VisibilityEngine
PlatformProjection
PlatformRenderer
```

**C�l:** d?kaz, �e ?ty?i platformy dostanou ?ty?i bezpe?n? rozd�ln� obrazy.

Architektura: [`MIA_ENGINE_2_0_ARCHITECTURE.md`](./MIA_ENGINE_2_0_ARCHITECTURE.md)  
Roadmap: [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) (Phase E1)

---

## Reference

| Dokument | �?el |
|----------|------|
| [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) | R1 gates + 10-step OBS checklist |
| [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md) | V�sledek OBS session (vyplnit) |
| [`MIA_CAPABILITY_STATUS.md`](./MIA_CAPABILITY_STATUS.md) | Co MIA um� + RC freeze |
| [`MIA_MEGA_AUDIT_2026-07-24.md`](./MIA_MEGA_AUDIT_2026-07-24.md) | Mega audit entry point |
