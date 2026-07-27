# MIA ñ RC next steps

**Datum:** 2026-07-26  
**Stav:** R1-C PASS ó graphics gate uzav?en; tag `v0.1.1-graphics`

---

## Hotovo (R1-C PASS 2026-07-26)

- [x] 10-krokov˝ OBS checklist ó viz [MIA_R1C_OBS_RESULT.md](./MIA_R1C_OBS_RESULT.md)
- [x] Commit `Complete R1-C OBS validation` + tag `v0.1.1-graphics` + push

RC freeze na velkÈ featury zvednut; **Engine2 z?st·v· default OFF**, **û·dn˝ poker**.

---

## Te? (volba oper·tora)

1. **Live stream** s jistotou na tagu `v0.1.1-graphics` (rollback: `v0.1-stream-core`).
2. **Engine 2.0 E3+** ó multi-profile overlay routes (viz roadmap); E2 stub hotov. ZapÌnat jen `MIA_ENGINE2_STUB=1` pro zkouöku, ne pro produk?nÌ stream bez domluvy.


---

## Potom ù MIA Cross-Platform Game Engine (prvnù blok)

**E2 stub hotov** (2026-07-27): Event applicator, event-bus-stub, OBS Router adapter (`obs.renderRoute`). Admin preview: `projections` + `obsRoute` + `eventBus` p?i `MIA_ENGINE2_STUB=1`.

**E1 stub hotov** (2026-07-26): `GameState`, `VisibilityEngine`, `PlatformProjection`, `PlatformRenderer` v `engine2/`.  
?ty?i platformy (tiktok/kick/obs/admin) ? ?ty?i odliùnù projekce ù contract test green.  
**Flag default OFF:** `MIA_ENGINE2_STUB=0` ù ùùdnù zm?na streamu. Zapnout pro zkouùku: `MIA_ENGINE2_STUB=1` ? admin status ukùe `engine2.projections`.

Jen tyto ?ty?i moduly. **ùùdnù poker.** ùùdnù pluginy.

```text
GameState
VisibilityEngine
PlatformProjection
PlatformRenderer
```

**Cùl:** d?kaz, ùe ?ty?i platformy dostanou ?ty?i bezpe?n? rozdùlnù obrazy.

Architektura: [`MIA_ENGINE_2_0_ARCHITECTURE.md`](./MIA_ENGINE_2_0_ARCHITECTURE.md)  
Roadmap: [`MIA_ENGINE_2_0_ROADMAP.md`](./MIA_ENGINE_2_0_ROADMAP.md) (Phase E1)

---

## Reference

| Dokument | ù?el |
|----------|------|
| [`MIA_GRAPHICS_R1_STATUS.md`](./MIA_GRAPHICS_R1_STATUS.md) | R1 gates + 10-step OBS checklist |
| [`MIA_R1C_OBS_RESULT.md`](./MIA_R1C_OBS_RESULT.md) | Vùsledek OBS session (vyplnit) |
| [`MIA_CAPABILITY_STATUS.md`](./MIA_CAPABILITY_STATUS.md) | Co MIA umù + RC freeze |
| [`MIA_MEGA_AUDIT_2026-07-24.md`](./MIA_MEGA_AUDIT_2026-07-24.md) | Mega audit entry point |
