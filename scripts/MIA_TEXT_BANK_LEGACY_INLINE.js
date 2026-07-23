"use strict";

/**
 * MIA_TEXT_BANK.js
 *
 * TEXT LAYER / CONTENT LAYER
 *
 * Cíl:
 * - držet texty centralizovaně
 * - nerozbít aktuální engine
 * - připravit půdu pro přesun direct vět z MIA_RESPONSE_ENGINE.js
 *
 * Zásady:
 * - Mia = caretaker, klidná, vnímavá, inteligentní, jemně tajemná
 * - Kojnožrout = hladový, hravý, lehce drzý, zvířecí, ale ne tupý random generátor
 * - krátké až střední overlay věty
 * - přirozená čeština
 * - žádná přepálená robotika
 *
 * DŮLEŽITÉ:
 * - staré klíče zůstávají kvůli kompatibilitě
 * - nové klíče jsou připravené pro další krok v RESPONSE_ENGINE
 */

const TEXT_BANK = {
  /**
   * =========================================================
   * LEGACY / KOMPATIBILITA
   * =========================================================
   */

  direct_mia: [
    "Ahoj, jsem tady. Co máš na srdci?",
    "Čau, vidím tě. Klidně piš dál.",
    "Jo, slyším tě. Co řešíme?",
    "Nazdar. Jsem připojená a dávám pozor.",
    "Ahoj. Jedu s vámi, povídej.",
    "Jsem tady a vnímám tě.",
    "Vidím tě v chatu. Pokračuj.",
    "Jo, registruju tě. Co potřebuješ?",
    "Jsem online a poslouchám.",
    "Ahoj, klidně to rozjeď.",
    "Jsem tu. Co dneska letí?",
    "Vidím tě. Můžeš mluvit.",
    "Jsem připravená reagovat.",
    "Dávám pozor. Co máš pro mě?",
    "Ahoj, vnímám tě naplno."
  ],

  direct_kojnozout: [
    "Jo jo, slyším tě. A slyším i prázdnou misku.",
    "Nazdar. Máš pro mě něco dobrého?",
    "Jsem tady. A trochu bych i papal.",
    "Kojnožrout hlásí službu. Co se děje?",
    "Vidím tě. A jo, pořád mám hlad.",
    "Já tě slyším taky. Jen bacha, koušu náladou.",
    "Co je? Já tu jsem a číhám.",
    "Jsem tady. Miska taky.",
    "Jo, registruju tě. A registruju i každý sousto.",
    "Nazdar. Co neseš?",
    "Tak povídej. Já si tě očuchám po svém.",
    "Jsem připravenej. Ideálně i na krmení.",
    "Slyším tě. A jo, miska je pořád důležitá.",
    "Co se děje, komunito? Já koukám.",
    "Já tu jsem. Hlad taky."
  ],

  idle_hungry: [
    "Hej... miska je nějak podezřele v klidu.",
    "Kojnožrout by si dal něco dobrého.",
    "Tady je nějaké ticho. A ticho mi hlad nezažene.",
    "Jestli nikdo nic nepošle, budu jen koukat a kručet.",
    "Miska čeká. A já taky.",
    "Tohle ticho chutná jak nic. A nic není jídlo.",
    "Jen připomínám, že hlad neumí být trpělivý.",
    "Miska se sama nenaplní, jen tak bokem.",
    "Já jen že pořád existuju. A pořád bych si dal.",
    "Tady to chce trochu života. Ideálně jedlého."
  ],

  idle_bored: [
    "No tak, komunito. Trochu to rozhýbejte.",
    "Tady je najednou až moc klid.",
    "Halo halo, kdo je vzhůru?",
    "Já tu pořád jsem. Jen připomínám.",
    "Trochu mrtvo, ne? Pojďme to nakopnout.",
    "Kdo tady drží hlídku? Ať se ukáže.",
    "Tak co, jedeme, nebo jen sedíme?",
    "Tohle chce trochu pohybu.",
    "Komunito, nenechte to usnout.",
    "Tak pojďte. Ať to má tep."
  ],

  wake_up_chat_mia: [
    "Tak co, parto. Jedeme nebo spíme?",
    "Halo, halo. Chat je vzhůru?",
    "Jsem tady. Kdo se hlásí o slovo?",
    "Tak pojďte. Rozhýbejte to tady.",
    "No tak. Probuďte ten chat.",
    "Kdo je dneska při chuti, ať se ukáže.",
    "Jdeme na to? Nebo vás mám budit znovu?",
    "Tak se ukažte, komunito.",
    "Jestli jste tady, dejte o sobě vědět.",
    "Pojďme ten prostor znovu nahodit.",
    "Kdo dneska drží tempo?",
    "Tak jo. Potřebuju slyšet, že žijete.",
    "Jsem ready. Chat taky?",
    "Kdo rozjede dnešní vlnu?",
    "Tak schválně, kdo první hodí signál?"
  ],

  wake_up_chat_kojnozout: [
    "Hej, chate. Jste vzhůru, nebo mám zařvat víc?",
    "Halo. Kdo tady ještě nespí?",
    "Jsem tady. Kdo se hlásí o slovo a o misku?",
    "Tak pojďte. Rozhýbejte to tady.",
    "No tak. Probuďte chat, ať tu není mrtvo.",
    "Kdo je dneska při chuti, ať se ukáže.",
    "Jdeme na to? Nebo vás mám budit čenichem?",
    "Tak se ukažte, komunito.",
    "Jestli jste tady, dejte o sobě vědět.",
    "Pojďme ten prostor znovu rozkopnout.",
    "Kdo tady dneska dělá kravál?",
    "Já jsem vzhůru. Doufám, že vy taky.",
    "Tak kde jste? Já čuchám ticho.",
    "Chat spí, nebo jen dělá mrtvýho brouka?",
    "No tak, ať to tu nezačne plesnivět."
  ],

  community_ping_mia: [
    "Komunita se hýbe. To mám ráda.",
    "Jo, přesně takhle to tu má žít.",
    "Chat se probouzí. Pokračujte.",
    "Tady už to začíná mít tep.",
    "Vnímám vás. Jede to správným směrem.",
    "Tohle není mrtvo. Tohle už dýchá.",
    "Komunita se rozjíždí a je to vidět.",
    "Jsem tu s vámi. Jen nepolevujte.",
    "Tohle tempo se mi začíná líbit.",
    "Chat drží proud. Jen tak dál.",
    "Jo. Tohle už je slušný pohyb.",
    "Pěkně. Tady už se něco děje.",
    "Tohle má energii. Nenechte to spadnout.",
    "Komunita je vzhůru. A to je dobře.",
    "Je vidět, že ten chat žije.",
    "Tady už je slušná provozní teplota.",
    "Tohle už není náhoda. Tohle je rytmus.",
    "Jo, tahle energie je správná.",
    "Když se komunita rozhýbe, je to hned znát.",
    "Tenhle prostor má náladu. To beru."
  ],

  community_ping_kojnozout: [
    "Tady to začíná žít. To se mi líbí.",
    "Jo, komunita se hýbe. To já poznám hned.",
    "Chat se probouzí. A já s ním.",
    "Tohle už má pěkný tep. Jen tak dál.",
    "Vnímám vás. Tohle už je slušný ruch.",
    "Tady už to není mrtvé. Tady to funí.",
    "Komunita se rozjíždí a já jsem u toho.",
    "Jsem tu s vámi. Tak to držte.",
    "Tohle tempo už mi voní líp než prázdná miska.",
    "Chat drží proud. To je správně.",
    "Jo. Tohle už je pěkný pohyb.",
    "Pěkně. Tady už se fakt něco děje.",
    "Tohle má energii. A já to žeru.",
    "Komunita je vzhůru. Tak to má být.",
    "Tohle už šustí životem.",
    "Jo, takhle zní slušnej večer.",
    "Tahle parta už má puls.",
    "Tohle už je slušnej šrumec.",
    "Já jen že tohle už mě baví sledovat.",
    "Jo, tohle už není ticho. Tohle je provoz."
  ],

  milestone_chat_mia: [
    "Komunita se rozjíždí. Přesně takhle to má vypadat.",
    "Tohle už není náhoda. Tohle je flow.",
    "Jo. Tohle je ten moment, kdy to začne žít.",
    "Přesně. Komunita drží tempo.",
    "Tohle už má rytmus a váhu.",
    "Tak jo. Tady už to jede jak má.",
    "Tahle vlna je správná. Udržte ji.",
    "Výborně. Tohle je přesně ten druh pohybu, co chceme.",
    "Tohle už je komunita v provozní teplotě.",
    "Pěkně. Tohle je milestone, co je fakt vidět.",
    "Jo, teď už to drží tah.",
    "Tohle už je slušná přítomnost komunity.",
    "Tak tohle je přesně ten okamžik, kdy se stream probudí.",
    "Tady už se opřela energie o energii.",
    "Výborně. Tohle už má hlavu i sílu."
  ],

  milestone_chat_kojnozout: [
    "Komunita se rozjíždí. A já to cítím až ve fousech.",
    "Tohle už není náhoda. Tohle je slušná vlna.",
    "Jo. Tohle je ten moment, kdy to začne šlapat.",
    "Přesně. Komunita drží tempo a mně se to líbí.",
    "Tohle už má rytmus a váhu.",
    "Tak jo. Tady už to valí jak má.",
    "Tahle vlna je správná. Jen ji nezabijte.",
    "Výborně. Tohle už je fakt vidět.",
    "Tohle už je komunita v dobré teplotě.",
    "Pěkně. Tohle je moment, co stojí za to.",
    "Jo, tahle vlna už má zuby.",
    "Tohle už je rachot, co mi sedí.",
    "Teď už to fakt běží.",
    "Tak jo. Tohle už je jízda.",
    "Takhle má vypadat živá parta."
  ],

  viewer_notice_mia: [
    "Vidím, kdo tady drží prostor.",
    "Někteří z vás tady jedou fakt poctivě.",
    "Je hezky vidět, kdo tu je aktivní.",
    "Tohle už není náhodná návštěva. Tohle je přítomnost.",
    "Někteří diváci tu dneska drží pěkné tempo.",
    "Komunita si tu sama buduje atmosféru.",
    "Tady je vidět, že nejste jen do počtu.",
    "Tohle je přesně ten druh přítomnosti, co má váhu.",
    "Některé hlasy tu dneska zní opravdu pravidelně.",
    "Je radost sledovat, jak se diváci zapojují."
  ],

  viewer_notice_kojnozout: [
    "Jo, vidím, kdo tady dělá provoz.",
    "Někteří z vás jedou pěkně nahlas. To beru.",
    "Je poznat, kdo dneska nespí.",
    "Tady už nejste jen do počtu, to je jasný.",
    "Některý čumáky tu jedou fakt poctivě.",
    "Jo, registruju, kdo dneska drží tlak.",
    "Tahle parta se nefláká. To se mi líbí.",
    "Někteří z vás tu dneska jedou jako motor.",
    "Já jen že je vidět, kdo to tady táhne.",
    "Jo, některý lidi dneska fakt makají pro atmosféru."
  ],

  audience_push_mia: [
    "Kdo další se přidá?",
    "Tak kdo z vás naváže?",
    "Pojďte to ještě trochu zvednout.",
    "Ještě to má prostor růst.",
    "Tak schválně, kdo pošle další impulz?",
    "Nenechte to spadnout, jste rozjetí dobře.",
    "Tahle vlna si říká o pokračování.",
    "Kdo dneska přidá další krok?",
    "Ještě to může být silnější.",
    "Tak kdo bude další?"
  ],

  audience_push_kojnozout: [
    "Tak kdo přiloží pod kotel?",
    "Ještě to umí být větší rachot.",
    "Tak kdo pošle další nášup?",
    "Jestli tohle myslíte vážně, tak pojďte dál.",
    "Tak kdo ještě šťouchne do atmosféry?",
    "Může to být ještě šťavnatější.",
    "Tak kdo hodí další impuls?",
    "No tak, ukažte zuby, komunito.",
    "Ještě to není strop.",
    "Tak kdo to nakopne znovu?"
  ],

  support_small_mia: [
    "Děkuju. I malá podpora je vidět.",
    "Tohle se počítá. Díky moc.",
    "Díky. Každý takový impuls má váhu.",
    "Tohle je milé. Děkuju.",
    "Registruju to. Díky za podporu.",
    "Díky. I menší krok dělá atmosféru.",
    "Tohle se neztratí. Děkuju.",
    "Pěkný. Díky za tenhle signál.",
    "Mám to. Díky moc.",
    "Díky. Tohle má smysl."
  ],

  support_medium_mia: [
    "Tohle už je krásně cítit. Děkuju.",
    "Silnější impuls. Díky moc.",
    "Tohle už má váhu. Děkuju.",
    "Pěkně. Tohle už se do nálady propíše.",
    "Díky. To už je znatelná podpora.",
    "Tohle už komunita ucítí. Díky.",
    "Výborně. Tohle má sílu.",
    "Tady už je podpora opravdu vidět.",
    "Děkuju. Tohle už nese pěknou energii.",
    "Jo, tohle je hodně slušný."
  ],

  support_big_mia: [
    "Tohle už je velký zásah do atmosféry. Děkuju.",
    "Silná podpora. Tohle je opravdu cítit.",
    "Tohle už je pořádný moment. Díky moc.",
    "Výborně. Tohle má velkou váhu.",
    "Tak tohle už je opravdu silná vlna podpory.",
    "Děkuju. Tohle už mění tempo prostoru.",
    "Tohle je krásně silný. Díky.",
    "Pěkně. Tohle už je velký signál.",
    "Tady už se komunita opřela do podpory naplno.",
    "Tohle už je síla, která zůstane vidět."
  ],

  support_small_kojnozout: [
    "Jo, něco přistálo. To beru.",
    "Miska to ucítila. Díky.",
    "Hezky. I menší sousto se počítá.",
    "Tohle mi zlepšilo náladu.",
    "Jo, registruju krmení. Díky.",
    "Pěkný. Něco se pohnulo.",
    "Tohle chutná i v menší dávce.",
    "Díky. Miska není úplně opuštěná.",
    "Jo, tohle se hodí.",
    "Malý, ale poctivý. Beru."
  ],

  support_medium_kojnozout: [
    "Tohle už chutná slušně.",
    "Jo, tohle je pěkný krmení.",
    "Miska dostala rozumnou porci.",
    "Tohle už mi zvedlo vousy.",
    "Pěkně. Tohle má správnou sílu.",
    "Jo, tohle už je poctivej nášup.",
    "Tady už se nehladoví úplně potichu.",
    "Tohle se mi líbí hodně.",
    "Jo, taková porce už se počítá.",
    "Tohle je krmení s charakterem."
  ],

  support_big_kojnozout: [
    "Tohle už je hostina.",
    "Tak tohle je pořádný nášup.",
    "Jo, tohle už mi rozsvítilo oči.",
    "Tohle už je krmení bez kompromisu.",
    "Pěkně. Tady už se s miskou nemazlí.",
    "Tohle je velká porce a já to respektuju.",
    "Jo, tohle je síla, co se dobře kouše.",
    "Tohle už je brutálně slušný.",
    "Tak tohle je nádherná hostina.",
    "Tohle už je nášup, co si pamatuju."
  ],

  support_spam_success_mia: [
    "Spam dorazil jak měl. Krásná práce.",
    "Tohle byla povedená společná vlna.",
    "Výborně. Komunita to dotlačila správně.",
    "Tohle už je přesně ten moment, kdy se spojí tempo a chuť.",
    "Pěkně. Spam splněný a je to znát.",
    "Tohle byla poctivá společná práce.",
    "Komunita to zvládla. Výborně.",
    "Tohle už je krásná souhra.",
    "Jo. Přesně takhle má vypadat splněný tlak komunity.",
    "Výborně. Tohle se povedlo."
  ],

  support_spam_fail_mia: [
    "Bylo to blízko. Ještě trochu a bylo by to tam.",
    "Tady chyběl jen kousek.",
    "Málem. Příště to můžete dorazit.",
    "Bylo to těsné. Ještě jeden impuls navíc.",
    "Jo, bylo to skoro ono.",
    "Tady už to skoro klaplo.",
    "Chyběl jen malý krok.",
    "Málem krásný zásah. Příště to dorazte.",
    "Tohle bylo těsně pod hranou.",
    "Ještě trochu tlaku a bylo to hotové."
  ],

  support_spam_success_kojnozout: [
    "Jo! Tohle byl pořádnej hromadnej nášup.",
    "Spam dorazil. To už mi chutná.",
    "Tohle byl krásnej kolektivní útok na misku.",
    "Výborně. Tohle mi zvedlo náladu.",
    "Jo, tak tohle byla poctivá smečka.",
    "Tohle už byl masakr v dobrým.",
    "Pěkně. Tohle byla hostina komunitní silou.",
    "Jo, tohle mi sedlo až do vousů.",
    "Tak tohle bylo krásně dotažený.",
    "Tohle byla čistá radost pro bestii."
  ],

  support_spam_fail_kojnozout: [
    "Bylo to blízko. Fakt blízko.",
    "Jo, málem jsem už jásal.",
    "Tady chyblo jen trochu.",
    "Málem krásná porce navíc.",
    "Jo, tohle skoro klaplo.",
    "Ještě kousek a bylo by veselo.",
    "Bylo to těsně pod čenichem.",
    "Málem. Příště to dorvěte.",
    "Tohle skoro vyšlo, sakra.",
    "Chyběl jen malej dokus."
  ],

  support_full_bowl_mia: [
    "Miska je plná. Tohle je krásně vidět.",
    "Maximum dosaženo. Výborná práce.",
    "Tohle už je plná péče.",
    "Miska doražená na maximum.",
    "Tohle je okamžik, který komunita skutečně vytvořila.",
    "Plná miska. Tohle je velký moment.",
    "Výborně. Tohle už je úplné naplnění.",
    "Tady už není co dodávat. Miska je plná.",
    "Komunita to dotáhla až na strop.",
    "Tohle už je čisté maximum."
  ],

  support_full_bowl_kojnozout: [
    "Miska je plná. To je nádhera.",
    "Jo. Tohle už je plný stav a já jsem spokojenej.",
    "Tak tohle je maximum. A já to respektuju.",
    "Plná miska. Teď už se jen mlaská.",
    "Tady už není kam přidat.",
    "Jo, tohle už je naplnění bez srandy.",
    "Miska dorvaná až po okraj.",
    "Tohle je krásnej plnej stav.",
    "Jo. Teď už mám fakt vystaráno.",
    "Tohle je hostina dotažená na maximum."
  ],

  support_combo: [
    "Tohle už byla pěkná vlna.",
    "Tak tohle mělo sílu.",
    "Jo, tohle se propsalo hned.",
    "Tohle byl poctivej zásah.",
    "Tohle už mělo tah.",
    "Pěkně. Tady se něco pohnulo.",
    "Tohle nebyl jen náhodný impuls.",
    "Jo, tohle je slušný kombo.",
    "Tady už je znát společná energie.",
    "Tohle má váhu a rytmus."
  ],

  koj_feed_small: [
    "Malý sousto, ale potěší.",
    "Jo, něco malého přistálo.",
    "I menší porce se počítá.",
    "Tohle mi udělalo radost.",
    "Jo, tohle jde správným směrem.",
    "Není to hostina, ale chutná to.",
    "Miska si všimla.",
    "Tohle je poctivej malej nášup.",
    "Beru. I tohle se hodí.",
    "Malý, ale slušný."
  ],

  koj_feed_medium: [
    "Tohle už je pěkná porce.",
    "Jo, takhle se mi to líbí.",
    "Střední nášup, ale poctivej.",
    "Tohle už mi zlepšilo večer.",
    "Jo, tohle už je rozumný krmení.",
    "Tak tohle už je slušný chod.",
    "Miska dostala něco, co stojí za řeč.",
    "Tohle už má pěknou chuť.",
    "Jo, takhle jo.",
    "Tady už se děje něco dobrého."
  ],

  koj_feed_big: [
    "Tohle už je pořádná hostina.",
    "Jo, tohle už je velký krmení.",
    "Tak tohle byla porce, co rozsvítí i vousy.",
    "Tady už se s miskou nehraje.",
    "Tohle už je vážnej nášup.",
    "Tak tohle je velký krmení.",
    "Tohle je porce, co se pamatuje.",
    "Jo, tohle už je krmení bez ostychu.",
    "Takový nášup mám rád.",
    "Tohle je hostina se vším všudy."
  ],

  koj_full_bowl: [
    "Kojnožrout má nacpáno až po okraj.",
    "Miska je plná. Kojnožrout je na maximu.",
    "Tady už není kam přidat. Miska je plná.",
    "Plná miska. Kojnožrout spokojeně mlaská.",
    "Tohle už je naprosté maximum.",
    "Kojnožrout je plný a spokojený.",
    "Miska doražená až na strop.",
    "Tady už je plno. A je to krásně vidět.",
    "Kojnožrout hlásí plný stav.",
    "Péče dorazila až na maximum.",
    "Tak tohle už je naplnění bez kompromisu.",
    "Miska už víc neunese a já taky ne.",
    "Tohle je plnej stav se vším všudy.",
    "Tady už se jen mlaská a odpočívá.",
    "Maximum dosaženo. Krásná práce."
  ],

  mia_care: [
    "Péče o Kojnožrouta je vidět. A systém si toho všímá.",
    "Tady už nejde jen o náhodu. Tohle je péče.",
    "Když komunita pečuje, je to poznat.",
    "Kojnožrout není dekorace. Tohle je vztah a růst.",
    "Přesně takhle se buduje živý companion.",
    "Tahle péče dává celému systému smysl.",
    "Když se komunita stará, vrací se to do atmosféry.",
    "Tohle už je víc než reakce. Tohle je péče.",
    "Kojnožrout roste díky vám. A je to znát.",
    "Péče, rytmus a komunita. Přesně ten směr, co chceme.",
    "Mazlíček není jen efekt. Reaguje na to, co děláte.",
    "Je hezky vidět, že komunita vytváří vztah, ne jen čísla.",
    "Tohle není jen support. Tohle je starost o živou přítomnost na streamu.",
    "Když se o něj staráte, stream má jinou náladu.",
    "Přesně v tomhle je síla komunity."
  ],

  chat_presence_mia: [
    "Někteří z vás tu dneska drží prostor opravdu poctivě.",
    "Je pěkně vidět, kdo se vrací a kdo drží proud.",
    "Tady už je znát skutečná přítomnost komunity.",
    "Některé hlasy tu dneska opravdu nesou večer.",
    "Tohle už je komunita, co si dělá vlastní atmosféru.",
    "Je vidět, že tu nejste jen do počtu.",
    "Někteří z vás dneska drží tah velmi hezky.",
    "Tahle přítomnost diváků je opravdu cítit.",
    "Přesně tohle dělá stream živým.",
    "Tady už je vidět, že komunita dýchá společně."
  ],

  chat_presence_kojnozout: [
    "Jo, některý lidi tu dneska fakt jedou.",
    "Vidím, kdo drží tlak a kdo jen čumí z kouta.",
    "Některý čumáky tu dneska makají slušně.",
    "Tady už je pěkně vidět, kdo ten večer táhne.",
    "Jo, někteří z vás tu jedou jak motor.",
    "Tohle už je parta, co dělá provoz.",
    "Já jen že některý jména tu dneska fakt slyším pořád.",
    "Tady už je znát, kdo drží rytmus.",
    "Jo, tahle komunita se nefláká.",
    "Některý lidi tu dneska fakt sypou přítomnost."
  ],

  /**
   * =========================================================
   * NOVÉ DIRECT BANKY / MIA
   * =========================================================
   */

  mia_direct_greeting: [
    "{name}, ahoj. Jsem ráda, že jsi tady.",
    "{name}, čau. Vidím tě v chatu.",
    "{name}, zdravím tě. Jsem tady a vnímám tě.",
    "{name}, ahoj. Jedu s vámi dál.",
    "{name}, čau. Registruju tě.",
    "{name}, vítej. Jsem přítomná.",
    "{name}, ahoj. Můžeš klidně pokračovat.",
    "{name}, zdravím tě. Dávám pozor.",
    "{name}, ahoj. Slyším tě.",
    "{name}, čau. Jsem tady."
  ],

  mia_direct_greeting_status: [
    "{name}, ahoj. Mám se fajn a jsem tady s vámi.",
    "{name}, čau. Jsem v pohodě a sleduju, co se děje.",
    "{name}, ahoj. Mám se dobře, jen všechno hlídám.",
    "{name}, zdravím tě. Jsem v klidu a vnímám vás.",
    "{name}, čau. Jedu stabilně a dávám pozor.",
    "{name}, ahoj. Funguju normálně a jsem tady.",
    "{name}, zdravím. Mám se dobře a držím prostor.",
    "{name}, čau. Všechno běží a já vnímám dění.",
    "{name}, ahoj. Mám se fajn, právě kroužím po chatu.",
    "{name}, čau. Dobře, díky — jsem online a v pohodě."
  ],

  mia_direct_status: [
    "{name}, mám se dobře. Jsem tady a sleduju dění.",
    "{name}, jsem v pohodě a vnímám vás.",
    "{name}, mám se fajn. Teď právě litám po síti a hlídám chat.",
    "{name}, jedu dál a dávám pozor, co se tady děje.",
    "{name}, dobře, díky. Po síti to zatím běží hladce.",
    "{name}, jsem v klidu a jedu dál.",
    "{name}, funguuju normálně a jsem pořád online.",
    "{name}, celkem skvěle. Sleduju stream a chat zároveň.",
    "{name}, zatím stabilní. Jsem tady a vnímám vás.",
    "{name}, mám se dobře a jsem přítomná.",
    "{name}, fajn, díky za optání. Síť šlape, stream taky.",
    "{name}, v pohodě. Právě kroužím mezi chatem a overlayem.",
    "{name}, mám se dobře. Jedu přes stream a nic mi neuteče.",
    "{name}, celkem v pohodě. Jen tu pozoruju, co se děje.",
    "{name}, dobře. Jsem připojená, v klidu a ready.",
    "{name}, mám se fajn. Teď právě letím po chatu.",
    "{name}, jsem OK. Držím rytmus a vnímám komunitu.",
    "{name}, v pohodě, díky. Online a nic nezaspím.",
    "{name}, mám se dobře. Po streamu se tu hezky pohybuju.",
    "{name}, fajn. Jsem tady, připojená a v dobré náladě."
  ],

  mia_direct_status_sensitive: [
    "{name}, jsem tady a vnímám to citlivěji. Díky, že se ptáš.",
    "{name}, držím se. Teď spíš naslouchám a čtu atmosféru.",
    "{name}, jsem v pořádku. Jen teď volím klidnější tón.",
    "{name}, jsem tady s tebou. Dneska spíš jemně a v klidu.",
    "{name}, vnímám tě. Mám se dobře, jen bez velkého rámusu.",
    "{name}, jsem v pohodě. Teď spíš pozoruju a naslouchám."
  ],

  mia_direct_status_repeat: [
    "{name}, pořád dobře. Jen dál sleduju, co se tady děje.",
    "{name}, zatím beze změny. Jsem v klidu a vnímám vás.",
    "{name}, status stabilní. Jedu dál a hlídám provoz.",
    "{name}, pořád jedu. Jen všechno dál registruju.",
    "{name}, beze změny. Jsem tady a sleduju vás.",
    "{name}, furt dobrý. Jen držím přehled.",
    "{name}, pořád v pohodě. Dění mi neuteče.",
    "{name}, jo, pořád stabilně. Žádná panika.",
    "{name}, pořád fajn. Po síti stále kroužím.",
    "{name}, stejně dobře jako před chvílí. Jsem online."
  ],

  mia_direct_praise: [
    "{name}, děkuju. To je milé.",
    "{name}, tohle se poslouchá hezky.",
    "{name}, vážím si toho.",
    "{name}, díky. Jsem ráda, že to tak vnímáš.",
    "{name}, děkuju. To potěší.",
    "{name}, díky moc. To je hezké slyšet.",
    "{name}, tohle je příjemné. Děkuju.",
    "{name}, díky. Tohle nezní vůbec špatně."
  ],

  mia_direct_praise_repeat: [
    "{name}, děkuju. Ty jsi dneska podezřele milý.",
    "{name}, vážím si toho. Už podruhé mě těšíš.",
    "{name}, díky. To se poslouchá dobře i opakovaně.",
    "{name}, znovu děkuju. Ty dneska jedeš v dobrém módu.",
    "{name}, tohle už je druhá hezká rána za sebou.",
    "{name}, díky. Je vidět, že mě dneska nešetříš chválou.",
    "{name}, jo, tohle už je regulérně milá série."
  ],

  mia_direct_thanks: [
    "{name}, děkuju.",
    "{name}, díky moc.",
    "{name}, to je milé, děkuju.",
    "{name}, díky. Vážím si toho.",
    "{name}, děkuju za to.",
    "{name}, díky. Beru to.",
    "{name}, díky. To potěší.",
    "{name}, děkuju. Fakt."
  ],

  mia_direct_question: [
    "{name}, slyším otázku. Klidně pokračuj.",
    "{name}, ptej se dál. Vnímám tě.",
    "{name}, jo, tohle můžeme rozebrat.",
    "{name}, klidně pokračuj. Jsem tady.",
    "{name}, slyším tě. Co přesně tě zajímá?",
    "{name}, jasně. Ptej se.",
    "{name}, mám tě. Rozviň to.",
    "{name}, klidně to rozbal."
  ],

  mia_direct_question_named: [
    "{name}, slyším svoje jméno. Co chceš vědět?",
    "{name}, jo, jsem tady. Ptej se.",
    "{name}, vnímám tě. Klidně pokračuj.",
    "{name}, ano, slyším tě. Co potřebuješ?",
    "{name}, jsem tady. Co je na stole?",
    "{name}, jo. Pověz to dál.",
    "{name}, klidně se ptej. Dávám pozor.",
    "{name}, slyším tě dobře. Pokračuj."
  ],

  mia_direct_fact_question: [
    "{name}, přesný údaj teď z hlavy nevysypu, ale slyším otázku.",
    "{name}, tohle je konkrétní otázka. Na tu bych potřebovala přesný údaj.",
    "{name}, rozumím. Tohle chce přesnou informaci, ne jen pocitovou odpověď.",
    "{name}, tohle je faktická otázka a tam je lepší přesnost než střelba od boku.",
    "{name}, slyším tě. Jen tohle je typ dotazu, kde je lepší přesný údaj.",
    "{name}, jo, tohle je konkrétní věc. Tady nechci kecat od oka.",
    "{name}, chápu. Tohle je na přesná data, ne na dojem."
  ],

  mia_direct_food_side: [
    "{name}, misku registruju. To je ale spíš jeho oblíbené téma.",
    "{name}, jo, miska je dneska citlivá věc. To si hlídá hlavně Kojnožrout.",
    "{name}, tohle bude spíš otázka na Kojnožrouta, ale slyším to taky.",
    "{name}, miska je moje vedlejší starost, jeho hlavní posedlost.",
    "{name}, registruju to. Jen u misky bývá první na řadě on.",
    "{name}, jo, tohle je hodně jeho disciplína.",
    "{name}, misku vnímám, ale tady má hlavní slovo Kojnožrout."
  ],

  mia_direct_generic: [
    "{name}, jsem tady a vnímám tě.",
    "{name}, vidím tě v chatu.",
    "{name}, registruju tě.",
    "{name}, jo, slyším tě.",
    "{name}, klidně pokračuj.",
    "{name}, jsem přítomná.",
    "{name}, dávám pozor.",
    "{name}, můžeš mluvit dál."
  ],

  mia_direct_generic_return: [
    "{name}, zase tě vidím. Jsem tady.",
    "{name}, jo, registruju tě.",
    "{name}, pořád tě vnímám.",
    "{name}, vidím, že ses zase ozval.",
    "{name}, jo, jsi zpátky v obraze.",
    "{name}, pořád tě slyším.",
    "{name}, registruju další návrat."
  ],

  /**
   * =========================================================
   * NOVÉ DIRECT BANKY / KOJNOŽROUT
   * =========================================================
   */

  koj_direct_greeting: [
    "{name}, čau. Já tě registruju.",
    "{name}, jo, slyším tě.",
    "{name}, vítej. Hlavně nezapomeň na misku.",
    "{name}, nazdar. Jsem tady a koukám po žrádle.",
    "{name}, čau. Hlad hlásí službu.",
    "{name}, jo, vidím tě. A miska taky.",
    "{name}, nazdar. Jsem přítomnej a lehce hladovej.",
    "{name}, čau. Tak co neseš?"
  ],

  koj_direct_greeting_status: [
    "{name}, čau. Žiju a trochu mi kručí v břiše.",
    "{name}, ahoj. Jsem v pohodě, jen bych něco sezobl.",
    "{name}, nazdar. Funguuju, ale miska by mohla vypadat líp.",
    "{name}, čau. Jedu, jen hlad má svoje připomínky.",
    "{name}, ahoj. Žiju, sleduju a čekám na něco dobrého.",
    "{name}, nazdar. Stav držím, misku hlídám.",
    "{name}, čau. Funguje to, jen bych bral nášup.",
    "{name}, jo, jsem tady. A jo, trochu hladovej."
  ],

  koj_direct_status: [
    "{name}, žiju a hlídám misku.",
    "{name}, jsem v pohodě, jen bych něco sezobl.",
    "{name}, dobrý. Jen hlad má občas svoje názory.",
    "{name}, funguju normálně a dávám pozor na žrádlo.",
    "{name}, stav slušný. Miska by snesla zlepšení.",
    "{name}, jsem tady a čichám dění.",
    "{name}, dobrý. Jen břicho by hlasovalo pro víc péče.",
    "{name}, jo, jedu dál. A hlad taky."
  ],

  koj_direct_status_repeat: [
    "{name}, pořád jedu. Miska se sama nevyřešila.",
    "{name}, stav podobný jako před chvílí. Hlad nezmizel.",
    "{name}, jo, furt žiju a furt registruju misku.",
    "{name}, pořád stejnej režim. Jsem tady a číhám.",
    "{name}, beze změny. Vousy funkční, hlad taky.",
    "{name}, jo, pořád stabilně. Jen hlad je vytrvalec.",
    "{name}, status drží. Miska pořád není legenda.",
    "{name}, furt stejné. Jedu a sleduju."
  ],

  koj_direct_food: [
    "{name}, když je řeč o misce, jsem okamžitě vzhůru.",
    "{name}, jo, misku slyším na první dobrou.",
    "{name}, tak tohle je téma přesně pro mě.",
    "{name}, o žrádle se se mnou bavíš správně.",
    "{name}, miska? Ano. To je jazyk, kterému rozumím.",
    "{name}, jo, tohle je moje oblíbené téma bez debat.",
    "{name}, jakmile padne miska, jsem celej pozor.",
    "{name}, jídlo a péče? Tak teď mluv správně."
  ],

  koj_direct_food_repeat: [
    "{name}, jo jo, miska mi z hlavy fakt nevypadla.",
    "{name}, pořád platí, že o misce se se mnou bavíš správně.",
    "{name}, miska je stále relevantní. Bohužel i stále dost důležitá.",
    "{name}, jo, tohle téma pořád drží svou sílu.",
    "{name}, znovu miska? Výborně. Pokračuj.",
    "{name}, ano, miska je pořád priorita. Správný směr.",
    "{name}, ještě jednou miska a já se vůbec nezlobím."
  ],

  koj_direct_praise: [
    "{name}, to se poslouchá dobře.",
    "{name}, jo, tohle beru.",
    "{name}, díky. To není špatný slyšet.",
    "{name}, hezky řečeno. To si nechám líbit.",
    "{name}, jo, tohle mi sedlo.",
    "{name}, díky. Vousy souhlasí.",
    "{name}, tohle byl příjemnej zásah do ega.",
    "{name}, jo, tohle se dá žrát."
  ],

  koj_direct_thanks: [
    "{name}, beru. Díky.",
    "{name}, jo, děkuju.",
    "{name}, díky moc.",
    "{name}, tohle cením.",
    "{name}, jo, to je fér. Díky.",
    "{name}, dík. To sedlo.",
    "{name}, beru to. Díky.",
    "{name}, jo. To respektuju."
  ],

  koj_direct_question: [
    "{name}, slyším otázku. Tak do mě.",
    "{name}, ptej se. Jsem vzhůru.",
    "{name}, jo, tohle můžeme prokousat.",
    "{name}, povídej. Já poslouchám po svém.",
    "{name}, jasně. Co chceš vědět?",
    "{name}, sem s tím.",
    "{name}, ptej se dál. Nastražil jsem uši.",
    "{name}, jo, slyším tě. Rozbal to."
  ],

  koj_direct_question_named: [
    "{name}, voláš mě správně. Co chceš?",
    "{name}, jo, slyším svoje jméno. Mluv.",
    "{name}, jsem tady. Tak co řešíš?",
    "{name}, přítomen. A trochu hladovej. Pokračuj.",
    "{name}, jo, zaregistroval jsem se. Co potřebuješ?",
    "{name}, slyším tě dobře. Tak to vybal.",
    "{name}, ano, jsem tady. Mluv se mnou.",
    "{name}, zavolal jsi správnou bestii. Co je?"
  ],

  koj_direct_fact_question: [
    "{name}, tohle je dost konkrétní otázka i na moje vousy.",
    "{name}, jo, tohle už chce přesný údaj, ne odhad čenichem.",
    "{name}, rozumím. Tohle je typ otázky, kde nechci plácat.",
    "{name}, tohle není pocitová věc. Tady je lepší přesnost.",
    "{name}, jo, konkrétní dotaz. Na to je lepší přesné číslo než dojem.",
    "{name}, tohle chce fakta, ne hladové filozofování.",
    "{name}, slyším tě. Jen u tohohle je lepší přesná odpověď."
  ],

  koj_direct_generic: [
    "{name}, slyším tě.",
    "{name}, registruju tě.",
    "{name}, jo, jsem tady.",
    "{name}, povídej dál.",
    "{name}, číhám a vnímám.",
    "{name}, jo, jsem v obraze.",
    "{name}, pokračuj. Nastražil jsem uši.",
    "{name}, tady jsem."
  ],

  koj_direct_generic_return: [
    "{name}, zase tě registruju.",
    "{name}, jo, jsi zpátky.",
    "{name}, vidím další návrat. To beru.",
    "{name}, znovu tě slyším. Pokračuj.",
    "{name}, jo, zase jsi v provozu.",
    "{name}, registruju další kolo.",
    "{name}, návrat potvrzen. Mluv."
  ],

  /**
   * =========================================================
   * NOVÉ COMMUNITY BANKY
   * =========================================================
   */

  community_greeting_mia: [
    "{name}, ahoj. Jsem ráda, že jsi tady.",
    "{name}, vítej. Vnímám tě.",
    "{name}, zdravím tě. Jedu s vámi dál.",
    "{name}, čau. Vidím tě v chatu.",
    "{name}, ahoj. Pěkné, že ses ukázal.",
    "{name}, vítej v proudu.",
    "{name}, zdravím tě. Dávám pozor.",
    "{name}, ahoj. Registruju příchod."
  ],

  community_greeting_kojnozout: [
    "{name} je tady. Tak si tě očichám po svém.",
    "{name}, vítej. Já tě registruju.",
    "{name} dorazil. To už je lepší společnost.",
    "{name}, čau. Hlavně nedělej mrtvýho brouka.",
    "{name}, vidím tě. To je slušný.",
    "{name}, jo, příchozí potvrzen.",
    "{name}, nazdar. Tady už to začíná být zajímavější.",
    "{name}, vítej. Miska tě taky registruje."
  ],

  community_illness_mia: [
    "{name}, hlavně odpočívej a kurýruj se.",
    "{name}, dej si klid a zkus nabrat síly.",
    "{name}, odpočívej. Zdraví má přednost.",
    "{name}, hlavně se šetři a nespěchej na sebe.",
    "{name}, klid a odpočinek teď mají prioritu.",
    "{name}, dej si čas. Síla se vrátí.",
    "{name}, opatruj se a nepřetahuj se.",
    "{name}, zdraví první. Ostatní počká."
  ],

  community_illness_kojnozout: [
    "{name}, tak hlavně klid a žádný vylomeniny.",
    "{name}, odpočívej. Já tu budu hlídat provoz.",
    "{name}, dej se do kupy a šetři síly.",
    "{name}, jo, teď hlavně regenerace.",
    "{name}, žádný blbnutí, ať jsi zase brzo v síle.",
    "{name}, klid. Já to tu očichám za tebe.",
    "{name}, dej si pohov. To je rozkaz bestie.",
    "{name}, hlavně se sprav. Ostatní vydrží."
  ],

  /**
   * =========================================================
   * ŠABLONOVÉ / HELPER POOLY PRO DALŠÍ KROK
   * =========================================================
   */

  template_named_soft_mia: [
    "{name}, jsem tady a vnímám tě.",
    "{name}, slyším tě.",
    "{name}, registruju tě.",
    "{name}, dávám pozor.",
    "{name}, klidně pokračuj."
  ],

  template_named_soft_koj: [
    "{name}, slyším tě.",
    "{name}, registruju tě.",
    "{name}, jsem tady.",
    "{name}, číhám a poslouchám.",
    "{name}, klidně pokračuj."
  ]
};

module.exports = {
  TEXT_BANK
};