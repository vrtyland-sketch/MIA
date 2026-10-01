# Etapa 3A — Mezery (jen ⚠ / ❌ / ❓)

Seřazeno dle severity: **VYSOKÁ → STŘEDNÍ → NÍZKÁ → INFO**.

---

## VYSOKÁ

### GAP-01 — Spam milestone T4 video capnutý na T3 ve shadow runtime
| | |
|--|--|
| **ID matrix** | G-41 ✅ engine vs G-42 ⚠ shadow |
| **Kánon** | `docs/KANON_SOUCASNY_PREHLED.md` — spam prah T4 = 37500 miaPoints (~5000 coins); `engine_spam_session` počítá T4 |
| **Implementace** | `MIA_NEXT/engine_shadow_runtime.js` řádky 149–150: `cappedRewardTier = rewardTier === "T4" ? "T3"` |
| **Dopad** | Diváci dosáhnou T4 spam milestone ve wave HUD, ale video reward hraje T3 pool — **behavior drift** vůči kánonu i komentáři ve spam engine |
| **Severity** | ⚠ **VYSOKÁ** (user-visible milestone mismatch) |
| **Návrh (bez kódu)** | Sjednotit shadow cap s kánonem nebo aktualizovat kánon pokud T4 spam video záměrně vypnuto |

---

## STŘEDNÍ

### GAP-02 — Video rotace cross-tier: chybí contract test
| | |
|--|--|
| **ID** | G-31 |
| **Kánon** | T1_01→T1_02→T3_01→T1_03 (bez resetu T1 indexu) |
| **Implementace** | `rotationIndexByTier` per tier — kód odpovídá |
| **Důkaz** | `video_rotation_smoke.js` testuje jen T1 sekvenčně |
| **Severity** | ⚠ **STŘEDNÍ** (regrese nehlídaná testem) |

### GAP-03 — Bowl vizuální pásma vs kánonní popis
| | |
|--|--|
| **ID** | G-49 |
| **Kánon** | `KOJNOZROUT_KANON.md`: prázdná 0–30 %, částečně 31–94 %, plná ≥95 % |
| **Implementace** | `MIA_KOJNOZROUT_ENGINE.resolveBowlVisualLevel`: low / mid(30–59) / high(60–94) / full(≥95) |
| **Dopad** | Extra granularita od 60 % — ne rozpor, ale overlay copy může divergovat |
| **Severity** | ⚠ **STŘEDNÍ** (dokumentační / UX drift) |

### GAP-04 — T5/T6 boss: cinematic overlay vs plná cutscéna
| | |
|--|--|
| **ID** | G-20, G-79 |
| **Kánon** | T5 cutscéna, T6 legenda celá událost |
| **Implementace** | `boss-cinematic-overlay`, banner metadata 🟢; full pre-rendered cutscéna 🔴 v alignment |
| **Severity** | ⚠ **STŘEDNÍ** (vize vs MVP — explicitně 🟡 v alignment) |

### GAP-05 — Care-aware animace: kánon tabulka vs implementace
| | |
|--|--|
| **ID** | G-54, G-80 |
| **Kánon** | `KANON_MIA_AGENT.md` — varianty dle neglect/care/pece tabulka |
| **Implementace** | `resolveVariantIndex` + `MIA_GIFT_ANIMATION_CONTEXT` — mood ✅, care offset částečně |
| **Alignment** | 🟡 „Varianty podle péče komunity“ 🔴 v §10 |
| **Severity** | ⚠ **STŘEDNÍ** |

### GAP-06 — Dual catalog: CAPYBARA chat loop
| | |
|--|--|
| **ID** | G-57 |
| **Kánon** | Kapybara = `animal_small` + chat loop AWAY |
| **Implementace** | `chatLoop:true` v legacy `MIA_GIFT_MAP`; enterprise `CAPYBARA` bez chatLoop flag |
| **Dopad** | Flow funguje přes legacy profil; enterprise-only path by chat loop neviděl |
| **Severity** | ⚠ **STŘEDNÍ** (architektonický drift dual path) |

### GAP-07 — Gift streak persistence scope
| | |
|--|--|
| **ID** | G-37, G-78 |
| **Kánon** | Streak bonus 3/7/30 dní — `MIA_GIFT_ECONOMY` dříve 🔴 per-user cache |
| **Implementace** | `MIA_GIFT_SUPPORTER_PROFILE` runtime streakDays funguje v unit testech |
| **Neověřeno** | Restart serveru / multi-day stream / persistence file |
| **Severity** | ⚠ **STŘEDNÍ** + ❓ |

---

## NÍZKÁ

### GAP-08 — `gift-map-stats.json` na disku
| | |
|--|--|
| **ID** | G-64 |
| **Kánon** | TikTok data jen runtime + krátký cache |
| **Implementace** | `data/gift-map-stats.json` perzistence statistik mapy |
| **Severity** | ⚠ **NÍZKÁ** (aggregates, ne raw TikTok PII — alignment 🟡) |

### GAP-09 — Dokumentační nesoulad MIA_GIFT_ECONOMY streak/level
| | |
|--|--|
| **Kánon doc** | `MIA_GIFT_ECONOMY.md` roadmap řádky streak 🔴, level 🔴 |
| **Kód** | Implementováno 🟢 dle alignment |
| **Severity** | ⚠ **NÍZKÁ** (docs drift, ne runtime) |

---

## NEOVĚŘENO (❓)

### GAP-10 — Live TikTok gift name completeness
| | |
|--|--|
| **ID** | G-75 |
| **Popis** | Auto-map bucket pro neznámé vs exactNames — každý nový TikTok gift |
| **Evidence** | `gift_map_log_audit`, panel intake — static audit only |
| **Severity** | ❓ |

### GAP-11 — Live OBS tier video rotation end-to-end
| | |
|--|--|
| **ID** | G-76 |
| **Popis** | R1-C PASS 2026-07-26; mimo tento audit běh |
| **Severity** | ❓ |

### GAP-12 — Live full bowl → T4 special sync
| | |
|--|--|
| **ID** | G-77 |
| **Severity** | ❓ |

### GAP-13 — Long-session streak po restartu
| | |
|--|--|
| **ID** | G-78 |
| **Severity** | ❓ |

---

## ❌ Rozpory (tvrdý kánon)

**Žádný identifikovaný tvrdý rozpor (❌)** v oblasti gift pipeline core guardrails:
- overlay bez coinů ✅
- per-tier rotation index v kódu ✅
- TikFinity→MIA→OBS ✅
- playback max(coin, catalog) ✅

---

*Další kroky bez kódování: viz `05_SUMMARY.md` § Doporučená 3B.*
