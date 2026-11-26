// styles.js — estilos musicales de ColorBeat.
// Ritmos: cadenas de 16 pasos (x = golpe fuerte, o = suave, r = redoble, . = silencio).
// Notas: "paso:nota:duración" (duración en pasos de semicorchea). Acordes con "+".

const STYLES = {
  hiphop: {
    name: "Hip hop", bpm: 90,
    kit: { kickPitch: 1, kickDecay: 0.5, snareTone: 190, snareDecay: 0.22, hatDecay: 0.05 },
    bassInst: "sub", chordInst: "keys", leadInst: "pluck", arpInst: "bell",
    drumsA: { kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
    drumsB: { kick: "x.....x.x.....x.", snare: "....x..o....x...", hat: "x.xxx.x.x.xxx.x.", open: "..............x." },
    perc: { tom: "......x.......x.", clap: "............x...", hat: ".o.o.o.o.o.o.o.o" },
    bass: "0:A1:4 6:A1:2 10:C2:4 16:F1:4 22:F1:2 26:E1:6",
    chords: "0:A3+C4+E4:16 16:F3+A3+C4:16",
    melody: "0:E5:2 4:C5:2 8:D5:2 12:B4:2 16:C5:2 20:A4:4 26:G4:2 28:A4:4",
  },
  house: {
    name: "Electrónica", bpm: 124,
    kit: { kickPitch: 1.1, kickDecay: 0.35, snareTone: 220, snareDecay: 0.15, hatDecay: 0.04 },
    bassInst: "saw", chordInst: "pad", leadInst: "stab", arpInst: "pluck",
    drumsA: { kick: "x...x...x...x...", clap: "....x.......x...", open: "..x...x...x...x." },
    drumsB: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "oooooooooooooooo", open: "..x...x...x...x.", snare: "...............x" },
    perc: { hat: "o.o.o.o.o.o.o.o.", tom: "...x.....x....x." },
    bass: "2:F1:1 6:F1:1 10:F1:1 14:F1:1 18:Ab1:1 22:Ab1:1 26:Eb1:1 30:Eb1:1",
    chords: "0:F3+Ab3+C4:8 8:Db3+F3+Ab3:8 16:Ab3+C4+Eb4:8 24:Eb3+G3+Bb3:8",
    melody: "0:C5:1 3:C5:1 6:Ab4:2 8:Bb4:1 11:Bb4:1 14:C5:2 16:Eb5:1 19:Eb5:1 22:C5:2 24:Bb4:4",
  },
  trap: {
    name: "Trap", bpm: 140,
    kit: { kickPitch: 0.9, kickDecay: 0.6, snareTone: 230, snareDecay: 0.18, hatDecay: 0.03 },
    bassInst: "808", chordInst: "pad", leadInst: "bell", arpInst: "pluck",
    drumsA: { kick: "x......x..x.....", clap: "........x.......", hat: "x.x.x.x.x.x.x.x." },
    drumsB: { kick: "x......x..x..x..", clap: "........x.......", snare: "........x.....o.", hat: "x.x.x.xrx.x.xrrr" },
    perc: { open: "......x.......x.", tom: "..............xx" },
    bass: "0:C2:6 7:C2:3 10:Eb2:6 16:G1:6 23:G1:3 26:Bb1:6",
    chords: "0:C4+Eb4+G4:16 16:Ab3+C4+Eb4:16",
    melody: "0:G5:2 3:Eb5:1 4:C5:2 8:D5:2 11:Eb5:1 12:G5:4 16:Ab5:2 19:G5:1 20:Eb5:2 24:D5:4",
  },
  reggaeton: {
    name: "Reguetón", bpm: 95,
    kit: { kickPitch: 1, kickDecay: 0.4, snareTone: 210, snareDecay: 0.14, hatDecay: 0.04 },
    bassInst: "sub", chordInst: "stab", leadInst: "pluck", arpInst: "bell",
    drumsA: { kick: "x...x...x...x...", snare: "...x..x....x..x.", hat: "x.x.x.x.x.x.x.x." },
    drumsB: { kick: "x...x...x...x...", snare: "...x..x....x..x.", clap: "...x..x....x..x.", hat: "xxx.xxx.xxx.xxx.", tom: "..............xx" },
    perc: { open: "..x...x...x...x.", tom: "......x.......x." },
    bass: "0:D2:3 3:D2:3 6:D2:2 8:Bb1:3 11:Bb1:3 14:Bb1:2 16:F1:3 19:F1:3 22:F1:2 24:C2:3 27:C2:3 30:C2:2",
    chords: "0:D4+F4+A4:8 8:Bb3+D4+F4:8 16:F3+A3+C4:8 24:C4+E4+G4:8",
    melody: "0:A4:2 3:D5:1 4:F5:2 6:E5:2 8:D5:4 16:C5:2 19:A4:1 20:C5:2 22:D5:2 24:E5:4",
  },
  rock: {
    name: "Rock", bpm: 120,
    kit: { kickPitch: 0.95, kickDecay: 0.3, snareTone: 180, snareDecay: 0.25, hatDecay: 0.07 },
    bassInst: "pick", chordInst: "guitar", leadInst: "leadGuitar", arpInst: "guitar",
    drumsA: { kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
    drumsB: { kick: "x.x.....x.x.x...", snare: "....x.......x.xx", open: "x.x.x.x.x.x.x.x.", crash: "x..............." },
    perc: { tom: "........x.x.xxxx", crash: "x..............." },
    bass: "0:E1:2 2:E1:2 4:E1:2 6:E1:2 8:G1:2 10:G1:2 12:A1:2 14:A1:2 16:E1:2 18:E1:2 20:E1:2 22:D1:2 24:C1:4 28:D1:4",
    chords: "0:E2+B2+E3:4 4:E2+B2+E3:2 6:G2+D3+G3:2 8:A2+E3+A3:6 14:G2+D3:2 16:E2+B2+E3:4 20:E2+B2+E3:2 22:D2+A2+D3:2 24:C2+G2+C3:4 28:D2+A2+D3:4",
    melody: "0:B4:2 2:D5:2 4:E5:4 8:G5:2 10:E5:2 12:D5:4 16:B4:2 18:A4:2 20:G4:4 24:A4:4 28:B4:4",
  },
  heavy: {
    name: "Heavy", bpm: 150, fx: ["fuzz", "hall"],
    kit: { kickPitch: 0.9, kickDecay: 0.22, snareTone: 170, snareDecay: 0.28, hatDecay: 0.06 },
    bassInst: "pick", chordInst: "heavyGuitar", leadInst: "leadGuitar", arpInst: "heavyGuitar",
    drumsA: { kick: "xxxxxxxxxxxxxxxx", snare: "....x.......x...", crash: "x.......x......." },
    drumsB: { kick: "x.x.x.x.x.x.xxxx", snare: "....x.......x.x.", open: "x.x.x.x.x.x.x.x." },
    perc: { tom: "........xxxxrrrr", crash: "x..............." },
    bass: "0:E1:1 1:E1:1 2:E1:1 3:E1:1 4:G1:2 6:E1:1 7:E1:1 8:Bb1:2 10:A1:2 12:E1:1 13:E1:1 14:E1:1 15:E1:1 16:E1:4 20:G1:4 24:D1:4 28:C1:4",
    chords: "0:E2+B2:1 1:E2+B2:1 2:E2+B2:1 3:E2+B2:1 4:G2+D3:2 6:E2+B2:1 7:E2+B2:1 8:Bb2+F3:2 10:A2+E3:2 12:E2+B2:1 13:E2+B2:1 14:E2+B2:1 15:E2+B2:1 16:E2+B2+E3:4 20:G2+D3+G3:4 24:D2+A2+D3:4 28:C2+G2+C3:4",
    melody: "0:E4:2 2:G4:2 4:A4:2 6:B4:4 10:D5:2 12:B4:2 14:A4:2 16:G4:2 18:A4:2 20:B4:4 24:E5:4 28:D5:2 30:B4:2",
  },
  pop: {
    name: "Pop", bpm: 110,
    kit: { kickPitch: 1, kickDecay: 0.35, snareTone: 200, snareDecay: 0.2, hatDecay: 0.05 },
    bassInst: "pick", chordInst: "keys", leadInst: "lead", arpInst: "pluck",
    drumsA: { kick: "x.......x.......", snare: "....x.......x...", clap: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
    drumsB: { kick: "x..x....x.x.....", snare: "....x.......x...", clap: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", open: "......x.......x." },
    perc: { tom: "...x.......x....", hat: ".o.o.o.o.o.o.o.o" },
    bass: "0:C2:4 6:C2:2 8:G1:4 14:G1:2 16:A1:4 22:A1:2 24:F1:4 30:F1:2",
    chords: "0:C4+E4+G4:8 8:B3+D4+G4:8 16:A3+C4+E4:8 24:A3+C4+F4:8",
    melody: "0:E5:2 2:G5:2 4:G5:2 6:E5:2 8:D5:4 12:B4:2 16:C5:2 18:E5:2 20:A5:4 24:G5:2 26:F5:2 28:E5:4",
  },
};

// --- utilidades para leer las notas -----------------------------------------
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteToMidi(n) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) throw new Error("Nota no válida: " + n);
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
function parseSeq(str) {
  return str.trim().split(/\s+/).map((tok) => {
    const [step, notes, dur] = tok.split(":");
    return { step: Number(step), notes: notes.split("+").map(noteToMidi), dur: Number(dur) };
  });
}
// Arpegio automático a partir de los acordes (semicorcheas, una octava arriba).
function arpFrom(chords) {
  const out = [];
  for (const c of chords) {
    for (let s = 0; s < c.dur; s += 1) {
      const n = c.notes[s % c.notes.length] + 12 + (Math.floor(s / c.notes.length) % 2 ? 12 : 0);
      out.push({ step: c.step + s, notes: [n], dur: 1 });
    }
  }
  return out;
}
// Segundo bajo: corcheas saltando de octava sobre el bajo principal.
function bounceFrom(bass, len) {
  const out = [];
  const sorted = [...bass].sort((a, b) => a.step - b.step);
  for (let s = 0; s < len; s += 2) {
    let cur = sorted[0];
    for (const e of sorted) if (e.step <= s) cur = e;
    out.push({ step: s, notes: [cur.notes[0] + ((s / 2) % 2 ? 12 : 0)], dur: 1 });
  }
  return out;
}

// --- variaciones automáticas a partir de los acordes y la melodía -----------
const shift = (evs, semis, stepOff = 0, len = 32) =>
  evs.map((e) => ({ step: (e.step + stepOff) % len, notes: e.notes.map((n) => n + semis), dur: e.dur }));
function rootOf(c) {
  let r = Math.min(...c.notes);
  while (r > 47) r -= 12;
  while (r < 36) r += 12;
  return r;
}
const longBass = (chords) => chords.map((c) => ({ step: c.step, notes: [rootOf(c)], dur: c.dur }));
function jumpBass(chords) {
  const out = [];
  for (const c of chords) for (let s = 0; s < c.dur; s++) {
    if ("x.xx.x.x"[s % 8] === "x") out.push({ step: c.step + s, notes: [rootOf(c) + (s % 4 === 3 ? 12 : 0)], dur: 1 });
  }
  return out;
}
function offbeatStabs(chords) {
  const out = [];
  for (const c of chords) for (let s = 0; s < c.dur; s++) if (s % 4 === 2) out.push({ step: c.step + s, notes: c.notes.map((n) => n + 12), dur: 1 });
  return out;
}
function bellTops(chords) {
  const out = [];
  for (const c of chords) for (let s = 0; s < c.dur; s += 4) out.push({ step: c.step + s, notes: [Math.max(...c.notes) + 12 + (s % 8 ? 0 : 7)], dur: 2 });
  return out;
}
function arpDown(chords) {
  const out = [];
  for (const c of chords) {
    const ns = [...c.notes].reverse();
    for (let s = 0; s < c.dur; s += 2) out.push({ step: c.step + s, notes: [ns[(s / 2) % ns.length] + 24], dur: 2 });
  }
  return out;
}
const other = (inst, a, b) => (inst === a ? b : a);

// Construye los 20 bucles y los 20 golpes de un estilo.
function buildStyle(key) {
  const st = STYLES[key];
  const bass = parseSeq(st.bass);
  const chords = parseSeq(st.chords);
  const melody = parseSeq(st.melody);
  const D = (name, group, tracks) => ({ name, color: "red", group, type: "drums", len: 16, tracks });
  const N = (name, color, group, inst, events) => ({ name, color, group, type: "notes", len: 32, inst, events });
  const loops = [
    D("Ritmo 1", "drums", st.drumsA),
    D("Ritmo 2", "drums", st.drumsB),
    D("Ritmo 3", "drums", { kick: st.drumsA.kick, snare: "........x.......", hat: "x.x.x.x.x.x.x.x." }),
    D("Percusión", null, st.perc),
    D("Charles", "hats", { hat: "x.o.x.o.x.o.x.o.", open: "......x.......x." }),
    D("Redoble", "hats", { snare: "....x.x.xxxxrrrr", tom: "x.......x.x.x..." }),
    N("Bajo 1", "yellow", "bass", st.bassInst, bass),
    N("Bajo 2", "yellow", "bass", st.bassInst, bounceFrom(bass, 32)),
    N("Bajo largo", "yellow", "bass", other(st.bassInst, "sub", "808"), longBass(chords)),
    N("Bajo saltarín", "yellow", "bass", other(st.bassInst, "pick", "saw"), jumpBass(chords)),
    N("Acordes", "green", "chords", st.chordInst, chords),
    N("Colchón", "green", "chords", other(st.chordInst, "pad", "keys"), chords),
    N("Golpes acorde", "green", null, other(st.chordInst, "stab", "pluck"), offbeatStabs(chords)),
    N("Campanas", "green", null, "bell", bellTops(chords)),
    N("Melodía", "blue", "lead", st.leadInst, melody),
    N("Melodía alta", "blue", "lead", other(st.leadInst, "bell", "pluck"), shift(melody, 12)),
    N("Respuesta", "blue", "lead", other(st.leadInst, "keys", "lead"), shift(melody, -12, 2)),
    N("Arpegio", "blue", "arp", st.arpInst, arpFrom(chords)),
    N("Arpegio lento", "blue", "arp", other(st.arpInst, "pluck", "bell"), arpDown(chords)),
    N("Eco melodía", "blue", null, "pluck", shift(melody, 0, 3)),
    // Coros (sección Voces)
    { ...N("Coro «aah»", "red", "choir", "choirA", chords), section: "voice" },
    { ...N("Coro «ooh»", "yellow", "choir", "choirO", shift(chords, 12)), section: "voice" },
    { ...N("Coro melodía", "green", "choirLead", "choirE", melody.map((e) => ({ ...e, notes: e.notes.map((n) => (n > 76 ? n - 12 : n)) }))), section: "voice" },
    { ...N("Coro corto", "blue", null, "choirU", offbeatStabs(chords)), section: "voice" },
  ];
  const H = [
    ["Bombo", "kick"], ["Bombo 808", "kick2"], ["Caja", "snare"], ["Aro", "rim"],
    ["Palmas", "clap"], ["Chasquido", "snap"], ["Charles", "hat"], ["Abierto", "open"],
    ["Ride", "ride"], ["Platillo", "crash"], ["Tom alto", "tomHi"], ["Tom bajo", "tomLo"],
    ["Cencerro", "cowbell"], ["Conga", "conga"], ["Maraca", "shaker"], ["¡Ey!", "vox"],
    ["Láser", "zap"], ["Subida", "riser"], ["Bajada", "downer"], ["Impacto", "boom"],
  ];
  const COLORS = ["red", "yellow", "green", "blue"];
  const hits = H.map(([name, voice], i) => ({ name, voice, color: COLORS[i % 4] }));
  return { key, name: st.name, bpm: st.bpm, kit: st.kit, loops, hits, fx: st.fx || [] };
}
