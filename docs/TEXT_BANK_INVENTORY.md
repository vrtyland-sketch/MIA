# TEXT BANK INVENTORY

**Generováno:** read-only inventura (`node scripts/generate_text_bank_inventory.js`)
**Feature freeze:** žádné texty zatím nedoplňovat — jen měření.

## Souhrn

| Metrika | Hodnota |
|---------|---------|
| Pack souborů | 31 |
| Klíčů celkem | 131 |
| Runtime required keys | 86 |
| Variant celkem | 1193 |
| Na cíli (chybí 0) | 49 |
| Chybí variant celkem | **339** |

### Stav podle pásem

| Pásmo | Počet klíčů | Význam |
|-------|-------------|--------|
| **EMPTY** (0) | 0 | žádná varianta |
| **CRITICAL** (1–4) | 33 | nutné doplnit ASAP |
| **LOW** (5–9) | 48 | pod cílem |
| **OK** (10–14) | 20 | běžné minimum splněno |
| **STRONG** (15+) | 30 | bohatá rotace |

### Cílové počty

- **HIGH** (small gift, pozdrav, idle, spam…): **18** variant
- **MEDIUM** (support_medium): **12**
- **NORMAL** (většina direct/community): **10**
- **SPECIAL** (grief, evolution, big gift…): **6–8**

## P1 — nejdřív doplnit (HIGH freq + CRITICAL)

