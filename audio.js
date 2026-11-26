// audio.js — motor de sonido de ColorBeat. Todos los sonidos se generan
// con la Web Audio API (no hay archivos de audio), así que son propios.

const Engine = (() => {
  let ctx, input, master, recDest, noiseBuf, gateNode, gate2Node;
  let style = null;
  let bpm = 100;
  const units = {};   // efectos: nombre -> {set(on), bpm()}
  const fx = {};      // efectos encendidos

  // ---- estado del secuenciador ----
  let step = 0;            // paso global (semicorcheas) que se programará a continuación
  let nextTime = 0;        // momento en que suena ese paso
  let timer = null;
  const loopState = [];    // por bucle: {state:'off'|'waiting'|'on', start}
  const listeners = new Set();

  const stepDur = () => 60 / bpm / 4;

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    input = ctx.createGain();
    gateNode = ctx.createGain();
    gate2Node = ctx.createGain();
    master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;

    // Cadena de efectos: cada uno se intercala y solo procesa sonido si está encendido.
    let last = input;
    for (const [name, def] of Object.entries(FX_DEFS)) {
      const u = makeUnit(def);
      last.connect(u.in);
      last = u.out;
      units[name] = u;
    }
    last.connect(gateNode).connect(gate2Node).connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    recDest = ctx.createMediaStreamDestination();
    comp.connect(recDest);

    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(schedule, 25);
  }

  function curve(amount) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = amount ? ((1 + amount) * x) / (1 + amount * Math.abs(x)) : x;
    }
    return c;
  }

  // ---- efectos ----
  function lfoTo(param, freq, depth, type = "sine") {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = depth;
    o.connect(g).connect(param); o.start();
  }
  function makeIR(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = b.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  const one = (node) => ({ inp: node, out: node });
  const chain = (...nodes) => { nodes.reduce((a, b) => a.connect(b)); return { inp: nodes[0], out: nodes[nodes.length - 1] }; };
  function shaper(fn) {
    const ws = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = fn((i * 2) / n - 1);
    ws.curve = c;
    return ws;
  }
  function gainNode(v) { const g = ctx.createGain(); g.gain.value = v; return g; }

  // mode "insert": sustituye al sonido; "send": se suma al sonido original.
  const FX_DEFS = {
    dist:     { mode: "insert", wet: 0.7, build: () => one(shaper((x) => (26 * x) / (1 + 25 * Math.abs(x)))) },
    fuzz:     { mode: "insert", wet: 0.4, build: () => chain(shaper((x) => Math.tanh(x * 40)), filt("lowpass", 3500)) },
    lofi:     { mode: "insert", wet: 1, build: () => chain(shaper((x) => Math.round(x * 6) / 6), filt("lowpass", 2800)) },
    phone:    { mode: "insert", wet: 1.8, build: () => chain(filt("highpass", 500), filt("lowpass", 2800), shaper((x) => Math.tanh(x * 3))) },
    robot:    { mode: "insert", wet: 1.4, build: () => { const g = gainNode(0); lfoTo(g.gain, 90, 1, "square"); return one(g); } },
    bassUp:   { mode: "insert", wet: 1, build: () => { const f = filt("lowshelf", 150); f.gain.value = 12; return one(f); } },
    trebleUp: { mode: "insert", wet: 1, build: () => { const f = filt("highshelf", 3500); f.gain.value = 10; return one(f); } },
    filter:   { mode: "insert", wet: 1, build: () => { const f = filt("lowpass", 900, 6); lfoTo(f.frequency, 0.25, 600); return one(f); } },
    hpf:      { mode: "insert", wet: 1, build: () => one(filt("highpass", 1500, 3)) },
    wah:      { mode: "insert", wet: 2, build: () => { const f = filt("bandpass", 1000, 5); lfoTo(f.frequency, 2, 800); return one(f); } },
    tremolo:  { mode: "insert", wet: 1, build: () => { const g = gainNode(0.5); lfoTo(g.gain, 6, 0.5); return one(g); } },
    pan:      { mode: "insert", wet: 1, build: () => { const p = ctx.createStereoPanner(); lfoTo(p.pan, 0.5, 0.9); return one(p); } },
    flanger:  { mode: "send", wet: 0.7, build: () => {
      const d = ctx.createDelay(0.05), fb = gainNode(0.6);
      d.delayTime.value = 0.004; lfoTo(d.delayTime, 0.25, 0.003);
      d.connect(fb).connect(d);
      return one(d);
    } },
    echo:     { mode: "send", wet: 0.35, build: () => {
      const d = ctx.createDelay(2), fb = gainNode(0.4);
      d.connect(fb).connect(d);
      return { inp: d, out: d, bpm: (sd) => d.delayTime.setValueAtTime(sd * 3, ctx.currentTime) };
    } },
    echoLong: { mode: "send", wet: 0.3, build: () => {
      const d = ctx.createDelay(2), fb = gainNode(0.55), lp = filt("lowpass", 2500);
      d.connect(lp).connect(fb).connect(d);
      return { inp: d, out: lp, bpm: (sd) => d.delayTime.setValueAtTime(Math.min(sd * 6, 1.9), ctx.currentTime) };
    } },
    pingpong: { mode: "send", wet: 0.4, build: () => {
      const inp = gainNode(1), dl = ctx.createDelay(2), dr = ctx.createDelay(2), fb = gainNode(0.45), m = ctx.createChannelMerger(2);
      inp.connect(dl); dl.connect(m, 0, 0); dl.connect(dr); dr.connect(m, 0, 1); dr.connect(fb).connect(dl);
      return { inp, out: m, bpm: (sd) => { dl.delayTime.setValueAtTime(sd * 3, ctx.currentTime); dr.delayTime.setValueAtTime(sd * 3, ctx.currentTime); } };
    } },
    reverb:   { mode: "send", wet: 0.45, build: () => { const c = ctx.createConvolver(); c.buffer = makeIR(2, 3); return one(c); } },
    hall:     { mode: "send", wet: 0.55, build: () => { const c = ctx.createConvolver(); c.buffer = makeIR(5, 2); return one(c); } },
  };

  function makeUnit(def) {
    const inp = ctx.createGain(), out = ctx.createGain(), dry = gainNode(1), wet = gainNode(0);
    inp.connect(dry).connect(out);
    const b = def.build();
    b.out.connect(wet).connect(out);
    let connected = false, isOn = false;
    return {
      in: inp, out,
      bpm: () => b.bpm && b.bpm(stepDur()),
      set(on) {
        isOn = on;
        const now = ctx.currentTime;
        if (on && !connected) { inp.connect(b.inp); connected = true; if (b.bpm) b.bpm(stepDur()); }
        wet.gain.setTargetAtTime(on ? def.wet : 0, now, 0.03);
        if (def.mode === "insert") dry.gain.setTargetAtTime(on ? 0 : 1, now, 0.03);
        if (!on) setTimeout(() => { if (!isOn && connected) { inp.disconnect(b.inp); connected = false; } }, 1500);
      },
    };
  }

  // ---- utilidades de sonido ----
  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function noise(t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur);
    return s;
  }
  function filt(type, f, q = 1) {
    const b = ctx.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---- batería ----
  const drums = {
    kick(t, v, k) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(160 * k.kickPitch, t);
      o.frequency.exponentialRampToValueAtTime(42 * k.kickPitch, t + 0.12);
      env(g, t, 1.2 * v, 0.002, k.kickDecay);
      o.connect(g).connect(input);
      o.start(t); o.stop(t + k.kickDecay + 0.05);
    },
    snare(t, v, k) {
      const n = noise(t, k.snareDecay + 0.05), g = ctx.createGain();
      env(g, t, 0.7 * v, 0.002, k.snareDecay);
      n.connect(filt("highpass", 1200)).connect(g).connect(input);
      const o = ctx.createOscillator(), g2 = ctx.createGain();
      o.type = "triangle"; o.frequency.value = k.snareTone;
      env(g2, t, 0.5 * v, 0.002, 0.1);
      o.connect(g2).connect(input); o.start(t); o.stop(t + 0.15);
    },
    clap(t, v) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.012, 0.024].forEach((o) => {
        g.gain.setValueAtTime(0.8 * v, t + o);
        g.gain.exponentialRampToValueAtTime(0.1, t + o + 0.01);
      });
      g.gain.setValueAtTime(0.6 * v, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      noise(t, 0.3).connect(filt("bandpass", 1500, 1.5)).connect(g).connect(input);
    },
    hat(t, v, k) {
      const g = ctx.createGain();
      env(g, t, 0.35 * v, 0.001, k.hatDecay);
      noise(t, k.hatDecay + 0.05).connect(filt("highpass", 7500)).connect(g).connect(input);
    },
    open(t, v) {
      const g = ctx.createGain();
      env(g, t, 0.3 * v, 0.001, 0.35);
      noise(t, 0.4).connect(filt("highpass", 6500)).connect(g).connect(input);
    },
    tom(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.25);
      env(g, t, 0.8 * v, 0.002, 0.35);
      o.connect(g).connect(input); o.start(t); o.stop(t + 0.4);
    },
    crash(t, v) {
      const g = ctx.createGain();
      env(g, t, 0.35 * v, 0.002, 1.4);
      noise(t, 1.5).connect(filt("highpass", 4500)).connect(g).connect(input);
    },
    kick2(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain(), ws = ctx.createWaveShaper();
      ws.curve = curve(3);
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.2);
      env(g, t, 1 * v, 0.002, 1.1);
      o.connect(ws).connect(g).connect(input);
      o.start(t); o.stop(t + 1.2);
    },
    rim(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = 1700;
      env(g, t, 0.35 * v, 0.001, 0.03);
      o.connect(filt("bandpass", 1700, 4)).connect(g).connect(input);
      o.start(t); o.stop(t + 0.06);
      const g2 = ctx.createGain(); env(g2, t, 0.4 * v, 0.001, 0.04);
      noise(t, 0.06).connect(filt("highpass", 3000)).connect(g2).connect(input);
    },
    snap(t, v) {
      const g = ctx.createGain();
      env(g, t, 0.9 * v, 0.001, 0.06);
      noise(t, 0.1).connect(filt("bandpass", 2600, 3)).connect(g).connect(input);
    },
    ride(t, v) {
      const g = ctx.createGain();
      env(g, t, 0.25 * v, 0.001, 0.9);
      noise(t, 1).connect(filt("bandpass", 8000, 2)).connect(g).connect(input);
      [420, 655, 1003].forEach((f) => {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = "square"; o.frequency.value = f * 4;
        env(og, t, 0.03 * v, 0.001, 0.7);
        o.connect(filt("highpass", 3000)).connect(og).connect(input); o.start(t); o.stop(t + 0.8);
      });
    },
    tomHi(t, v) { drums._tom(t, v, 260, 150); },
    tomLo(t, v) { drums._tom(t, v, 120, 65); },
    _tom(t, v, f0, f1) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + 0.3);
      env(g, t, 0.85 * v, 0.002, 0.4);
      o.connect(g).connect(input); o.start(t); o.stop(t + 0.45);
    },
    cowbell(t, v) {
      const g = ctx.createGain();
      env(g, t, 0.3 * v, 0.001, 0.35);
      const bp = filt("bandpass", 800, 2);
      [540, 800].forEach((f) => { const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = f; o.connect(bp); o.start(t); o.stop(t + 0.4); });
      bp.connect(g).connect(input);
    },
    conga(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(220, t + 0.05);
      env(g, t, 0.8 * v, 0.002, 0.25);
      o.connect(g).connect(input); o.start(t); o.stop(t + 0.3);
    },
    shaker(t, v) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25 * v, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      noise(t, 0.15).connect(filt("highpass", 5000)).connect(g).connect(input);
    },
    vox(t, v) {
      // "¡Ey!": diente de sierra con dos formantes de voz.
      const o = ctx.createOscillator(), g = ctx.createGain(), mix = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(210, t);
      o.frequency.linearRampToValueAtTime(260, t + 0.15);
      [[600, 6], [1800, 8], [2700, 10]].forEach(([f, q]) => o.connect(filt("bandpass", f, q)).connect(mix));
      mix.gain.value = 3;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.02);
      g.gain.setValueAtTime(0.9 * v, t + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      mix.connect(g).connect(input); o.start(t); o.stop(t + 0.32);
    },
    riser(t, v) {
      const g = ctx.createGain(), f = filt("bandpass", 300, 3);
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(9000, t + 2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.6 * v, t + 1.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.05);
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
      n.connect(f).connect(g).connect(input); n.start(t); n.stop(t + 2.1);
    },
    downer(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 1);
      env(g, t, 0.5 * v, 0.005, 1);
      o.connect(g).connect(input); o.start(t); o.stop(t + 1.05);
    },
    boom(t, v) {
      drums.kick2(t, v);
      drums.crash(t, 0.9 * v);
      const g = ctx.createGain();
      env(g, t, 0.6 * v, 0.003, 1.2);
      noise(t, 1.3).connect(filt("lowpass", 400)).connect(g).connect(input);
    },
    zap(t, v) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(2400, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.3);
      env(g, t, 0.35 * v, 0.003, 0.3);
      o.connect(filt("lowpass", 3000)).connect(g).connect(input);
      o.start(t); o.stop(t + 0.35);
    },
  };

  // ---- instrumentos con notas ----
  const PRESETS = {
    sub:    { oscs: [["sine", 0, 1], ["triangle", 0, 1, 0.3]], f: 400, a: 0.005, r: 0.08, vol: 0.9 },
    saw:    { oscs: [["sawtooth", 0, 1]], f: 500, fEnv: 1200, a: 0.005, r: 0.05, vol: 0.45 },
    "808":  { oscs: [["sine", 0, 1]], f: 2000, a: 0.003, r: 0.3, vol: 1, glide: true, drive: 2 },
    pick:   { oscs: [["sawtooth", 0, 1], ["square", 0, 0.5, 0.4]], f: 900, fEnv: 800, a: 0.003, r: 0.05, vol: 0.45 },
    pad:    { oscs: [["sawtooth", -8, 1], ["sawtooth", 8, 1]], f: 1400, a: 0.08, r: 0.35, vol: 0.13 },
    keys:   { oscs: [["triangle", 0, 1], ["sine", 0, 2, 0.4]], f: 3000, a: 0.005, r: 0.3, vol: 0.25, decay: true },
    stab:   { oscs: [["sawtooth", -6, 1], ["sawtooth", 6, 1]], f: 800, fEnv: 2500, a: 0.004, r: 0.1, vol: 0.16 },
    guitar: { oscs: [["sawtooth", -5, 1], ["sawtooth", 5, 1], ["square", 0, 0.5, 0.5]], f: 3200, a: 0.004, r: 0.12, vol: 0.12, drive: 30 },
    pluck:  { oscs: [["square", 0, 1]], f: 400, fEnv: 3500, a: 0.003, r: 0.15, vol: 0.2, decay: true },
    bell:   { oscs: [["sine", 0, 1], ["sine", 0, 2.76, 0.35], ["sine", 0, 5.4, 0.12]], f: 8000, a: 0.002, r: 0.8, vol: 0.25, decay: true },
    // Guitarras eléctricas con distorsión y "altavoz" (cab) simulado.
    heavyGuitar: { oscs: [["sawtooth", -9, 1], ["sawtooth", 9, 1], ["square", 0, 0.5, 0.6]], f: 6000, a: 0.003, r: 0.08, vol: 0.08, drive: 90, cab: true },
    leadGuitar:  { oscs: [["sawtooth", 0, 1], ["sawtooth", 7, 1, 0.7]], f: 5000, a: 0.006, r: 0.15, vol: 0.07, drive: 45, cab: true, vibrato: true },
    lead:   { oscs: [["sawtooth", 0, 1], ["square", 7, 1, 0.5]], f: 2400, a: 0.01, r: 0.12, vol: 0.14, vibrato: true },
  };

  // ---- coros: voz sintética con formantes de vocales ----
  const VOWELS = {
    A: [[800, 1], [1150, 0.5], [2900, 0.15]],
    O: [[450, 1], [800, 0.4], [2830, 0.1]],
    E: [[400, 1], [1600, 0.4], [2700, 0.2]],
    U: [[325, 1], [700, 0.3], [2530, 0.08]],
  };
  function playChoir(t, midi, dur, vowel, v = 1) {
    const freq = mtof(midi), end = t + dur, stopAt = end + 0.35;
    const src = ctx.createGain(), out = ctx.createGain();
    [-7, 7].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = det;
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 5 + Math.random(); lg.gain.value = 12;
      l.connect(lg).connect(o.detune); l.start(t); l.stop(stopAt);
      o.connect(src); o.start(t); o.stop(stopAt);
    });
    for (const [f, g] of VOWELS[vowel]) {
      const bp = filt("bandpass", f, 9), fg = gainNode(g * 6);
      src.connect(bp).connect(fg).connect(out);
    }
    const peak = 0.22 * v;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(peak, t + 0.08);
    out.gain.setValueAtTime(peak, Math.max(t + 0.08, end));
    out.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + 0.08, end) + 0.3);
    out.connect(input);
  }

  // ---- voces grabadas ----
  const playing = new Map();
  function playBuffer(id, buffer) {
    init();
    const old = playing.get(id);
    if (old) try { old.stop(); } catch (e) {}
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.connect(input);
    s.start(ctx.currentTime + 0.005);
    playing.set(id, s);
    s.onended = () => { if (playing.get(id) === s) playing.delete(id); };
  }
  function decode(arrayBuffer) {
    init();
    return new Promise((res, rej) => ctx.decodeAudioData(arrayBuffer, res, rej));
  }

  function playNote(t, midi, dur, presetName, v = 1) {
    if (presetName.startsWith("choir")) return playChoir(t, midi, dur, presetName.slice(5), v);
    const p = PRESETS[presetName];
    const freq = mtof(midi);
    const out = ctx.createGain();
    const f = filt("lowpass", p.f, 1.5);
    if (p.fEnv) {
      f.frequency.setValueAtTime(p.f + p.fEnv, t);
      f.frequency.exponentialRampToValueAtTime(p.f, t + Math.min(dur, 0.3));
    }
    let chainEnd = f;
    if (p.drive) {
      const ws = ctx.createWaveShaper();
      ws.curve = curve(p.drive);
      f.connect(ws);
      chainEnd = ws;
    }
    if (p.cab) {
      const lp = filt("lowpass", 4200, 0.9), hp = filt("highpass", 90), mid = filt("peaking", 650);
      mid.gain.value = -5;
      chainEnd.connect(hp).connect(mid).connect(lp);
      chainEnd = lp;
    }
    chainEnd.connect(out).connect(input);

    const peak = p.vol * v;
    const end = t + dur;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(peak, t + p.a);
    if (p.decay) out.gain.exponentialRampToValueAtTime(peak * 0.25, t + p.a + Math.max(dur, 0.2));
    else out.gain.setValueAtTime(peak, Math.max(t + p.a, end));
    out.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + p.a, end) + p.r + (p.decay ? Math.max(dur, 0.2) : 0));
    const stopAt = end + p.r + (p.decay ? Math.max(dur, 0.2) : 0) + 0.05;

    for (const [type, detune, mult, gain = 1] of p.oscs) {
      const o = ctx.createOscillator();
      o.type = type;
      o.detune.value = detune;
      if (p.glide) {
        o.frequency.setValueAtTime(freq * mult * 2, t);
        o.frequency.exponentialRampToValueAtTime(freq * mult, t + 0.06);
      } else o.frequency.value = freq * mult;
      if (p.vibrato) {
        const l = ctx.createOscillator(), lg = ctx.createGain();
        l.frequency.value = 5.5; lg.gain.value = 6;
        l.connect(lg).connect(o.detune); l.start(t); l.stop(stopAt);
      }
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(f);
      o.start(t); o.stop(stopAt);
    }
  }

  // ---- secuenciador ----
  function schedule() {
    if (!style) return;
    while (nextTime < ctx.currentTime + 0.12) {
      playStep(step, nextTime);
      emit({ type: "step", step, time: nextTime });
      nextTime += stepDur();
      step++;
    }
  }

  function playStep(s, t) {
    const sd = stepDur();
    if (s % 16 === 0) {
      style.loops.forEach((l, i) => {
        if (loopState[i].state === "waiting") { loopState[i].state = "on"; loopState[i].start = s; emit({ type: "loops" }); }
      });
    }
    style.loops.forEach((loop, i) => {
      const ls = loopState[i];
      if (ls.state !== "on") return;
      const pos = (s - ls.start) % loop.len;
      if (loop.type === "drums") {
        for (const [voice, pat] of Object.entries(loop.tracks)) {
          const ch = pat[pos % pat.length];
          if (ch === "x") drums[voice](t, 1, style.kit);
          else if (ch === "o") drums[voice](t, 0.45, style.kit);
          else if (ch === "r") { drums[voice](t, 0.8, style.kit); drums[voice](t + sd / 2, 0.6, style.kit); }
        }
      } else {
        for (const e of loop.events) {
          if (e.step === pos) for (const n of e.notes) playNote(t, n, e.dur * sd * 0.95, loop.inst);
        }
      }
    });
    if (fx.chop) {
      gateNode.gain.setValueAtTime(1, t);
      gateNode.gain.setValueAtTime(0.05, t + sd * 0.5);
    }
    if (fx.chop2) {
      [0, 0.5].forEach((o) => {
        gate2Node.gain.setValueAtTime(1, t + sd * o);
        gate2Node.gain.setValueAtTime(0.05, t + sd * (o + 0.25));
      });
    }
  }

  // ---- API pública ----
  function setStyle(s) {
    style = s;
    loopState.length = 0;
    s.loops.forEach(() => loopState.push({ state: "off", start: 0 }));
    setBpm(s.bpm);
    emit({ type: "loops" });
  }
  function setBpm(v) {
    bpm = v;
    Object.values(units).forEach((u) => u.bpm());
  }
  function toggleLoop(i) {
    init();
    const ls = loopState[i];
    if (ls.state === "off") {
      const g = style.loops[i].group;
      if (g) style.loops.forEach((l, j) => { if (j !== i && l.group === g && loopState[j].state !== "off") loopState[j].state = "off"; });
      const anyOn = loopState.some((x) => x.state === "on");
      if (!anyOn) {
        // Nada sonando: empezamos ya, alineando el paso global a un compás.
        step = Math.ceil(step / 16) * 16;
        nextTime = Math.max(nextTime, ctx.currentTime + 0.03);
      }
      ls.state = "waiting";
    } else ls.state = "off";
    emit({ type: "loops" });
  }
  function stopAll() {
    loopState.forEach((l) => (l.state = "off"));
    emit({ type: "loops" });
  }
  function hit(voice) {
    init();
    drums[voice](ctx.currentTime + 0.005, 1, style.kit);
  }
  function setFx(name, on) {
    init();
    fx[name] = on;
    const now = ctx.currentTime;
    if (units[name]) units[name].set(on);
    if (name === "chop" && !on) { gateNode.gain.cancelScheduledValues(now); gateNode.gain.setValueAtTime(1, now + 0.01); }
    if (name === "chop2" && !on) { gate2Node.gain.cancelScheduledValues(now); gate2Node.gain.setValueAtTime(1, now + 0.01); }
  }
  function setVolume(v) { init(); master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); }

  // Posición actual (para la barra de progreso de cada bucle).
  function loopProgress(i) {
    const ls = loopState[i];
    if (!ctx || ls.state !== "on") return 0;
    const cur = step - (nextTime - ctx.currentTime) / stepDur();
    const len = style.loops[i].len;
    return (((cur - ls.start) % len) + len) % len / len;
  }

  function emit(e) { listeners.forEach((f) => f(e)); }

  return {
    init, setStyle, setBpm, toggleLoop, stopAll, hit, setFx, setVolume, loopProgress, playBuffer, decode,
    on: (f) => listeners.add(f),
    get states() { return loopState.map((l) => l.state); },
    get stream() { init(); return recDest.stream; },
    get bpm() { return bpm; },
  };
})();
