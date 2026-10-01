# Master Canon 0044 — soulad s projektem

Audit [`0044-community-engine.md`](./0044-community-engine.md) vůči stavu `C:\MIA` k 2026-07-15.

Legenda: ✅ implementováno · 🟡 částečně · ❌ chybí

Technická kotva: `shared/mia-community-core/communityEngine.js`

---

## §1–§4 Účel a princip

| Bod | Stav | Důkaz |
|-----|------|-------|
| Community API | ✅ | `createCommunityEngine` |
| Sociální vrstva | ✅ | `validateCommunityInput` |
| Pipeline interaction → community | ✅ | `buildCommunityPipeline` |
| Členský lifecycle | ✅ | `buildMemberLifecycle` |

---

## §3 Architektura — 12 komponent

| Komponenta | Stav | Implementace |
|------------|------|--------------|
| Community Manager | ✅ | `manageCommunity`, `buildCommunityPipeline` |
| User Profile Manager | ✅ | `createUserProfile` |
| Reputation Manager | ✅ | `adjustReputation`, `resolveReputationBonus` |
| Relationship Manager | ✅ | `createRelationship`, `strengthenRelationship` |
| Guild Manager | ✅ | `createGuild`, `joinGuild` |
| VIP Manager | ✅ | `assignVipTier` |
| Moderator Manager | ✅ | `registerModerator`, `recordModeratorAction` |
| Voting Manager | ✅ | `castCommunityVote` |
| Community Analytics | ✅ | `collectCommunityAnalytics` |
| Community History | ✅ | `recordCommunityHistory` |
| Community Persistence | ✅ | `persistCommunity` |
| Community API | ✅ | `createCommunityEngine` |

---

## §15–§19 Integrace a zákazy

| Oblast | Stav |
|--------|------|
| Battle read-only context | ✅ `getBattleContext` |
| Economy bonus metadata | ✅ `getReputationBonus` |
| Memory adapter read-only | ✅ contract |
| Participant runtime | 🟡 `MIA_PARTICIPANT_RUNTIME.js` |
| Supporter profiles | 🟡 `MIA_GIFT_SUPPORTER_PROFILE.js` |
| Zakázané aktivity | ✅ `CE_FORBIDDEN_ACTIVITIES` |

---

| Dokument | Stav |
|----------|------|
| [0043](./0043-achievement-engine.md) | Achievement Engine |
| **0044** Community Engine | 🟢 kanon + kotva + contract |
| [0045](./0045-world-engine.md) | World Engine |
