"use strict";

/**
 * Diskrétní památka — motiv Radio Kiss platí POUZE pro YouTube (Kisstube).
 * TikTok / Kick / Twitch = běžná MIA + Koj, bez Kiss identity.
 *
 * Na YouTube lane:
 * - MIA zastupuje Barboru Tlučhořovou
 * - Kojnozrout (Kisstube) zastupuje Patrika Hezuckého
 */

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePlatform(value = "") {
  const p = safeString(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  if (
    p === "yt" ||
    p === "youtube" ||
    p === "youtube.com" ||
    p === "kisstube" ||
    p === "kissradio"
  ) {
    return "youtube";
  }
  return p;
}

const TRIBUTE = {
  id: "kiss_radio_memorial",
  access: "discrete",
  scope: "youtube_only",
  stationLead: "Radio Kiss",
  purpose:
    "Pocta památce kolegů. Radio Kiss je hlavní motiv výhradně pro YouTube / Kisstube.",
  roles: {
    mia: {
      name: "Barbora Tlučhořová",
      station: "Radio Kiss",
      embodiedBy: "mia",
      note: "Na YouTube lane MIA nese stopu Barbory Tlučhořové."
    },
    kojnozrout: {
      name: "Patrik Hezucký",
      station: "Radio Kiss",
      embodiedBy: "kojnozrout",
      mascot: "Kisstube",
      note: "Na YouTube lane Kisstube/Koj zastupuje Patrika Hezuckého."
    }
  },
  radioLines: {
    mia: [
      "Dobré ráno, ať vám to dneska hraje.",
      "Držíme vás v éteru — jemně, ale jistě.",
      "Díky, že jste naladění.",
      "Hudba nahoru, nálada taky.",
      "Tohle je pro vás.",
      "Ať vám to dneska sedí."
    ],
    kojnozrout: [
      "Pusinka do éteru a jedeme dál.",
      "Parták hlídá signál.",
      "Kisstube drží stopu — tiše, ale věrně.",
      "Rádio není jen zvuk. Je to parta.",
      "Posíláme vlnu a pusu."
    ]
  }
};

/** Explicitní YouTube / Kisstube kontext ve zprávě (i když platforma není v eventu). */
const YOUTUBE_LANE_RE =
  /(kisstube|kiss\s*tube|kiss\s*radio|kissradio|youtube|youtu\.be)/i;

function isYoutubeLane(platform = "", message = "") {
  if (normalizePlatform(platform) === "youtube") return true;
  return YOUTUBE_LANE_RE.test(safeString(message));
}

/**
 * Radio Kiss motiv se připojuje JEN na YouTube lane.
 * Na TikTok/Kick/Twitch se nepřipojuje — ani při zmínce jmen.
 */
function shouldAttachMemorial(message = "", platform = "") {
  return isYoutubeLane(platform, message);
}

function pickLine(list = [], seed = Date.now()) {
  if (!list.length) return "";
  return list[Math.abs(Number(seed)) % list.length];
}

function pickRadioLine(speaker = "mia", seed = Date.now()) {
  const key =
    safeString(speaker, "mia").toLowerCase() === "kojnozout" ||
    safeString(speaker).toLowerCase() === "kojnozrout"
      ? "kojnozrout"
      : "mia";
  return pickLine(TRIBUTE.radioLines[key] || TRIBUTE.radioLines.mia, seed);
}

function buildMemorialPromptHint(message = "", platform = "", speaker = "mia") {
  if (!shouldAttachMemorial(message, platform)) return "";

  const text = safeString(message).toLowerCase();
  const mentionsBara = /barbor|bárbor|\bbara\b|\bbára\b|bary|barry|tlu[cč]ho/i.test(
    text
  );
  const mentionsPatrik = /patrik|patriksan|hezuck/i.test(text);

  const lines = [
    "Diskrétní kontext POUZE pro YouTube / Kisstube (ne pro TikTok, Kick, Twitch): hlavní motiv je Radio Kiss.",
    "Na této lane MIA zastupuje památku Barbory Tlučhořové.",
    "Na této lane Kojnozrout (Kisstube) zastupuje památku Patrika Hezuckého.",
    "Když na ně někdo jemně narazí, odpověz vřele, krátce, s úctou. Bez patosu, bez vtipů o smrti, bez spam „RIP“.",
    "Lehká radio nálada (éter, dobré ráno) jen tady — ne jako globální identita celého streamu.",
    `Příklad tónu: „${pickRadioLine(speaker)}“`
  ];

  if (mentionsBara) {
    lines.push(
      "Divák zmínil Barboru — uznej památku jednou větou v roli MIA a vrať se ke streamu."
    );
  }
  if (mentionsPatrik) {
    lines.push(
      "Divák zmínil Patrika — Kisstube nese jeho stopu; jedna věta, bez patosu."
    );
  }

  return lines.join(" ");
}

function getMemorialSnapshot() {
  return {
    id: TRIBUTE.id,
    access: TRIBUTE.access,
    scope: "youtube_only",
    stationLead: TRIBUTE.stationLead,
    roles: {
      mia: {
        name: TRIBUTE.roles.mia.name,
        station: TRIBUTE.roles.mia.station,
        embodiedBy: "mia"
      },
      kojnozrout: {
        name: TRIBUTE.roles.kojnozrout.name,
        station: TRIBUTE.roles.kojnozrout.station,
        embodiedBy: "kojnozrout",
        mascot: "Kisstube"
      }
    },
    graphicNote:
      "Radio Kiss motiv a grafika jen pro YouTube/Kisstube. Ostatní platformy = běžný Koj.",
    sampleLineMia: pickRadioLine("mia"),
    sampleLineKoj: pickRadioLine("kojnozrout")
  };
}

module.exports = {
  TRIBUTE,
  isYoutubeLane,
  shouldAttachMemorial,
  pickRadioLine,
  buildMemorialPromptHint,
  getMemorialSnapshot
};
