/**
 * Genesis voice picker — loads text-bank/packs/genesis via static copy or fetch.
 * Isolated from MIA_TEXT_BANK gift packs / speaker routing.
 */
(function (root) {
  "use strict";

  const recent = [];
  let lines = [];
  let loaded = false;

  const FALLBACK_CS = [
    "Genesis Sequence aktivní.",
    "Vítejte v Genesis Mode.",
    "Právě sledujete moje první veřejné probuzení.",
    "Inicializuji hlasový modul.",
    "Probíhá kontrola systémů.",
    "Děkuji, že jste přišli.",
    "Jste součástí mého vývoje.",
    "Výsledky vypadají stabilně.",
    "Genesis Mode běží.",
    "Děkuji za trpělivost."
  ];

  async function load(lang) {
    const code = lang || "cs";
    try {
      const res = await fetch("/assets/genesis/voice/" + code + ".json?t=" + Date.now());
      if (!res.ok) throw new Error("missing");
      const pack = await res.json();
      lines = Array.isArray(pack.lines) ? pack.lines : [];
      loaded = true;
    } catch (_) {
      lines = FALLBACK_CS.map((text, i) => ({
        id: "fallback." + i,
        category: "system",
        text,
        cooldownSec: 600
      }));
      loaded = true;
    }
  }

  function pick(lang, preferredCategory) {
    if (!loaded) return FALLBACK_CS[0];
    const now = Date.now();
    let pool = lines.filter((l) => !lang || l.lang === lang || !l.lang);
    if (preferredCategory) {
      const c = pool.filter((l) => l.category === preferredCategory);
      if (c.length) pool = c;
    }
    pool = pool.filter((l) => !recent.includes(l.id));
    if (!pool.length) pool = lines.slice();
    const row = pool[Math.floor(Math.random() * pool.length)];
    if (row && row.id) {
      recent.push(row.id);
      if (recent.length > 40) recent.shift();
    }
    return (row && row.text) || FALLBACK_CS[0];
  }

  root.MIA_GENESIS_VOICE = { load, pick, ready: () => loaded };

  load("cs");
})(typeof globalThis !== "undefined" ? globalThis : window);
