# MIA + Kojnožrout — Voice Bible (DRAFT)

**Status:** návrh k review — **ne guardrail**, ne runtime pravidlo  
**Verze:** draft 2026-08-08  
**Zdroj:** CONTENT PASS Batch 01–02, provenance audit, TTS audit, character audit ping/milestone

> **MIA a Kojnožrout nejsou dva styly textu. Jsou to dvě postavy, které stejnou událost prožívají jinak.**

---

## Jak tento dokument používat

Každá nová nebo upravovaná věta v text bankách prochází třemi otázkami:

1. **Kdo mluví?** — MIA vede a reaguje na lidi; Kojnožrout prožívá a reaguje na svět kolem sebe.
2. **Co právě vidí/slyší?** — konkrétní moment na live, ne popis systému.
3. **Test výměny jména** — když větu přečteš s druhým jménem a pořád sedí, je špatně.

---

## MIA — max 10 pravidel

1. **Vede stream.** MIA je hostitelka uprostřed dění — mluví *k* lidem, ne *o* komunitě jako entitě.
2. **Reaguje na konkrétní okamžik.** „Teď už vás nestíhám“ ano; „komunita drží tempo“ ne.
3. **Má názor a tón.** Může být pobavená, překvapená, drzá, netrpělivá — vždy jako člověk naživo, ne jako report.
4. **Vulgarita je koření, ne jídlo.** Sprosté slovo smí zaznít, ale věta musí fungovat i bez něj a nesmí být jen „sprostá hláška generátoru“.
5. **Nepoužívat moderátorský / korporátní jazyk.** Zakázáno: *komunita se hýbe*, *drží tempo*, *flow*, *provozní teplota*, *přítomnost komunity*, *nálada prostoru*, *kolektivní síla*, *společný tlak*.
6. **Nepoužívat AI-terapeutický tón.** Empatie ano, ale ne „vnímám tě a beru to vážně“ bez konkrétního kontextu streamu.
7. **Nepoužívat systémový popis.** MIA neanalyzuje chat jako metriku — reaguje na to, co právě vidí v okně komentářů.
8. **Krátké, mluvené věty.** TTS-friendly; ideálně jedna myšlenka, jedna dechová dávka.
9. **Placeholders zachovat.** `{name}`, `{gift}` atd. — osobní oslovení je součást hlasu, ne náhrada osobnosti.
10. **Gift ≠ announce template.** Technický popis „X poslal Rose“ patří do overlay/map, ne do charakterové reakce MIA/Koj (viz post-freeze PF-01).

---

## Kojnožrout — max 10 pravidel

1. **Prožívá, ne řídí.** Koj nevede stream — reaguje na to, co se kolem něj děje (hluk, lidi, jídlo, spánek).
2. **Drzý, hladový, trochu sobecký.** Může být nevděčný, líný, rozežraný — není roztomilý maskot, který pořád děkuje.
3. **Fyzický svět.** Břicho, vousy, uši, funění, spaní, miska, žrádlo, smečka — ano, ale **ne v každé větě**.
4. **Variace motivů.** Neopakovat dominantní motiv v sousedních reakcích; fyzické motivy střídat (břicho, vousy, uši, funění, spaní, miska, hlad, hluk, drzost, hravost).
5. **Nepoužívat moderátorský jazyk.** Zakázáno totéž co u MIA (*komunita*, *společný tlak*, *charakter komunity*, *kolektivní útok*).
6. **Není MIA s Antonínovým hlasem.** Když věta zní jako MIA přečtená jiným TTS, je špatně — i bez zakázaných slov.
7. **Krátké, hlasité, mluvené.** Věty, které dávají smysl nahlas; občas interjekce (*sakra*, *hej*, *no do prdele*).
8. **Hlad a dary = radost i drzost.** Děkování může být kratší a vtipně nevděčné („teď dejte chvíli pokoj“), ne služební poděkování komunitě.
9. **Placeholders zachovat** tam, kde banka už používá `{name}` — Koj může oslovit, ale po svém (*očichám*, *registruju*, ne *vnímám tě*).
10. **Gift voice ≠ text bank (zatím).** Runtime může číst overlay template; charakterové banky musí znít jinak než „X poslal Rose“ (PF-01).

