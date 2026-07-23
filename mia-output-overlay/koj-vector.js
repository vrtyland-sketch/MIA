/* MIA — Živý vektorový Kojnožrout.
 * Vykresluje postavu jako SVG a plynule animuje (requestAnimationFrame):
 * dýchání, mrkání, náklon, bounce, otevírání pusy při mluvení a SPOJITÝ
 * přechod mezi náladami (tween barev + výrazu). Žádné přepínání PNG = bez sekání.
 *
 * Paleta a anatomie zrcadlí scripts/kojnozrout_sprite_renderer.js, aby vektor
 * vypadal jako stejná postava. PNG zůstává jako fallback (vector-mode off).
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // Paleta nálad (zrcadlí MOOD_SPECS). barvy: body/dark/highlight/cheeks.
  var MOODS = {
    idle:    { body:[98,196,118],  dark:[52,130,72],  hi:[168,238,178], cheeks:null,        eyes:"open",    mouth:"smile",     tilt:0,   scaleY:1.00, energy:0.25 },
    warm:    { body:[108,206,128], dark:[58,140,78],  hi:[178,248,188], cheeks:[255,170,170], eyes:"gentle",  mouth:"softSmile", tilt:0,   scaleY:1.00, energy:0.22 },
    happy:   { body:[118,216,138], dark:[62,150,82],  hi:[190,255,200], cheeks:[255,140,160], eyes:"sparkle", mouth:"grin",      tilt:-4,  scaleY:1.04, energy:0.55 },
    hungry:  { body:[230,170,90],  dark:[170,110,40], hi:[255,210,130], cheeks:null,        eyes:"wide",    mouth:"open",      tilt:6,   scaleY:0.96, energy:0.4 },
    excited: { body:[130,210,255], dark:[70,140,210], hi:[200,240,255], cheeks:[255,180,210], eyes:"star",    mouth:"grin",      tilt:-8,  scaleY:1.08, energy:0.85 },
    eating:  { body:[120,200,130], dark:[60,140,75],  hi:[180,240,190], cheeks:[255,190,150], eyes:"happy",   mouth:"chew",      tilt:4,   scaleY:1.00, energy:0.5 },
    full:    { body:[100,190,150], dark:[55,125,90],  hi:[160,230,190], cheeks:[255,160,140], eyes:"content", mouth:"fullSmile", tilt:0,   scaleY:1.12, energy:0.2 },
    sleepy:  { body:[140,170,220], dark:[90,110,170], hi:[190,210,245], cheeks:[180,190,230], eyes:"closed",  mouth:"o",         tilt:8,   scaleY:0.94, energy:0.08 },
    sick:    { body:[170,220,130], dark:[100,150,70], hi:[210,245,170], cheeks:[190,230,160], eyes:"dizzy",   mouth:"wavy",      tilt:5,   scaleY:0.98, energy:0.15 },
    sad:     { body:[120,160,210], dark:[70,100,160], hi:[170,200,240], cheeks:null,        eyes:"sad",     mouth:"frown",     tilt:10,  scaleY:0.92, energy:0.12 },
    annoyed: { body:[240,140,120], dark:[180,80,70],  hi:[255,190,170], cheeks:[255,100,90],  eyes:"angry",   mouth:"flat",      tilt:-3,  scaleY:1.02, energy:0.45 },
    laugh:   { body:[255,210,100], dark:[220,150,50], hi:[255,240,170], cheeks:[255,150,170], eyes:"happy",   mouth:"grin",      tilt:-6,  scaleY:1.06, energy:0.8 },
    stressed:{ body:[255,160,130], dark:[200,90,70],  hi:[255,210,180], cheeks:[255,120,100], eyes:"wide",    mouth:"wavy",      tilt:4,   scaleY:0.97, energy:0.5 },
    watch:   { body:[108,198,128], dark:[56,132,76],  hi:[178,248,188], cheeks:[255,200,180], eyes:"wide",    mouth:"o",         tilt:-3,  scaleY:1.00, energy:0.45 },
    groove:  { body:[118,208,148], dark:[62,142,82],  hi:[188,255,200], cheeks:[255,170,190], eyes:"happy",   mouth:"grin",      tilt:-10, scaleY:1.05, energy:0.75 },
    dance:   { body:[130,210,255], dark:[72,145,215], hi:[200,240,255], cheeks:[255,180,210], eyes:"star",    mouth:"grin",      tilt:-14, scaleY:1.10, energy:0.95 },
    party:   { body:[255,205,95],  dark:[225,145,45], hi:[255,240,170], cheeks:[255,140,170], eyes:"star",    mouth:"grin",      tilt:-8,  scaleY:1.12, energy:0.9 },
    curious: { body:[115,205,175], dark:[60,140,110], hi:[185,245,215], cheeks:null,        eyes:"wide",    mouth:"o",         tilt:14,  scaleY:1.00, energy:0.4 },
    love:    { body:[255,150,175], dark:[210,90,120], hi:[255,210,225], cheeks:[255,120,150], eyes:"gentle",  mouth:"softSmile", tilt:-4,  scaleY:1.04, energy:0.45 }
  };

  // Mapování libovolného sprite/mood klíče ze serveru na základní náladu.
  function resolveMoodKey(raw) {
    var k = String(raw || "").toLowerCase().trim();
    if (!k) return "idle";
    if (MOODS[k]) return k;
    if (/^eating(-\d+)?$|^feeding$|^munch$|^snack$|^sip$/.test(k)) return "eating";
    if (/sleep|rest|curl|yawn|cozy|calm-deep|calm/.test(k)) return "sleepy";
    if (/sick|heal/.test(k)) return "sick";
    if (/sad|neglect|comfort|shy/.test(k)) return "sad";
    if (/annoy|guard|chaos|alert|stress/.test(k)) return k.indexOf("stress") >= 0 ? "stressed" : "annoyed";
    if (/hype|cheer|combo/.test(k)) return "excited";
    if (/dance/.test(k)) return "dance";
    if (/groove/.test(k)) return "groove";
    if (/party|celebrate|proud/.test(k)) return "party";
    if (/duel/.test(k)) return "excited";
    if (/laugh/.test(k)) return "laugh";
    if (/watch|react-video|flyby|peek|perch|quest/.test(k)) return "watch";
    if (/curious|think/.test(k)) return "curious";
    if (/love|bond|wink|hug/.test(k)) return "love";
    if (/gift|thanks|wave|hop|bounce|surprised|story|play/.test(k)) return "happy";
    if (/hungry/.test(k)) return "hungry";
    if (/full|stretch/.test(k)) return "full";
    if (/warm/.test(k)) return "warm";
    return "idle";
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpRgb(a, b, t) { return [Math.round(lerp(a[0],b[0],t)), Math.round(lerp(a[1],b[1],t)), Math.round(lerp(a[2],b[2],t))]; }
  function rgb(c, a) { return a == null ? "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")" : "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  // Cílové parametry výrazu z nálady (spojitě tweenované).
  function expressionTargets(moodKey) {
    var m = MOODS[moodKey] || MOODS.idle;
    var t = { mouthCurve: 0.6, mouthOpen: 0.0, mouthW: 1.0, eyeOpen: 1.0, eyeHappy: 0.0, browAngle: 0.0, sparkle: 0 };
    switch (m.mouth) {
      case "smile": t.mouthCurve = 0.7; t.mouthOpen = 0.02; break;
      case "softSmile": t.mouthCurve = 0.55; t.mouthOpen = 0.0; break;
      case "fullSmile": t.mouthCurve = 0.8; t.mouthOpen = 0.05; t.mouthW = 1.1; break;
      case "grin": t.mouthCurve = 0.85; t.mouthOpen = 0.5; t.mouthW = 1.15; break;
      case "open": t.mouthCurve = 0.2; t.mouthOpen = 0.8; break;
      case "chew": t.mouthCurve = 0.3; t.mouthOpen = 0.4; break;
      case "o": t.mouthCurve = 0.0; t.mouthOpen = 0.45; t.mouthW = 0.6; break;
      case "frown": t.mouthCurve = -0.7; t.mouthOpen = 0.0; break;
      case "flat": t.mouthCurve = 0.0; t.mouthOpen = 0.0; t.mouthW = 1.0; break;
      case "wavy": t.mouthCurve = -0.1; t.mouthOpen = 0.15; break;
    }
    switch (m.eyes) {
      case "closed": t.eyeOpen = 0.06; break;
      case "content": t.eyeOpen = 0.12; t.eyeHappy = 0.8; break;
      case "gentle": t.eyeOpen = 0.7; t.eyeHappy = 0.5; break;
      case "happy": t.eyeOpen = 0.3; t.eyeHappy = 1.0; break;
      case "sparkle": t.eyeOpen = 1.0; t.sparkle = 1; break;
      case "star": t.eyeOpen = 1.0; t.sparkle = 2; break;
      case "wide": t.eyeOpen = 1.15; break;
      case "sad": t.eyeOpen = 0.85; t.browAngle = -16; break;
      case "angry": t.eyeOpen = 0.9; t.browAngle = 22; break;
      case "dizzy": t.eyeOpen = 0.8; break;
      default: t.eyeOpen = 1.0;
    }
    return t;
  }

  function el(tag, attrs) {
    var shared = globalThis.MIA_SVG_PRIMITIVES;
    if (shared && typeof shared.createSvgElement === "function") {
      var built = shared.createSvgElement(tag, attrs);
      if (built && built.namespaceURI) return built;
    }
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function KojVector(host) {
    this.host = host;
    this.cx = 256; this.cy = 286;
    this.build();
    // Animovaný (vyhlazený) stav.
    this.cur = {
      body: MOODS.idle.body.slice(), dark: MOODS.idle.dark.slice(), hi: MOODS.idle.hi.slice(),
      cheeks: [255,170,170], cheekA: 0,
      tilt: 0, scaleY: 1, energy: 0.25,
      mouthCurve: 0.7, mouthOpen: 0.02, mouthW: 1, eyeOpen: 1, eyeHappy: 0, browAngle: 0, sparkle: 0
    };
    this.target = JSON.parse(JSON.stringify(this.cur));
    this.targetMood = "idle";
    this.speaking = false;
    this.blink = 1;        // 1 = oči otevřené
    this.nextBlinkAt = 0;
    this.t0 = performance.now();
  }

  KojVector.prototype.build = function () {
    var svg = el("svg", { viewBox: "0 0 512 512", width: "100%", height: "100%", preserveAspectRatio: "xMidYMax meet" });
    svg.style.overflow = "visible";
    this.svg = svg;

    var defs = el("defs");
    // měkký vnitřní highlight gradient těla
    var grad = el("radialGradient", { id: "kojBodyGrad", cx: "38%", cy: "32%", r: "78%" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": "#fff", "stop-opacity": "0.0", id: "kojGradHi" }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": "#000", "stop-opacity": "0" }));
    defs.appendChild(grad);
    // glow filter pro mluvení
    var f = el("filter", { id: "kojGlow", x: "-40%", y: "-40%", width: "180%", height: "180%" });
    var blur = el("feGaussianBlur", { stdDeviation: "0", result: "b", id: "kojGlowBlur" });
    var merge = el("feMerge");
    merge.appendChild(el("feMergeNode", { in: "b" }));
    merge.appendChild(el("feMergeNode", { in: "SourceGraphic" }));
    f.appendChild(blur); f.appendChild(merge);
    defs.appendChild(f);
    svg.appendChild(defs);

    // kořenová skupina (náklon + bounce + dýchání)
    var root = el("g", { id: "kojRoot", filter: "url(#kojGlow)" });
    this.root = root;
    svg.appendChild(root);

    // stín pod tělem
    this.shadow = el("ellipse", { cx: this.cx, cy: 420, rx: 96, ry: 22, fill: "rgba(0,0,0,0.28)" });
    root.appendChild(this.shadow);

    // tělo + nožky/ouška
    this.footL = el("ellipse", { cx: this.cx - 52, cy: 404, rx: 34, ry: 20 });
    this.footR = el("ellipse", { cx: this.cx + 52, cy: 404, rx: 34, ry: 20 });
    this.earL = el("ellipse", { cx: this.cx - 86, cy: this.cy - 78, rx: 26, ry: 32 });
    this.earR = el("ellipse", { cx: this.cx + 86, cy: this.cy - 78, rx: 26, ry: 32 });
    root.appendChild(this.footL); root.appendChild(this.footR);
    root.appendChild(this.earL); root.appendChild(this.earR);

    this.body = el("ellipse", { cx: this.cx, cy: this.cy, rx: 118, ry: 132 });
    root.appendChild(this.body);
    this.bodyShade = el("ellipse", { cx: this.cx, cy: this.cy, rx: 118, ry: 132, fill: "url(#kojBodyGrad)" });
    root.appendChild(this.bodyShade);
    this.belly = el("ellipse", { cx: this.cx, cy: this.cy + 30, rx: 70, ry: 78, fill: "rgba(255,255,255,0.0)" });
    root.appendChild(this.belly);
    this.hiSpot = el("ellipse", { cx: this.cx - 40, cy: this.cy - 44, rx: 44, ry: 50, fill: "rgba(255,255,255,0.0)" });
    root.appendChild(this.hiSpot);

    // tváře
    this.cheekL = el("ellipse", { cx: this.cx - 60, cy: this.cy + 30, rx: 22, ry: 14, opacity: 0 });
    this.cheekR = el("ellipse", { cx: this.cx + 60, cy: this.cy + 30, rx: 22, ry: 14, opacity: 0 });
    root.appendChild(this.cheekL); root.appendChild(this.cheekR);

    // obočí
    this.browL = el("line", { "stroke-width": 6, "stroke-linecap": "round", stroke: "rgba(40,40,55,0)" });
    this.browR = el("line", { "stroke-width": 6, "stroke-linecap": "round", stroke: "rgba(40,40,55,0)" });
    root.appendChild(this.browL); root.appendChild(this.browR);

    // oči (skupiny)
    this.eyeL = this.buildEye(this.cx - 44, this.cy - 12);
    this.eyeR = this.buildEye(this.cx + 44, this.cy - 12);
    root.appendChild(this.eyeL.g); root.appendChild(this.eyeR.g);

    // pusa
    this.mouthFill = el("ellipse", { cx: this.cx, cy: this.cy + 56, rx: 0, ry: 0, fill: "rgb(150,55,70)" });
    root.appendChild(this.mouthFill);
    this.mouthLine = el("path", { fill: "none", stroke: "rgb(60,40,45)", "stroke-width": 6, "stroke-linecap": "round" });
    root.appendChild(this.mouthLine);

    // jiskry (excited/star)
    this.sparks = [];
    var spk = [[150,150],[372,140],[120,300],[392,300],[256,96]];
    for (var i = 0; i < spk.length; i++) {
      var s = el("text", { x: spk[i][0], y: spk[i][1], "font-size": 30, "text-anchor": "middle", opacity: 0 });
      s.textContent = i % 2 ? "✨" : "⭐";
      root.appendChild(s); this.sparks.push(s);
    }

    this.host.appendChild(svg);
  };

  KojVector.prototype.buildEye = function (x, y) {
    var g = el("g");
    var white = el("ellipse", { cx: x, cy: y, rx: 26, ry: 30, fill: "#fff" });
    var pupil = el("circle", { cx: x, cy: y + 4, r: 10, fill: "rgb(35,35,50)" });
    var shine = el("circle", { cx: x + 4, cy: y - 3, r: 4, fill: "rgba(255,255,255,0.9)" });
    var lid = el("rect", { x: x - 30, y: y - 34, width: 60, height: 0, rx: 14, fill: "rgb(98,196,118)" });
    var happyArc = el("path", { fill: "none", stroke: "rgb(40,40,55)", "stroke-width": 6, "stroke-linecap": "round", opacity: 0 });
    g.appendChild(white); g.appendChild(pupil); g.appendChild(shine); g.appendChild(happyArc); g.appendChild(lid);
    return { g: g, x: x, y: y, white: white, pupil: pupil, shine: shine, lid: lid, arc: happyArc };
  };

  KojVector.prototype.setMood = function (moodKey, speaking) {
    var k = resolveMoodKey(moodKey);
    this.speaking = !!speaking;
    if (k === this.targetMood) return;
    this.targetMood = k;
    var m = MOODS[k] || MOODS.idle;
    var ex = expressionTargets(k);
    this.target.body = m.body; this.target.dark = m.dark; this.target.hi = m.hi;
    this.target.cheeks = m.cheeks || this.cur.cheeks;
    this.target.cheekA = m.cheeks ? 0.66 : 0;
    this.target.tilt = m.tilt; this.target.scaleY = m.scaleY; this.target.energy = m.energy;
    this.target.mouthCurve = ex.mouthCurve; this.target.mouthOpen = ex.mouthOpen; this.target.mouthW = ex.mouthW;
    this.target.eyeOpen = ex.eyeOpen; this.target.eyeHappy = ex.eyeHappy;
    this.target.browAngle = ex.browAngle; this.target.sparkle = ex.sparkle;
  };

  KojVector.prototype.frame = function (now) {
    var dt = clamp((now - (this._last || now)) / 1000, 0, 0.05);
    this._last = now;
    var t = (now - this.t0) / 1000;
    var c = this.cur, g = this.target;
    var k = 1 - Math.pow(0.001, dt); // ~plynulý tween factor

    c.body = lerpRgb(c.body, g.body, k); c.dark = lerpRgb(c.dark, g.dark, k); c.hi = lerpRgb(c.hi, g.hi, k);
    c.cheeks = lerpRgb(c.cheeks, g.cheeks || c.cheeks, k);
    c.cheekA = lerp(c.cheekA, g.cheekA, k);
    c.tilt = lerp(c.tilt, g.tilt, k); c.scaleY = lerp(c.scaleY, g.scaleY, k); c.energy = lerp(c.energy, g.energy, k);
    c.mouthCurve = lerp(c.mouthCurve, g.mouthCurve, k);
    c.mouthW = lerp(c.mouthW, g.mouthW, k);
    c.eyeOpen = lerp(c.eyeOpen, g.eyeOpen, k);
    c.eyeHappy = lerp(c.eyeHappy, g.eyeHappy, k);
    c.browAngle = lerp(c.browAngle, g.browAngle, k);
    c.sparkle = lerp(c.sparkle, g.sparkle, k);

    // pusa: mluvení přebíjí otevřenost rychlou oscilací
    var mouthOpenTarget = g.mouthOpen;
    if (this.speaking) mouthOpenTarget = 0.25 + 0.55 * Math.abs(Math.sin(t * 11));
    c.mouthOpen = lerp(c.mouthOpen, mouthOpenTarget, this.speaking ? 0.5 : k);

    // mrkání
    if (now > this.nextBlinkAt) {
      this._blinking = 0.0;
      this.nextBlinkAt = now + 2200 + Math.random() * 3600;
    }
    if (this._blinking != null) {
      this._blinking += dt * 9;
      if (this._blinking >= Math.PI) { this._blinking = null; this.blink = 1; }
      else this.blink = 1 - Math.sin(this._blinking) * (g.eyeOpen > 0.2 ? 1 : 0);
    }

    this.draw(t);
    var self = this;
    this._raf = requestAnimationFrame(function (n) { self.frame(n); });
  };

  KojVector.prototype.draw = function (t) {
    var c = this.cur, cx = this.cx, cy = this.cy;
    var en = c.energy;

    // dýchání + bounce + náklon
    var breathe = 1 + Math.sin(t * (1.1 + en)) * (0.012 + en * 0.02);
    var bob = Math.sin(t * (1.4 + en * 3)) * (3 + en * 16);
    var sway = Math.sin(t * (1.0 + en * 2.4)) * en * 10;
    var tilt = c.tilt + Math.sin(t * (0.8 + en * 2)) * en * 6;
    this.root.setAttribute("transform",
      "translate(" + (cx + sway) + "," + (cy + bob) + ") " +
      "rotate(" + tilt.toFixed(2) + ") " +
      "scale(" + breathe.toFixed(3) + "," + (c.scaleY * breathe).toFixed(3) + ") " +
      "translate(" + (-cx) + "," + (-cy) + ")");

    var bodyCol = rgb(c.body), darkCol = rgb(c.dark);
    this.body.setAttribute("fill", bodyCol);
    this.earL.setAttribute("fill", bodyCol); this.earR.setAttribute("fill", bodyCol);
    this.footL.setAttribute("fill", darkCol); this.footR.setAttribute("fill", darkCol);
    this.belly.setAttribute("fill", rgb(c.dark, 0.18));
    this.hiSpot.setAttribute("fill", rgb(c.hi, 0.55));
    this.cheekL.setAttribute("fill", rgb(c.cheeks)); this.cheekR.setAttribute("fill", rgb(c.cheeks));
    this.cheekL.setAttribute("opacity", c.cheekA.toFixed(2)); this.cheekR.setAttribute("opacity", c.cheekA.toFixed(2));
    // víčka v barvě těla
    this.eyeL.lid.setAttribute("fill", bodyCol); this.eyeR.lid.setAttribute("fill", bodyCol);

    // oči
    this.drawEye(this.eyeL, c, -1, t);
    this.drawEye(this.eyeR, c, 1, t);

    // obočí (sad/angry)
    var ba = c.browAngle, bw = 26, bx = cx, by = cy - 40;
    if (Math.abs(ba) > 0.5) {
      var aCol = "rgba(40,40,55," + clamp(Math.abs(ba) / 18, 0, 1).toFixed(2) + ")";
      var dy = ba * 0.5;
      this.browL.setAttribute("x1", bx - 44 - bw / 2); this.browL.setAttribute("y1", by - dy);
      this.browL.setAttribute("x2", bx - 44 + bw / 2); this.browL.setAttribute("y2", by + dy);
      this.browR.setAttribute("x1", bx + 44 + bw / 2); this.browR.setAttribute("y1", by - dy);
      this.browR.setAttribute("x2", bx + 44 - bw / 2); this.browR.setAttribute("y2", by + dy);
      this.browL.setAttribute("stroke", aCol); this.browR.setAttribute("stroke", aCol);
    } else {
      this.browL.setAttribute("stroke", "rgba(0,0,0,0)"); this.browR.setAttribute("stroke", "rgba(0,0,0,0)");
    }

    // pusa
    var my = cy + 52;
    var w = 30 * c.mouthW;
    var depth = c.mouthCurve * 22;
    var d = "M " + (cx - w) + " " + my + " Q " + cx + " " + (my + depth) + " " + (cx + w) + " " + my;
    this.mouthLine.setAttribute("d", d);
    var openRy = clamp(c.mouthOpen, 0, 1) * 26;
    this.mouthFill.setAttribute("rx", (w * 0.7).toFixed(1));
    this.mouthFill.setAttribute("ry", openRy.toFixed(1));
    this.mouthFill.setAttribute("cy", (my + openRy * 0.4).toFixed(1));
    this.mouthFill.setAttribute("opacity", clamp(c.mouthOpen * 1.4, 0, 1).toFixed(2));

    // jiskry
    var sp = clamp(c.sparkle, 0, 2);
    for (var i = 0; i < this.sparks.length; i++) {
      var ph = (t * 2 + i) % 2;
      var a = sp > 0.05 ? (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i))) * clamp(sp, 0, 1) : 0;
      this.sparks[i].setAttribute("opacity", a.toFixed(2));
    }
  };

  KojVector.prototype.drawEye = function (eye, c, side, t) {
    var open = clamp(c.eyeOpen * this.blink, 0, 1.2);
    var happy = c.eyeHappy;
    // pohled — pomalý drift
    var lookX = Math.sin(t * 0.6 + side) * 3;
    var lookY = Math.cos(t * 0.5) * 2;
    eye.pupil.setAttribute("cx", eye.x + lookX);
    eye.pupil.setAttribute("cy", eye.y + 4 + lookY);
    eye.shine.setAttribute("cx", eye.x + 4 + lookX);
    eye.shine.setAttribute("cy", eye.y - 3 + lookY);

    // happy oči = smajlík oblouk místo zorničky
    if (happy > 0.5) {
      eye.arc.setAttribute("opacity", happy.toFixed(2));
      eye.arc.setAttribute("d", "M " + (eye.x - 16) + " " + (eye.y + 4) + " Q " + eye.x + " " + (eye.y - 14) + " " + (eye.x + 16) + " " + (eye.y + 4));
      eye.white.setAttribute("opacity", (1 - happy).toFixed(2));
      eye.pupil.setAttribute("opacity", (1 - happy).toFixed(2));
      eye.shine.setAttribute("opacity", (1 - happy).toFixed(2));
    } else {
      eye.arc.setAttribute("opacity", 0);
      eye.white.setAttribute("opacity", 1);
      eye.pupil.setAttribute("opacity", 1);
      eye.shine.setAttribute("opacity", 1);
      // hvězdy v očích
      var spk = clamp(c.sparkle, 0, 2);
      if (spk > 0.5) {
        eye.pupil.setAttribute("fill", "rgb(255,210,80)");
        eye.pupil.setAttribute("r", (10 + spk * 2).toFixed(1));
      } else {
        eye.pupil.setAttribute("fill", "rgb(35,35,50)");
        eye.pupil.setAttribute("r", 10);
      }
    }

    // víčko (blink + zavřené oči)
    var lidH = (1 - open) * 62;
    eye.lid.setAttribute("height", lidH.toFixed(1));
    eye.lid.setAttribute("y", (eye.y - 34).toFixed(1));
  };

  KojVector.prototype.setSpeaking = function (s) { this.speaking = !!s; };

  KojVector.prototype.setGlow = function (intensity) {
    var blur = document.getElementById("kojGlowBlur");
    if (blur) blur.setAttribute("stdDeviation", (intensity * 6).toFixed(1));
  };

  KojVector.prototype.start = function () {
    var self = this;
    this._raf = requestAnimationFrame(function (n) { self.frame(n); });
  };
  KojVector.prototype.stop = function () { if (this._raf) cancelAnimationFrame(this._raf); };

  window.KojVector = KojVector;
})();
