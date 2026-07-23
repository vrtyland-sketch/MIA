"use strict";

/**
 * MIA_VOICE_CONTROL_LAYER.js
 *
 * CANONICAL VOICE COMMAND LAYER
 *
 * CÍL:
 * - trusted vrstva pro streamera
 * - oddělit:
 *   1) MIA = lidský asistent
 *   2) Kojnožrout = mazlíček / herní entita / status vrstva
 *   3) System/world mode = řízení režimu světa
 *
 * DŮLEŽITÉ:
 * - tento modul NIC sám nespouští v OBS
 * - pouze vrací rozhodnutí / intent contract
 * - OBS executor nebo world-mode executor se napojí až nad tím
 */

function nowTs() {
  return Date.now();
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value, fallback = "") {
  return safeString(value, fallback).replace(/\s+/g, " ").trim();
}

function stripDiacritics(value = "") {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeLoose(value = "", fallback = "") {
  return stripDiacritics(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickFirst(...values) {
  for (const value of values) {
    const str = safeString(value);
    if (str) return str;
  }
  return "";
}

function cloneJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return fallback;
  }
}

function createVoiceControlLayer(deps = {}) {
  const appendJsonLog =
    typeof deps.appendJsonLog === "function" ? deps.appendJsonLog : null;

  const getNowTs =
    typeof deps.nowTs === "function" ? deps.nowTs : nowTs;

  function resolveVoiceCommand(input = {}) {
    const text = normalizeText(input.text);
    const trusted = input.trusted !== false;
    const source = safeString(input.source, "streamer_voice");
    const speaker = safeString(input.speaker, "streamer");

    const streamState = input.streamState || {};
    const kojnozoutState = input.kojnozoutState || {};
    const miaEconomySnapshot = input.miaEconomySnapshot || null;
    const runtimeState = input.runtimeState || {};

    const loose = normalizeLoose(text);

    if (!text) {
      return buildRejected("empty_command", {
        source,
        speaker
      });
    }

    if (!trusted) {
      return buildRejected("untrusted_voice_source", {
        source,
        speaker,
        text
      });
    }

    const target = detectTarget(loose);
    const systemDecision = resolveSystemCommand(loose, {
      source,
      speaker,
      text,
      runtimeState
    });

    if (systemDecision) {
      logDecision("voice_system_command", systemDecision);
      return systemDecision;
    }

    if (target === "kojnozout") {
      const decision = resolveKojnozoutCommand(loose, {
        source,
        speaker,
        text,
        kojnozoutState,
        streamState,
        miaEconomySnapshot
      });

      logDecision("voice_kojnozout_command", decision);
      return decision;
    }

    if (target === "mia") {
      const decision = resolveMiaCommand(loose, {
        source,
        speaker,
        text,
        kojnozoutState,
        streamState,
        miaEconomySnapshot,
        runtimeState
      });

      logDecision("voice_mia_command", decision);
      return decision;
    }

    const fallbackDecision = resolveDefaultCommand(loose, {
      source,
      speaker,
      text,
      kojnozoutState,
      streamState,
      miaEconomySnapshot,
      runtimeState
    });

    logDecision("voice_default_command", fallbackDecision);
    return fallbackDecision;
  }

  function logDecision(stage, decision) {
    if (!appendJsonLog) return;

    appendJsonLog("mia-events", {
      ts: getNowTs(),
      stage,
      decision: cloneJson(decision, null)
    });
  }

  return {
    resolveVoiceCommand
  };
}

/* ========================================================================= */
/* TARGET DETECTION */
/* ========================================================================= */

function detectTarget(loose = "") {
  const padded = ` ${loose} `;

  const miaHits = [
    " mia ",
    " mio ",
    " mijo ",
    " mii ",
    " miu "
  ];

  const kojHits = [
    " kojnozrout ",
    " kojnozrout ",
    " kojnozroute ",
    " kojnozroutek ",
    " kojno ",
    " zrout ",
    " zroute ",
    " mazlik ",
    " mazlicku ",
    " mazlicek "
  ];

  if (containsAny(padded, kojHits)) return "kojnozout";
  if (containsAny(padded, miaHits)) return "mia";

  return "system_or_auto";
}

function containsAny(text, list = []) {
  return list.some((item) => text.includes(item));
}

/* ========================================================================= */
/* SYSTEM / WORLD MODE COMMANDS */
/* ========================================================================= */

function resolveSystemCommand(loose = "", ctx = {}) {
  const worldMode = detectWorldMode(loose);
  if (worldMode) {
    return buildAccepted({
      domain: "system",
      target: "system",
      type: "world_mode",
      command: "set_world_mode",
      source: ctx.source,
      speaker: ctx.speaker,
      rawText: ctx.text,
      intent: {
        type: "world_mode",
        worldMode,
        trusted: true
      },
      execution: {
        kind: "world_mode_only",
        obsSceneSwitchAllowed: false,
        sceneMode: worldMode
      },
      response: {
        speaker: "mia",
        style: "assistant_human",
        text: buildWorldModeAck(worldMode)
      }
    });
  }

  if (looksLikeSceneQuestion(loose)) {
    return buildAccepted({
      domain: "system",
      target: "system",
      type: "world_mode_info",
      command: "explain_scene_policy",
      source: ctx.source,
      speaker: ctx.speaker,
      rawText: ctx.text,
      intent: {
        type: "policy_info",
        topic: "scene_policy"
      },
      execution: {
        kind: "none",
        obsSceneSwitchAllowed: false
      },
      response: {
        speaker: "mia",
        style: "assistant_human",
        text:
          "Scény se samy nepřepínají. Voice vrstva řídí režim světa a případný technický scene switch je oddělený trusted krok."
      }
    });
  }

  return null;
}

function detectWorldMode(loose = "") {
  if (
    containsAny(` ${loose} `, [
      " nejsem tu ",
      " nejsme tu ",
      " virtualni svet ",
      " virtuální svět ",
      " world mode nejsem tu "
    ])
  ) {
    return "nejsem_tu";
  }

  if (containsAny(` ${loose} `, [" battle mode ", " duel mode ", " bojovy rezim ", " combat mode "])) {
    return "battle";
  }

  if (containsAny(` ${loose} `, [" share mode ", " sdileni mode ", " režim share ", " rezim share "])) {
    return "share";
  }

  if (containsAny(` ${loose} `, [" main mode ", " hlavni rezim ", " hlavni scena ", " normal mode "])) {
    return "main";
  }

  if (containsAny(` ${loose} `, [" care mode ", " pece mode ", " režim péče ", " rezim pece "])) {
    return "care";
  }

  if (containsAny(` ${loose} `, [" idle mode ", " klidovy rezim ", " klid mode "])) {
    return "idle";
  }

  return "";
}

function looksLikeSceneQuestion(loose = "") {
  return containsAny(` ${loose} `, [
    " jaka scena ",
    " jaky scene ",
    " prepni scenu ",
    " prepnout scenu ",
    " switch scene ",
    " obs scena "
  ]);
}

function buildWorldModeAck(worldMode) {
  switch (worldMode) {
    case "nejsem_tu":
      return "Přepínám systém do režimu Nejsem tu. Beru to jako world mode, ne jako automatický OBS scene switch.";
    case "battle":
      return "Nastavuji battle režim jako world mode pro streamovou logiku.";
    case "share":
      return "Nastavuji share režim pro community vrstvu.";
    case "care":
      return "Nastavuji care režim pro práci s péčí o Kojnožrouta.";
    case "idle":
      return "Nastavuji klidový režim světa.";
    case "main":
    default:
      return "Nastavuji hlavní režim světa.";
  }
}

/* ========================================================================= */
/* KOJNOZROUT COMMANDS */
/* ========================================================================= */

function resolveKojnozoutCommand(loose = "", ctx = {}) {
  const petCommand = detectPetCommand(loose);

  if (petCommand) {
    return buildAccepted({
      domain: "kojnozout",
      target: "kojnozout",
      type: "pet_command",
      command: petCommand,
      source: ctx.source,
      speaker: ctx.speaker,
      rawText: ctx.text,
      intent: {
        type: "kojnozout_pet_command",
        command: petCommand
      },
      execution: {
        kind: "entity_behavior",
        entity: "kojnozout",
        behavior: mapPetCommandToBehavior(petCommand),
        obsSceneSwitchAllowed: false
      },
      response: {
        speaker: "kojnozout",
        style: "pet_entity",
        text: buildKojnozoutPetReply(petCommand)
      }
    });
  }

  const infoCommand = detectKojInfoCommand(loose);
  if (infoCommand) {
    const info = buildKojnozoutInfo(infoCommand, {
      kojnozoutState: ctx.kojnozoutState,
      streamState: ctx.streamState,
      miaEconomySnapshot: ctx.miaEconomySnapshot
    });

    return buildAccepted({
      domain: "kojnozout",
      target: "kojnozout",
      type: "status_command",
      command: infoCommand,
      source: ctx.source,
      speaker: ctx.speaker,
      rawText: ctx.text,
      intent: {
        type: "kojnozout_status_request",
        command: infoCommand
      },
      execution: {
        kind: "status_read",
        entity: "kojnozout",
        obsSceneSwitchAllowed: false
      },
      response: {
        speaker: info.preferredSpeaker,
        style: info.preferredSpeaker === "mia" ? "assistant_human" : "pet_entity",
        text: info.text
      },
      data: info.data
    });
  }

  return buildAccepted({
    domain: "kojnozout",
    target: "kojnozout",
    type: "pet_command",
    command: "attention",
    source: ctx.source,
    speaker: ctx.speaker,
    rawText: ctx.text,
    intent: {
      type: "kojnozout_attention"
    },
    execution: {
      kind: "entity_behavior",
      entity: "kojnozout",
      behavior: "attention",
      obsSceneSwitchAllowed: false
    },
    response: {
      speaker: "kojnozout",
      style: "pet_entity",
      text: "Koukám. Když chceš povel, řekni mi třeba sedni, lehni, spi, stav nebo miska."
    }
  });
}

function detectPetCommand(loose = "") {
  const padded = ` ${loose} `;

  if (containsAny(padded, [" sedni ", " sednout "])) return "sit";
  if (containsAny(padded, [" lehni ", " lehni si ", " lehnout "])) return "lie_down";
  if (containsAny(padded, [" bud hodnej ", " buď hodný ", " hodnej ", " hodny "])) return "be_good";
  if (containsAny(padded, [" spi ", " spinkej ", " bez spat ", " běž spát "])) return "sleep";
  if (containsAny(padded, [" probud se ", " vstavej ", " vzhuru ", " vzhůru "])) return "wake_up";
  if (containsAny(padded, [" ke mne ", " ke mně ", " pojd sem ", " pojď sem "])) return "come_here";
  if (containsAny(padded, [" zklidni se ", " klid ", " uklidni se "])) return "calm_down";

  return "";
}

function mapPetCommandToBehavior(command) {
  switch (command) {
    case "sit":
      return "sit";
    case "lie_down":
      return "lie_down";
    case "be_good":
      return "obedient";
    case "sleep":
      return "sleep";
    case "wake_up":
      return "wake_up";
    case "come_here":
      return "come_here";
    case "calm_down":
      return "calm";
    default:
      return "attention";
  }
}

function buildKojnozoutPetReply(command) {
  switch (command) {
    case "sit":
      return "Sedím. Aspoň na chvíli.";
    case "lie_down":
      return "Ležím a hlídám misku očkem.";
    case "be_good":
      return "Budu hodnej. Jen když mě nikdo nebude dráždit.";
    case "sleep":
      return "Jdu spát. Když se miska pohne, jedno oko otevřu.";
    case "wake_up":
      return "Jsem vzhůru. Co se děje kolem misky?";
    case "come_here":
      return "Jsem tady. Čumák první.";
    case "calm_down":
      return "Dobře. Stahuju energii a jen pozoruju.";
    default:
      return "Koukám a čekám na další povel.";
  }
}

function detectKojInfoCommand(loose = "") {
  const padded = ` ${loose} `;

  if (containsAny(padded, [" stav ", " status ", " jak ses na tom ", " jak jsi na tom "])) {
    return "status";
  }

  if (containsAny(padded, [" miska ", " bowl ", " kolik je v misce "])) {
    return "bowl";
  }

  if (containsAny(padded, [
    " body ",
    " mia body ",
    " kolik mame bodu ",
    " kolik mam bodu ",
    " kolik máme bodů ",
    " kolik mám bodů "
  ])) {
    return "points";
  }

  if (containsAny(padded, [" zebricek ", " žebříček ", " ranking ", " poradi ", " pořadí "])) {
    return "ranking";
  }

  if (containsAny(padded, [" turnaj ", " duel ", " battle stav ", " stav turnaje "])) {
    return "tournament";
  }

  return "";
}

function buildKojnozoutInfo(command, ctx = {}) {
  const koj = ctx.kojnozoutState || {};
  const stream = ctx.streamState || {};
  const econ = ctx.miaEconomySnapshot || null;

  const bowlPercent = clamp(toNumber(koj.bowlPercent, 0), 0, 100);
  const mood = pickFirst(koj.mood, "idle");
  const stage = pickFirst(koj.stage, "idle");
  const hunger = clamp(toNumber(koj.hunger, 0), 0, 100);
  const energy = clamp(toNumber(koj.energy, 0), 0, 100);
  const totalFeedEvents = toNumber(koj.totalFeedEvents, 0);
  const totalMiaPoints = toNumber(
    koj.totalMiaPoints,
    toNumber(stream?.support?.totalMiaPoints, toNumber(econ?.totalPoints, 0))
  );

  const totalGiftEvents = toNumber(stream?.support?.totalGiftEvents, 0);
  const totalMessages = toNumber(stream?.chat?.totalMessages, 0);
  const supportEvents = toNumber(stream?.counters?.supportEvents, 0);
  const communityEvents = toNumber(stream?.counters?.communityEvents, 0);

  switch (command) {
    case "bowl":
      return {
        preferredSpeaker: "kojnozout",
        text: `Miska je na ${round1(bowlPercent)} procentech. Nálada ${mood}, fáze ${stage}.`,
        data: {
          bowlPercent,
          mood,
          stage
        }
      };

    case "points":
      return {
        preferredSpeaker: "mia",
        text: buildPointsSummary({
          econ,
          totalMiaPoints,
          totalGiftEvents,
          totalMessages
        }),
        data: {
          miaEconomySnapshot: cloneJson(econ, null),
          totalMiaPoints,
          totalGiftEvents,
          totalMessages
        }
      };

    case "ranking":
      return {
        preferredSpeaker: "mia",
        text:
          "Žebříčkový vstup mám připravený jako command typ, ale potřebuje samostatný ranking source-of-truth. Aktuálně umím spolehlivě říct stav misky, support a aktivitu komunity.",
        data: {
          rankingReady: false,
          availableMetrics: {
            bowlPercent,
            totalMiaPoints,
            supportEvents,
            communityEvents,
            totalMessages
          }
        }
      };

    case "tournament":
      return {
        preferredSpeaker: "mia",
        text:
          "Turnajový dotaz je povolený pro voice vrstvu. Potřebuje ale samostatný tournament state. Z aktuálního runtime mám support eventy " +
          `${supportEvents} a community eventy ${communityEvents}.`,
        data: {
          tournamentReady: false,
          supportEvents,
          communityEvents
        }
      };

    case "status":
    default:
      return {
        preferredSpeaker: "mia",
        text:
          `Kojnožrout je teď ve stavu ${stage}, nálada ${mood}, miska ${round1(bowlPercent)} procent, hlad ${round1(hunger)}, energie ${round1(energy)}. ` +
          `Celkem nakrmení ${totalFeedEvents}` +
          (totalMiaPoints > 0 ? ` a MIA body ${round1(totalMiaPoints)}.` : "."),
        data: {
          bowlPercent,
          mood,
          stage,
          hunger,
          energy,
          totalFeedEvents,
          totalMiaPoints
        }
      };
  }
}

function buildPointsSummary({ econ, totalMiaPoints, totalGiftEvents, totalMessages }) {
  if (econ && typeof econ === "object") {
    const totalPoints = toNumber(econ.totalPoints, 0);
    const unspentPoints = toNumber(econ.unspentPoints, 0);
    const thanksCount = toNumber(econ.thanksCount, 0);
    const itemCount = toNumber(econ.itemCount, 0);
    const videoCount = toNumber(econ.videoCount, 0);
    const songCount = toNumber(econ.songCount, 0);

    return (
      `MIA body: celkem ${round1(totalPoints)}, nevyčerpané ${round1(unspentPoints)}. ` +
      `Odemčeno poděkování ${thanksCount}, itemy ${itemCount}, videa ${videoCount}, songy ${songCount}.`
    );
  }

  return (
    `Aktuálně mám ${round1(totalMiaPoints)} MIA bodů, ${totalGiftEvents} gift eventů a ${totalMessages} chat zpráv. ` +
    "Plný per-user bodový snapshot v tomhle dotazu zatím chybí."
  );
}

/* ========================================================================= */
/* MIA COMMANDS */
/* ========================================================================= */

function resolveMiaCommand(loose = "", ctx = {}) {
  if (looksLikeSummaryRequest(loose)) {
    return buildAccepted({
      domain: "mia",
      target: "mia",
      type: "assistant_command",
      command: "summary",
      source: ctx.source,
      speaker: ctx.speaker,
      rawText: ctx.text,
      intent: {
        type: "mia_assistant_summary"
      },
      execution: {
        kind: "assistant_summary",
        obsSceneSwitchAllowed: false
      },
      response: {
        speaker: "mia",
        style: "assistant_human",
        text: buildMiaRuntimeSummary(ctx)
      }
    });
  }

  if (looksLikeExplainCommand(loose)) {
    return buildAccepted({
      domain: "mia",
      target: "mia",
      type: "assistant_command",
      command: "explain",
      source: ctx.source,
      speaker: ctx.speaker,
      rawText: ctx.text,
      intent: {
        type: "mia_assistant_explain"
      },
      execution: {
        kind: "assistant_explain",
        obsSceneSwitchAllowed: false
      },
      response: {
        speaker: "mia",
        style: "assistant_human",
        text:
          "Beru to jako dotaz na vysvětlení systému. MIA mluví jako lidský asistent, Kojnožrout jako mazlíček a game entita. World mode je oddělený od technického OBS přepnutí."
      }
    });
  }

  if (detectWorldMode(loose)) {
    const worldMode = detectWorldMode(loose);

    return buildAccepted({
      domain: "mia",
      target: "mia",
      type: "assistant_command",
      command: "set_world_mode",
      source: ctx.source,
      speaker: ctx.speaker,
      rawText: ctx.text,
      intent: {
        type: "world_mode",
        worldMode,
        requestedBy: "mia_addressed_voice"
      },
      execution: {
        kind: "world_mode_only",
        sceneMode: worldMode,
        obsSceneSwitchAllowed: false
      },
      response: {
        speaker: "mia",
        style: "assistant_human",
        text: buildWorldModeAck(worldMode)
      }
    });
  }

  return buildAccepted({
    domain: "mia",
    target: "mia",
    type: "assistant_command",
    command: "conversation",
    source: ctx.source,
    speaker: ctx.speaker,
    rawText: ctx.text,
    intent: {
      type: "mia_conversation"
    },
    execution: {
      kind: "conversation_only",
      obsSceneSwitchAllowed: false
    },
    response: {
      speaker: "mia",
      style: "assistant_human",
      text: "Rozumím. Beru to jako přímý dotaz na MIA a budu odpovídat lidsky a věcně."
    }
  });
}

function looksLikeSummaryRequest(loose = "") {
  return containsAny(` ${loose} `, [
    " shrn ",
    " summary ",
    " co se deje ",
    " co se děje ",
    " stav systemu ",
    " stav sveta ",
    " stav světa "
  ]);
}

function looksLikeExplainCommand(loose = "") {
  return containsAny(` ${loose} `, [
    " vysvetli ",
    " vysvětli ",
    " explain ",
    " jak to funguje ",
    " co to znamena ",
    " co to znamená "
  ]);
}

function buildMiaRuntimeSummary(ctx = {}) {
  const koj = ctx.kojnozoutState || {};
  const stream = ctx.streamState || {};
  const runtime = ctx.runtimeState || {};

  const bowlPercent = clamp(toNumber(koj.bowlPercent, 0), 0, 100);
  const mood = pickFirst(koj.mood, "idle");
  const worldMode = pickFirst(runtime.worldMode, runtime.sceneMode, "main");
  const totalMiaPoints = toNumber(
    stream?.support?.totalMiaPoints,
    toNumber(koj.totalMiaPoints, 0)
  );
  const totalGiftEvents = toNumber(stream?.support?.totalGiftEvents, 0);
  const totalMessages = toNumber(stream?.chat?.totalMessages, 0);

  return (
    `Shrnutí: world mode ${worldMode}, Kojnožrout nálada ${mood}, miska ${round1(bowlPercent)} procent, ` +
    `MIA body ${round1(totalMiaPoints)}, gift eventy ${totalGiftEvents}, chat zprávy ${totalMessages}.`
  );
}

/* ========================================================================= */
/* AUTO / DEFAULT */
/* ========================================================================= */

function resolveDefaultCommand(loose = "", ctx = {}) {
  if (detectPetCommand(loose) || detectKojInfoCommand(loose)) {
    return resolveKojnozoutCommand(loose, ctx);
  }

  if (detectWorldMode(loose) || looksLikeSummaryRequest(loose) || looksLikeExplainCommand(loose)) {
    return resolveMiaCommand(loose, ctx);
  }

  return buildAccepted({
    domain: "mia",
    target: "mia",
    type: "assistant_command",
    command: "conversation",
    source: ctx.source,
    speaker: ctx.speaker,
    rawText: ctx.text,
    intent: {
      type: "mia_conversation_fallback"
    },
    execution: {
      kind: "conversation_only",
      obsSceneSwitchAllowed: false
    },
    response: {
      speaker: "mia",
      style: "assistant_human",
      text: "Beru to jako dotaz na MIA. Když chceš Kojnožrouta, oslov ho přímo nebo použij mazlíčkový povel."
    }
  });
}

/* ========================================================================= */
/* RESULT HELPERS */
/* ========================================================================= */

function buildAccepted(data = {}) {
  return {
    ok: true,
    accepted: true,
    rejected: false,
    ts: nowTs(),
    ...data
  };
}

function buildRejected(reason, data = {}) {
  return {
    ok: false,
    accepted: false,
    rejected: true,
    ts: nowTs(),
    reason,
    ...data
  };
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

module.exports = {
  createVoiceControlLayer
};