| KEY | nyní | cíl | CHYBÍ | STAV | runtime |
|-----|------|-----|-------|------|---------|
| `mia_direct_generic_return` | 7 | 18 | **11** | LOW | yes |
| `community_greeting_kojnozout` | 8 | 18 | **10** | LOW | yes |
| `community_greeting_mia` | 8 | 18 | **10** | LOW | yes |
| `community_illness_mia` | 3 | 10 | **7** | CRITICAL | pack-only |
| `mia_vitals_sick_status` | 3 | 10 | **7** | CRITICAL | pack-only |
| `mia_vitals_sleepy_status` | 3 | 10 | **7** | CRITICAL | pack-only |
| `community_illness_kojnozout` | 4 | 10 | **6** | CRITICAL | pack-only |
| `koj_care_attention` | 4 | 10 | **6** | CRITICAL | pack-only |
| `koj_care_calm` | 4 | 10 | **6** | CRITICAL | pack-only |
| `koj_care_feed` | 4 | 10 | **6** | CRITICAL | pack-only |
| `koj_care_heal` | 4 | 10 | **6** | CRITICAL | pack-only |
| `koj_care_scratch` | 4 | 10 | **6** | CRITICAL | pack-only |
| `koj_care_walk` | 4 | 10 | **6** | CRITICAL | pack-only |
| `emotion_frustration_kojnozout_general` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_frustration_mia_general` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_joy_kojnozout_general` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_joy_mia_general` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_relief_kojnozout_general` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_relief_mia_general` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_stress_kojnozout_general` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_stress_mia_finance` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_stress_mia_general` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_stress_mia_health` | 3 | 8 | **5** | CRITICAL | yes |
| `emotion_stress_mia_school` | 3 | 8 | **5** | CRITICAL | yes |
| `mia_learned_voice_echo` | 3 | 8 | **5** | CRITICAL | yes |
| `mia_evolution_guardian` | 4 | 8 | **4** | CRITICAL | yes |
| `mia_evolution_hatchling` | 4 | 8 | **4** | CRITICAL | yes |
| `mia_evolution_sprout` | 4 | 8 | **4** | CRITICAL | yes |
| `koj_direct_generic` | 15 | 18 | **3** | STRONG | yes |
| `loss_report_kojnozout` | 3 | 6 | **3** | CRITICAL | yes |
| `loss_report_mia` | 3 | 6 | **3** | CRITICAL | yes |
| `mia_story_fallback` | 3 | 6 | **3** | CRITICAL | yes |
| `pet_loss_kojnozout` | 3 | 6 | **3** | CRITICAL | yes |
| `pet_loss_report_mia` | 3 | 6 | **3** | CRITICAL | yes |
| `sadness_report_kojnozout` | 3 | 6 | **3** | CRITICAL | yes |
| `sadness_report_mia` | 3 | 6 | **3** | CRITICAL | yes |
| `mia_evolution_legend` | 4 | 6 | **2** | CRITICAL | yes |
| `wake_up_chat_mia` | 17 | 18 | **1** | STRONG | yes |

## Kompletní inventura (všechny klíče)

| KEY | variants | cíl | CHYBÍ | STAV | tier | fix | RT |
|-----|----------|-----|-------|------|------|-----|-----|
| `audience_push_kojnozout` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `audience_push_mia` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `chat_presence_kojnozout` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `chat_presence_mia` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `community_greeting_kojnozout` | 8 | 18 | 10 | LOW | HIGH (15–20) | P1 | ✓ |
| `community_greeting_mia` | 8 | 18 | 10 | LOW | HIGH (15–20) | P1 | ✓ |
| `community_illness_kojnozout` | 4 | 10 | 6 | CRITICAL | NORMAL (10) | P1 |  |
| `community_illness_mia` | 3 | 10 | 7 | CRITICAL | NORMAL (10) | P1 |  |
| `community_ping_kojnozout` | 20 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `community_ping_mia` | 20 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `direct_kojnozout` | 16 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `direct_mia` | 18 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `emotion_frustration_kojnozout_general` | 3 | 8 | 5 | CRITICAL | SPECIAL (7–8) | P1 | ✓ |
| `emotion_frustration_mia_general` | 3 | 8 | 5 | CRITICAL | SPECIAL (7–8) | P1 | ✓ |
| `emotion_joy_kojnozout_general` | 3 | 8 | 5 | CRITICAL | SPECIAL (7–8) | P1 | ✓ |
| `emotion_joy_mia_general` | 3 | 8 | 5 | CRITICAL | SPECIAL (7–8) | P1 | ✓ |
| `emotion_relief_kojnozout_general` | 3 | 8 | 5 | CRITICAL | SPECIAL (7–8) | P1 | ✓ |
| `emotion_relief_mia_general` | 3 | 8 | 5 | CRITICAL | SPECIAL (7–8) | P1 | ✓ |
| `emotion_stress_kojnozout_general` | 3 | 8 | 5 | CRITICAL | SPECIAL (7–8) | P1 | ✓ |
| `emotion_stress_mia_finance` | 3 | 8 | 5 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `emotion_stress_mia_general` | 3 | 8 | 5 | CRITICAL | SPECIAL (7–8) | P1 | ✓ |
| `emotion_stress_mia_health` | 3 | 8 | 5 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `emotion_stress_mia_school` | 3 | 8 | 5 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `idle_bored` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `idle_hungry` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `koj_care_attention` | 4 | 10 | 6 | CRITICAL | NORMAL (10) | P1 |  |
| `koj_care_calm` | 4 | 10 | 6 | CRITICAL | NORMAL (10) | P1 |  |
| `koj_care_feed` | 4 | 10 | 6 | CRITICAL | NORMAL (10) | P1 |  |
| `koj_care_heal` | 4 | 10 | 6 | CRITICAL | NORMAL (10) | P1 |  |
| `koj_care_scratch` | 4 | 10 | 6 | CRITICAL | NORMAL (10) | P1 |  |
| `koj_care_walk` | 4 | 10 | 6 | CRITICAL | NORMAL (10) | P1 |  |
| `koj_direct_engagement` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 | ✓ |
| `koj_direct_engagement_sensitive` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 | ✓ |
| `koj_direct_fact_question` | 7 | 10 | 3 | LOW | NORMAL (10) | P3 |  |
| `koj_direct_food` | 18 | 10 | 0 | STRONG | NORMAL (10) | — |  |
| `koj_direct_food_repeat` | 7 | 10 | 3 | LOW | NORMAL (10) | P3 |  |
| `koj_direct_generic` | 15 | 18 | 3 | STRONG | HIGH (15–20) | P1 | ✓ |
| `koj_direct_generic_return` | 7 | 10 | 3 | LOW | NORMAL (10) | P3 |  |
| `koj_direct_greeting` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `koj_direct_greeting_status` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 |  |
| `koj_direct_praise` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 |  |
| `koj_direct_question` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 | ✓ |
| `koj_direct_question_named` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 |  |
| `koj_direct_status` | 22 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `koj_direct_status_repeat` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 | ✓ |
| `koj_direct_thanks` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 | ✓ |
| `koj_evolution_guardian` | 5 | 8 | 3 | LOW | SPECIAL (5–10) | P3 | ✓ |
| `koj_evolution_hatchling` | 5 | 8 | 3 | LOW | SPECIAL (5–10) | P3 | ✓ |
| `koj_evolution_legend` | 5 | 6 | 1 | LOW | SPECIAL (5–10) | P3 | ✓ |
| `koj_evolution_sprout` | 5 | 8 | 3 | LOW | SPECIAL (5–10) | P3 | ✓ |
| `koj_feed_big` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `koj_feed_medium` | 10 | 10 | 0 | OK | NORMAL (10) | — | ✓ |
| `koj_feed_small` | 10 | 10 | 0 | OK | NORMAL (10) | — | ✓ |
| `koj_full_bowl` | 15 | 10 | 0 | STRONG | NORMAL (10) | — |  |
| `koj_learned_voice` | 8 | 8 | 0 | LOW | NORMAL (10) | — | ✓ |
| `koj_learned_voice_spicy` | 6 | 6 | 0 | LOW | SPECIAL (5–10) | — | ✓ |
| `koj_returning_ack` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 | ✓ |
| `koj_vitals_annoyed` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `koj_vitals_hungry` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `koj_vitals_sad` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `koj_vitals_sick` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `koj_vitals_sleepy` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `loss_report_kojnozout` | 3 | 6 | 3 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `loss_report_mia` | 3 | 6 | 3 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `mia_care` | 15 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `mia_direct_engagement` | 12 | 10 | 0 | OK | NORMAL (10) | — | ✓ |
| `mia_direct_engagement_playful` | 6 | 10 | 4 | LOW | NORMAL (10) | P3 | ✓ |
| `mia_direct_engagement_sensitive` | 6 | 10 | 4 | LOW | NORMAL (10) | P3 | ✓ |
| `mia_direct_fact_question` | 7 | 10 | 3 | LOW | NORMAL (10) | P3 |  |
| `mia_direct_food_side` | 7 | 10 | 3 | LOW | NORMAL (10) | P3 |  |
| `mia_direct_generic` | 22 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `mia_direct_generic_return` | 7 | 18 | 11 | LOW | HIGH (15–20) | P1 | ✓ |
| `mia_direct_greeting` | 25 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `mia_direct_greeting_status` | 19 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `mia_direct_praise` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 |  |
| `mia_direct_praise_repeat` | 7 | 10 | 3 | LOW | NORMAL (10) | P3 |  |
| `mia_direct_question` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 |  |
| `mia_direct_question_named` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 | ✓ |
| `mia_direct_statement` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 | ✓ |
| `mia_direct_status` | 53 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `mia_direct_status_repeat` | 18 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `mia_direct_status_sensitive` | 6 | 10 | 4 | LOW | NORMAL (10) | P3 | ✓ |
| `mia_direct_thanks` | 8 | 10 | 2 | LOW | NORMAL (10) | P3 | ✓ |
| `mia_evolution_guardian` | 4 | 8 | 4 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `mia_evolution_hatchling` | 4 | 8 | 4 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `mia_evolution_legend` | 4 | 6 | 2 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `mia_evolution_sprout` | 4 | 8 | 4 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `mia_learned_voice` | 10 | 8 | 0 | OK | NORMAL (10) | — | ✓ |
| `mia_learned_voice_echo` | 3 | 8 | 5 | CRITICAL | NORMAL (10) | P1 | ✓ |
| `mia_learned_voice_spicy` | 10 | 6 | 0 | OK | SPECIAL (5–10) | — | ✓ |
| `mia_proactive_bored` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `mia_proactive_laugh` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `mia_proactive_spicy` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `mia_proactive_wake` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `mia_returning_ack` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 | ✓ |
| `mia_solo_stream_beat` | 8 | 8 | 0 | LOW | SPECIAL (5–10) | — | ✓ |
| `mia_solo_stream_deep` | 5 | 6 | 1 | LOW | SPECIAL (5–10) | P3 | ✓ |
| `mia_solo_stream_story` | 6 | 8 | 2 | LOW | SPECIAL (5–10) | P3 | ✓ |
| `mia_story_fallback` | 3 | 6 | 3 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `mia_vitals_annoyed_gift` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `mia_vitals_hungry_gift` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `mia_vitals_sad_gift` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `mia_vitals_sick_gift` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `mia_vitals_sick_status` | 3 | 10 | 7 | CRITICAL | NORMAL (10) | P1 |  |
| `mia_vitals_sleepy_gift` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `mia_vitals_sleepy_status` | 3 | 10 | 7 | CRITICAL | NORMAL (10) | P1 |  |
| `milestone_chat_kojnozout` | 15 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `milestone_chat_mia` | 15 | 10 | 0 | STRONG | NORMAL (10) | — | ✓ |
| `pet_loss_kojnozout` | 3 | 6 | 3 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `pet_loss_report_mia` | 3 | 6 | 3 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `sadness_report_kojnozout` | 3 | 6 | 3 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `sadness_report_mia` | 3 | 6 | 3 | CRITICAL | SPECIAL (5–10) | P1 | ✓ |
| `support_big_kojnozout` | 10 | 6 | 0 | OK | SPECIAL (5–10) | — | ✓ |
| `support_big_mia` | 10 | 6 | 0 | OK | SPECIAL (5–10) | — | ✓ |
| `support_combo` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `support_full_bowl_kojnozout` | 10 | 8 | 0 | OK | SPECIAL (5–10) | — | ✓ |
| `support_full_bowl_mia` | 10 | 8 | 0 | OK | SPECIAL (5–10) | — | ✓ |
| `support_medium_kojnozout` | 10 | 12 | 2 | OK | MEDIUM (12) | P3 | ✓ |
| `support_medium_mia` | 10 | 12 | 2 | OK | MEDIUM (12) | P3 | ✓ |
| `support_small_kojnozout` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `support_small_mia` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `support_spam_fail_kojnozout` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `support_spam_fail_mia` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `support_spam_success_kojnozout` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `support_spam_success_mia` | 18 | 18 | 0 | STRONG | HIGH (15–20) | — | ✓ |
| `template_named_soft_koj` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `template_named_soft_mia` | 5 | 10 | 5 | LOW | NORMAL (10) | P2 |  |
| `viewer_notice_kojnozout` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `viewer_notice_mia` | 10 | 10 | 0 | OK | NORMAL (10) | — |  |
| `wake_up_chat_kojnozout` | 15 | 10 | 0 | STRONG | NORMAL (10) | — |  |
| `wake_up_chat_mia` | 17 | 18 | 1 | STRONG | HIGH (15–20) | P1 | ✓ |

## Runtime-only keys (required, 0 v packu)

_Žádné — všechny required keys mají alespoň 1 variantu._

## Pack-only keys (ne v runtime registry)

Počet: **45** (expansion/legacy — doplnit až po domluvě)

## npm run test:bank-coverage

```text
> mia@1.0.0 test:bank-coverage
> node tests/text_bank_coverage_contract.js


---- TEXT BANK COVERAGE CONTRACT ----

✅ production scan finds runtime bank key references
✅ registry stays aligned with scanned production references
   covered 86 runtime keys
✅ all required runtime bank keys exist in TEXT_BANK with variants
✅ collectRequiredBankKeys matches validate report

---- TEXT BANK COVERAGE CONTRACT SUMMARY ----
```