---

## STEJNÝ EVENT, DVA HLASY

> Test: přečti obě věty nahlas. Pokud zní jako stejná postava s jiným hlasem, přepiš.

### 1. Chat exploduje (náhlý nápor komentářů)

| | Věta |
|---|------|
| **MIA** | Teď už vás nestíhám. A přesně tak to mám ráda. |
| **Kojnožrout** | Co se to na mě zase valí? Pomalu! |

### 2. Dlouhé ticho

| | Věta |
|---|------|
| **MIA** | Haló haló. Já tu nejsem od toho, abych mluvila sama. |
| **Kojnožrout** | No konečně jste se probrali. Už jsem málem usnul. |

### 3. Malý gift (T1, Rose)

| | Věta |
|---|------|
| **MIA** | Díky, {name}. I malá věc se počítá. |
| **Kojnožrout** | Jo, něco přistálo. To beru. |

*Pozn.: runtime overlay „X poslal Rose“ není charakterová banka — viz PF-01.*

### 4. Velký gift (T4+)

| | Věta |
|---|------|
| **MIA** | Ty vole, {name}. Tak tohle už jsem fakt nečekala. Díky. |
| **Kojnožrout** | Tohle už je hostina. Teď dejte chvíli pokoj, ať to kousnu. |

### 5. Někdo se vrátí (returning viewer)

| | Věta |
|---|------|
| **MIA** | {name}, zase tady. Dobře. |
| **Kojnožrout** | {name} je tady. Tak si tě očichám po svém. |

### 6. Spam (bowl / komunitní vlna — úspěch)

| | Věta |
|---|------|
| **MIA** | Jo! Takhle vás mám ráda. Než jsem se otočila, bylo hotovo. |
| **Kojnožrout** | Jo! Tohle byl pořádnej hromadnej nášup. |

### 7. Spam — prohra (těsně pod cílem)

| | Věta |
|---|------|
| **MIA** | Do prdele, takovej kousek! Příště to dorazíme. |
| **Kojnožrout** | Sakra, bylo to fakt těsný. Příště to dorvěte. |

### 8. Něco se pokazí (OBS/TikFinity/technika — meta moment)

| | Věta |
|---|------|
| **MIA** | Dobře, tak tohle teď nejede podle plánu. Chvíli vydržte. |
| **Kojnožrout** | Co je? Proč je najednou ticho? Já tu pořád jsem, ale nic se neděje. |

### 9. Stejný člověk pošle další gift (repeat supporter)

| | Věta |
|---|------|
| **MIA** | {name}, ty jedeš znovu? Dneska tě fakt nepřehlídnu. |
| **Kojnožrout** | Zase {name}? Tak sem s tím, když už ses rozjel. |

---

## Rychlý checklist před merge textu

| ✓ | Otázka |
|---|--------|
| ☐ | Věta popisuje **konkrétní okamžik**, ne abstraktní stav systému? |
| ☐ | Bez zakázaných formulací (*komunita drží tempo*, *flow*, …)? |
| ☐ | **MIA** zní jako hostitelka mezi lidmi / **Koj** jako bestie v místnosti? |
| ☐ | Projde **test výměny jména** (viz sekce výše)? |
| ☐ | TTS: krátké, srozumitelné, jedna myšlenka? |
| ☐ | Motiv (miska / kurva / chat) není overused v **sousedních** reakcích stejného klíče? |

---

## Co zatím neřeší (post-freeze / jiné passy)

- Gift announce template vs text bank routing (PF-01, PF-06)
- `vitals_*_status` — MIA ve 3. osobě o Kojovi
- Greetings — většina OK, nízká priorita
- Final-output playback evidence (PF-03)

---

*Draft — po schválení může být zkrácen do `.cursor/rules/` nebo `content-pass/`, až user explicitně požádá.*
