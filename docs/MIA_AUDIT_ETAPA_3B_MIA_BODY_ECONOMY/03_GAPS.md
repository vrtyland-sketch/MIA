# Etapa 3B — Mezery (jen ⚠ / ❌ / ❓)

Seřazeno dle severity: **VYSOKÁ → STŘEDNÍ → NÍZKÁ → INFO**.

Cross-reference: některé mezery sdílené s **Etapa 3A** (`GAP-01` spam T4 cap, `GAP-07` streak persistence).

---

## VYSOKÁ

### GAP-B01 — Spam milestone T4 vs shadow runtime cap T4→T3
| | |
|--|--|
| **ID matrix** | BE-50 (≈ 3A G-42) |
| **Kánon** | Spam prah T4 = 37500 miaPoints; `engine_spam_session` vrací `spamRewardTier: T4` |
| **Implementace** | `MIA_NEXT/engine_shadow_runtime.js`: `cappedRewardTier = rewardTier === "T4" ? "T3"` |
| **Dopad** | Wave HUD ukazuje T4 milestone v MIA bodech, ale reward video/presentation může být T3 — **behavior drift** v ekonomické/spam vrstvě (ne coin leak) |
| **Severity** | ⚠ **VYSOKÁ** |
| **Návrh (bez kódu)** | Sjednotit shadow cap s kánonem nebo explicitně zdokumentovat záměr capu |

---

## STŘEDNÍ

### GAP-B02 — Public UX naming: „podpora projektu“ vs technické `miaPoints`
| | |
|--|--|
| **ID** | BE-08, BE-52 |
| **Kánon** | `KANON_MIA_AGENT.md` §18 — navenek „podpora projektu“, interně miaPoints |
| **Implementace** | API pole `miaPoints`; combo/spam subtext někdy doslovně „… miaPoints“ (`core/combo-moments.js`) |
| **Dopad** | Divák může vidět technický label místo produktového copy — **UX drift**, ne guardrail porušení |
| **Severity** | ⚠ **STŘEDNÍ** |

### GAP-B03 — Streak / supporter profile persistence scope
| | |
|--|--|
| **ID** | BE-24, BE-58 (≈ 3A GAP-07) |
| **Kánon** | Streak 3/7/30 dní vyžaduje per-user cache mezi dny |
| **Implementace** | `MIA_GIFT_SUPPORTER_PROFILE` runtime in session; viewer-memory persist separátně |
| **Neověřeno** | Restart serveru mid-streak, multi-day produkční stream |
| **Severity** | ⚠ **STŘEDNÍ** + ❓ |

### GAP-B04 — Internal `giftValue` v resolved context
| | |
|--|--|
| **ID** | BE-47 |
| **Kánon** | Pole nesmí do overlay pro diváky |
| **Implementace** | `buildResolvedGiftContext` vrací `giftValue: totalCoins` pro internal decision; strip na `/overlay-state` ✅ |
| **Dopad** | Riziko future leak pokud nový kanál předá ctx raw bez strip — **architektonické riziko** |
| **Severity** | ⚠ **STŘEDNÍ** |

### GAP-B05 — Admin runtime audit expose totalCoins
| | |
|--|--|
| **ID** | BE-53 |
| **Kánon** | Guardrails cílí overlay/public; admin je mimo divácký overlay |
| **Implementace** | `MIA_RUNTIME_AUDIT.buildRuntimeAuditSnapshot` — `lastGiftMapping.totalCoins` |
| **Dopad** | OK pro admin; nutné držet mimo public routes a NE replikovat do OBS browser sources |
| **Severity** | ⚠ **STŘEDNÍ** (operational discipline) |

### GAP-B06 — `core/event-normalizer` overlay projection bez contract testu
| | |
|--|--|
| **ID** | BE-51 |
| **Kánon** | `projectEventForOverlay` — miaPoints only |
| **Implementace** | Kód existuje v `core/event-normalizer.js` |
| **Důkaz** | Chybí dedikovaný contract v preflight |
| **Severity** | ⚠ **STŘEDNÍ** |

---

## NÍZKÁ

### GAP-B07 — gift-map-stats.json na disku
| | |
|--|--|
| **ID** | BE-46 (≈ 3A GAP-08) |
| **Kánon** | Alignment 🟡 — statistiky mapy, ne overlay |
| **Implementace** | `data/gift-map-stats.json` může obsahovat coin agregáty pro dev/map audit |
| **Dopad** | Není public API; riziko jen při accidental expose |
| **Severity** | ⚠ **NÍZKÁ** |

### GAP-B08 — Vizuální duel power bar (body OK, bar 🟡)
| | |
|--|--|
| **ID** | BE-42 + kánon I47 |
| **Kánon** | MIA zobrazí sílu obou stran — alignment 🟡 vizuální bar |
| **Implementace** | `resolvePowerBar` v duel snapshot; plný broadcast bar MVP |
| **Severity** | ⚠ **NÍZKÁ** (vize vs MVP) |

### GAP-B09 — Dual XP semantics (XP vs miaPoints) dokumentace
| | |
|--|--|
| **ID** | BE-11, BE-12 |
| **Kánon** | 1 coin = 1 XP vize; 1 coin = 7.5 miaPoints runtime |
| **Implementace** | Obojí současně — správně, ale vyžaduje onboarding vývojáře |
| **Severity** | ⚠ **NÍZKÁ** (kognitivní zátěž, ne bug) |

---

## INFO / ❓

### GAP-B10 — Live audit overlay_state_no_coins
| | |
|--|--|
| **ID** | BE-57 |
| **Stav** | Historicky v alignment 🟢; tento audit běh nespouštěl `audit:live` |
| **Severity** | ❓ |

### GAP-B11 — Host team split v live NEJSEM TU
| | |
|--|--|
| **ID** | BE-59 |
| **Stav** | Unit + UI contract ✅; live OBS Ninja session neověřena |
| **Severity** | ❓ |

---

## Souhrn severity

| Severity | Počet |
|----------|-------|
| VYSOKÁ | 1 |
| STŘEDNÍ | 5 |
| NÍZKÁ | 3 |
| INFO / ❓ | 2 |
| **Celkem mezer** | **11** |
