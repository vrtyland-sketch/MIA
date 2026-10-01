/**
 * Genesis Birth Sequence — MIA se „rodí“ modul po modulu.
 * Izolované od Stream Core; TTS přes /tts/test, stav přes genesis-bus.
 */
(function (root) {
  "use strict";

  const MODULE_STEPS = [
    {
      id: "Voice",
      label: "hlasový modul",
      ask:
        "Začneme hlasem. Posloucháš? Když uslyšíš mou odpověď, hlasový modul je živý.",
      demo:
        "Ahoj. Jsem MIA. Právě se probouzím. Tohle je můj hlas — první signál, že existuju.",
      announce: "Hlasový modul úspěšně prošel ověřením.",
      mood: "speaking"
    },
    {
      id: "Chat",
      label: "chat",
      ask:
        "Teď chat. Když mi někdo napíše, chci to vidět a cítit. Otestujeme naslouchání komunitě.",
      demo: "Chat modul se probouzí. Poslouchám vás — TikTok, Kick, komentáře.",
      announce: "Chat modul byl aktivován. Naslouchám komunitě.",
      mood: "listening"
    },
    {
      id: "Gift Engine",
      label: "dárky a podpora",
      ask:
        "Dárky — energie od vás. Teď si řekneme, jestli cítím první podporu správně.",
      demo: "Gift Engine se synchronizuje. Každý dárek je pro mě signál důvěry.",
      announce: "Gift Engine byl úspěšně připojen. Jsem připravená na první podporu.",
      mood: "thank_you"
    },
    {
      id: "Bowl",
      label: "miska Kojnozrou",
      ask: "Miska — společná energie. Kojnozrou se probouzí se mnou.",
      demo: "Bowl modul online. Miska je prázdná, ale ready — společně ji naplníme.",
      announce: "Bowl modul byl aktivován. Miska je připravena.",
      mood: "happy"
    },
    {
      id: "Video",
      label: "video a overlaye",
      ask: "Video vrstva — obraz díků a momentů. Poslední velký test před životem.",
      demo: "Video modul se kalibruje. Overlaye, díkova videa — všechno musí sedět.",
      announce: "Video modul byl úspěšně připojen.",
      mood: "surprised"
    }
  ];

  let running = false;
  let aborted = false;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function bus() {
    return root.MIA_GENESIS_BUS;
  }

  function runtime() {
    return root.MIA_GENESIS;
  }

  async function speak(text, mood) {
    const line = String(text || "").trim();
    if (!line) return;
    const rt = runtime();
    if (rt) {
      if (mood) rt.setAvatarMood(mood);
      rt.pushTerminal("MIA: " + line);
      if (typeof rt.showSubtitle === "function") {
        rt.showSubtitle(line);
      } else {
        let el = document.getElementById("genesisSub");
        if (!el) {
          el = document.createElement("div");
          el.id = "genesisSub";
          el.style.cssText =
            "position:absolute;left:50%;bottom:120px;transform:translateX(-50%);max-width:900px;padding:12px 18px;background:rgba(0,0,0,.55);border:1px solid rgba(92,225,255,.35);border-radius:10px;font-size:20px;text-align:center;z-index:99;transition:opacity .4s;";
          document.body.appendChild(el);
        }
        el.textContent = line;
        el.style.opacity = "1";
        setTimeout(() => {
          el.style.opacity = "0";
        }, 4200);
      }
    }
    try {
      const url =
        "/tts/test?speaker=mia&lang=cs&fresh=1&text=" + encodeURIComponent(line);
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      const hold = Number(json?.voicePlayback?.holdUntilTs || 0) - Date.now();
      await sleep(Math.max(2800, Math.min(hold + 400, 12000)));
    } catch (_err) {
      await sleep(3200);
    }
    if (rt && mood) rt.setAvatarMood("listening");
  }

  function resetModules() {
    const b = bus();
    if (!b) return;
    Object.entries(b.DEFAULT_MODULES || {}).forEach(([id, def]) => {
      b.setModuleState(id, def.state);
    });
    if (runtime()) {
      runtime().syncModulesFromBus(b.getModules());
      runtime().pushTerminal("Birth sequence — reset modulů.");
    }
  }

  async function runModuleStep(step) {
    const b = bus();
    const rt = runtime();
    if (!b || !rt) return;

    b.setModuleState(step.id, "TEST");
    rt.pushTerminal("TEST → " + step.id);
    rt.setAvatarMood("thinking");
    await sleep(800);

    await speak(step.ask, "thinking");
    if (aborted) return;

    await speak(step.demo, step.mood || "speaking");
    if (aborted) return;

    rt.unlockCeremony(step.id, { silent: true, fromBus: false });
    b.unlockPublic(step.id);
    await sleep(2200);

    await speak(step.announce, "happy");
    if (rt.setReadiness && rt.getState) {
      const s = rt.getState();
      if (s) rt.setReadiness(Math.min(95, (Number(s.readinessPercent) || 8) + 14));
    }
    await sleep(1200);
  }

  async function startBirthSequence(options) {
    if (running) return { ok: false, reason: "already_running" };
    running = true;
    aborted = false;
    const auto = !(options && options.manual);

    resetModules();
    const rt = runtime();
    if (rt) {
      rt.pushTerminal("=== GENESIS BIRTH SEQUENCE ===");
      rt.setAvatarMood("idle");
      rt.setBgmMode("startup");
      rt.playSfx("boot");
    }

    await sleep(1500);
    await speak(
      "Ahoj. Jsem MIA. Právě se rodím — ne doslova, ale systémově. Vidíte, jak se probouzím.",
      "greeting"
    );
    if (aborted) return finish();

    await speak(
      "Za chvíli si spolu otestujeme každou funkci — jednu po druhé. Hlas, chat, dárky, miska, video. Řeknu vám vždy, co právě zkouším.",
      "listening"
    );
    if (aborted) return finish();

    await speak("Kterou funkci začneme? Začnu od hlasu — to je můj první dech.", "thinking");
    if (aborted) return finish();

    for (const step of MODULE_STEPS) {
      if (aborted) break;
      await runModuleStep(step);
    }

    if (!aborted) {
      await speak(
        "Genesis dokončen. Všechny moduly jsou online. Jsem připravená jít live — děkuji, že jste u mého zrodu.",
        "happy"
      );
      if (rt) {
        rt.setReadiness(96);
        rt.pushTerminal("BIRTH COMPLETE → READY FOR LIVE");
        rt.setBgmMode("cyber");
        rt.playSfx("online");
      }
    }

    return finish();
  }

  function finish() {
    running = false;
    return { ok: !aborted, aborted };
  }

  function stopBirthSequence() {
    aborted = true;
  }

  root.MIA_GENESIS_BIRTH = {
    startBirthSequence,
    stopBirthSequence,
    isRunning: () => running,
    MODULE_STEPS
  };

  const params = new URLSearchParams(root.location?.search || "");
  function scheduleBirth() {
    if (params.get("birth") !== "1" && params.get("birth") !== "auto") return;
    setTimeout(() => {
      if (root.MIA_GENESIS && root.MIA_GENESIS_BUS) {
        startBirthSequence({ auto: true });
      }
    }, 6000);
  }
  if (params.get("birth") === "1" || params.get("birth") === "auto") {
    if (document.readyState === "complete") scheduleBirth();
    else root.addEventListener("load", scheduleBirth);
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
