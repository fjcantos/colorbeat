// app.js — pantalla, grabación y guardado de ColorBeat.

const $ = (s) => document.querySelector(s);
let current = null;

// ---------- estilos ----------
function renderStyles() {
  const nav = $("#styles");
  nav.innerHTML = "";
  for (const key of Object.keys(STYLES)) {
    const b = document.createElement("button");
    b.textContent = STYLES[key].name;
    b.className = current && current.key === key ? "sel" : "";
    b.onclick = () => selectStyle(key);
    nav.appendChild(b);
  }
}
function selectStyle(key) {
  Engine.stopAll();
  current = buildStyle(key);
  Engine.setStyle(current);
  $("#bpm").value = current.bpm;
  $("#bpmVal").textContent = current.bpm;
  localStorage.setItem("colorbeat.style", key);
  renderStyles();
  renderPads();
  applyStyleFx();
}
// Efectos que trae encendidos cada estilo (p. ej. Heavy: Fuzz + Sala grande).
// Al cambiar de estilo se apagan los que puso el estilo anterior.
let styleFxOn = [];
function applyStyleFx() {
  const pads = document.querySelectorAll("#fx .pad");
  if (!pads.length) return;
  const set = (key, on) => {
    const i = FX.findIndex((f) => f.key === key);
    if (i < 0) return;
    pads[i].classList.toggle("on", on);
    Engine.setFx(key, on);
  };
  styleFxOn.forEach((k) => set(k, false));
  styleFxOn = current.fx.slice();
  styleFxOn.forEach((k) => set(k, true));
}

// ---------- pads ----------
function makePad(label, color, onPress) {
  const b = document.createElement("button");
  b.className = "pad " + color;
  b.innerHTML = `<span>${label}</span><i class="prog"></i>`;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); onPress(b); });
  return b;
}
function flash(b) {
  b.classList.add("hit");
  setTimeout(() => b.classList.remove("hit"), 110);
}
function renderPads() {
  const loops = $("#loops"), hits = $("#hits"), choirs = $("#choirs");
  loops.innerHTML = ""; hits.innerHTML = ""; choirs.innerHTML = "";
  current.loops.forEach((l, i) => {
    const b = makePad(l.name, l.color, () => Engine.toggleLoop(i));
    b.dataset.loop = i;
    (l.section === "voice" ? choirs : loops).appendChild(b);
  });
  current.hits.forEach((h) => hits.appendChild(makePad(h.name, h.color, (b) => { Engine.hit(h.voice); flash(b); })));
  updateLoopPads();
}
const loopPads = () => document.querySelectorAll("[data-loop]");
function updateLoopPads() {
  const states = Engine.states;
  loopPads().forEach((b) => {
    const s = states[b.dataset.loop];
    b.classList.toggle("on", s === "on");
    b.classList.toggle("waiting", s === "waiting");
  });
}
Engine.on((e) => { if (e.type === "loops") updateLoopPads(); });

function animate() {
  if (current) {
    loopPads().forEach((b) => {
      b.querySelector(".prog").style.width = (Engine.loopProgress(Number(b.dataset.loop)) * 100).toFixed(1) + "%";
    });
  }
  requestAnimationFrame(animate);
}

// ---------- pads con pulsación larga ----------
function makeHoldPad(onTap, onHold) {
  const b = document.createElement("button");
  let timer = null, held = false;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    held = false;
    timer = setTimeout(() => { held = true; onHold(b); }, 650);
  });
  const end = () => {
    if (timer) { clearTimeout(timer); timer = null; if (!held) onTap(b); }
  };
  b.addEventListener("pointerup", end);
  b.addEventListener("pointerleave", () => { if (timer) { clearTimeout(timer); timer = null; } });
  b.addEventListener("contextmenu", (e) => e.preventDefault());
  return b;
}
const COLORS4 = ["red", "yellow", "green", "blue"];

// ---------- Mi voz: grabar con el micrófono ----------
const VOICE_SLOTS = 8;
const voiceBuffers = {};
let micRec = null;
function setPadLook(b, color, label, empty) {
  b.className = "pad " + color + (empty ? " empty" : "");
  b.innerHTML = `<span></span>`;
  b.querySelector("span").textContent = label;
}
function renderVoicePads() {
  const box = $("#myvoice");
  box.innerHTML = "";
  for (let i = 0; i < VOICE_SLOTS; i++) {
    const color = COLORS4[i % 4];
    const b = makeHoldPad(
      (b) => voiceTap(i, b),
      async (b) => {
        if (!voiceBuffers[i]) return;
        if (confirm("¿Borrar esta voz para grabar otra?")) {
          await DB.delVoice(i); delete voiceBuffers[i]; refresh(b);
        }
      }
    );
    const refresh = (b) => setPadLook(b, color, voiceBuffers[i] ? `Voz ${i + 1}` : "+ Grabar voz", !voiceBuffers[i]);
    b.refresh = () => refresh(b);
    refresh(b);
    box.appendChild(b);
  }
}
async function voiceTap(i, b) {
  if (voiceBuffers[i]) { Engine.playBuffer("voice" + i, voiceBuffers[i]); flash(b); return; }
  if (micRec && micRec.state === "recording") {
    if (micRec.slot === i) micRec.stop();
    return;
  }
  if (!navigator.mediaDevices || !window.MediaRecorder) { alert("Este navegador no permite usar el micrófono."); return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    alert("No se pudo usar el micrófono. Revisa que hayas dado permiso a la app para usarlo.");
    return;
  }
  const mime = pickMime();
  micRec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  micRec.slot = i;
  const parts = [];
  micRec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  micRec.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(parts, { type: micRec.mimeType || mime });
    try {
      voiceBuffers[i] = await Engine.decode(await blob.arrayBuffer());
      await DB.putVoice(i, blob);
    } catch (e) {
      alert("No se pudo guardar la grabación. Inténtalo de nuevo.");
    }
    b.refresh();
  };
  micRec.start();
  b.className = "pad red recording";
  b.innerHTML = "<span>● Grabando… toca para parar</span>";
  // Por seguridad, para sola a los 10 segundos.
  setTimeout(() => { if (micRec && micRec.slot === i && micRec.state === "recording") micRec.stop(); }, 10000);
}
async function loadVoices() {
  for (const v of await DB.allVoices()) {
    try { voiceBuffers[v.slot] = await Engine.decode(await v.blob.arrayBuffer()); } catch (e) {}
  }
  renderVoicePads();
}

// ---------- Frases habladas ----------
const PHRASE_SLOTS = 8;
let phrases = JSON.parse(localStorage.getItem("colorbeat.phrases") || "[]");
function spanishVoice() {
  const vs = speechSynthesis.getVoices();
  return vs.find((v) => v.lang === "es-ES") || vs.find((v) => v.lang && v.lang.startsWith("es")) || null;
}
function say(text) {
  if (!("speechSynthesis" in window)) { alert("Esta tablet no tiene voz automática."); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = spanishVoice();
  if (v) u.voice = v;
  u.lang = v ? v.lang : "es-ES";
  u.rate = 1;
  speechSynthesis.speak(u);
}
function editPhrase(i) {
  const t = prompt("Escribe la frase que dirá este pad:", phrases[i] || "");
  if (t === null) return;
  phrases[i] = t.trim();
  localStorage.setItem("colorbeat.phrases", JSON.stringify(phrases));
  renderPhrasePads();
}
function renderPhrasePads() {
  const box = $("#phrases");
  box.innerHTML = "";
  for (let i = 0; i < PHRASE_SLOTS; i++) {
    const text = phrases[i];
    const b = makeHoldPad((b) => { if (text) { say(text); flash(b); } else editPhrase(i); }, () => editPhrase(i));
    setPadLook(b, COLORS4[i % 4], text ? `«${text}»` : "+ Escribir frase", !text);
    box.appendChild(b);
  }
}

// ---------- efectos ----------
const FX = [
  ["echo", "Eco"], ["echoLong", "Eco largo"], ["pingpong", "Eco ping-pong"], ["reverb", "Reverb"],
  ["hall", "Sala grande"], ["filter", "Filtro"], ["hpf", "Filtro agudo"], ["wah", "Wah"],
  ["dist", "Distorsión"], ["fuzz", "Fuzz"], ["lofi", "Lo-fi"], ["phone", "Teléfono"],
  ["chop", "Cortes"], ["chop2", "Cortes rápidos"], ["tremolo", "Trémolo"], ["pan", "Paneo"],
  ["flanger", "Flanger"], ["robot", "Robot"], ["bassUp", "Más graves"], ["trebleUp", "Más agudos"],
].map(([key, name], i) => ({ key, name, color: ["red", "yellow", "green", "blue"][i % 4] }));
function renderFx() {
  const box = $("#fx");
  FX.forEach((f) => {
    const b = makePad(f.name, f.color, () => {
      const on = !b.classList.contains("on");
      b.classList.toggle("on", on);
      Engine.setFx(f.key, on);
    });
    box.appendChild(b);
  });
}

// ---------- controles ----------
$("#bpm").addEventListener("input", (e) => {
  const v = Number(e.target.value);
  $("#bpmVal").textContent = v;
  Engine.setBpm(v);
});
$("#vol").addEventListener("input", (e) => Engine.setVolume(e.target.value / 100));
$("#stopAll").addEventListener("click", () => Engine.stopAll());
// Pantalla completa: al abrirla desde un acceso directo se oculta la barra del navegador.
function goFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req && !document.fullscreenElement && !window.matchMedia("(display-mode: standalone)").matches) {
    try { const p = req.call(el); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
}
$("#startBtn").addEventListener("click", () => {
  Engine.init();
  goFullscreen();
  $("#start").classList.add("hide");
});
$("#full").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else goFullscreen();
});

// ---------- grabaciones (se guardan en el propio dispositivo) ----------
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open("colorbeat", 2);
      r.onupgradeneeded = () => {
        const names = r.result.objectStoreNames;
        if (!names.contains("recs")) r.result.createObjectStore("recs", { keyPath: "id", autoIncrement: true });
        if (!names.contains("voices")) r.result.createObjectStore("voices", { keyPath: "slot" });
      };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(mode) { return this.db.transaction("recs", mode).objectStore("recs"); },
  all() { return new Promise((res) => { const r = this.tx("readonly").getAll(); r.onsuccess = () => res(r.result); }); },
  add(rec) { return new Promise((res) => { const r = this.tx("readwrite").add(rec); r.onsuccess = () => res(r.result); }); },
  del(id) { return new Promise((res) => { const r = this.tx("readwrite").delete(id); r.onsuccess = () => res(); }); },
  vx(mode) { return this.db.transaction("voices", mode).objectStore("voices"); },
  allVoices() { return new Promise((res) => { const r = this.vx("readonly").getAll(); r.onsuccess = () => res(r.result); }); },
  putVoice(slot, blob) { return new Promise((res) => { const r = this.vx("readwrite").put({ slot, blob }); r.onsuccess = () => res(); }); },
  delVoice(slot) { return new Promise((res) => { const r = this.vx("readwrite").delete(slot); r.onsuccess = () => res(); }); },
};

let recorder = null, chunks = [];
function pickMime() {
  const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return opts.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
}
$("#rec").addEventListener("click", () => {
  const btn = $("#rec");
  if (recorder && recorder.state === "recording") { recorder.stop(); return; }
  if (!window.MediaRecorder) { alert("Este navegador no permite grabar. Prueba con Chrome o Safari actualizados."); return; }
  const mime = pickMime();
  recorder = new MediaRecorder(Engine.stream, mime ? { mimeType: mime } : undefined);
  chunks = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = async () => {
    btn.classList.remove("on");
    btn.textContent = "● Grabar";
    const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
    const d = new Date();
    const name = `ColorBeat ${current.name} ${d.toLocaleDateString("es-ES")} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
    await DB.add({ name, blob, date: d.toISOString() });
    renderRecs();
  };
  recorder.start();
  btn.classList.add("on");
  btn.textContent = "■ Parar grabación";
});

function extFor(type) { return type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm"; }
async function renderRecs() {
  const list = $("#recs");
  const recs = (await DB.all()).reverse();
  list.innerHTML = recs.length ? "" : '<li class="empty">Todavía no hay grabaciones. Pulsa ● Grabar y toca.</li>';
  for (const r of recs) {
    const li = document.createElement("li");
    const url = URL.createObjectURL(r.blob);
    const file = `${r.name.replace(/[\/:]/g, "-")}.${extFor(r.blob.type)}`;
    li.innerHTML = `<div class="name"></div><audio controls src="${url}"></audio>`;
    li.querySelector(".name").textContent = r.name;
    const dl = document.createElement("a");
    dl.className = "btn"; dl.textContent = "⬇ Descargar"; dl.href = url; dl.download = file;
    li.appendChild(dl);
    const f = new File([r.blob], file, { type: r.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      const sh = document.createElement("button");
      sh.className = "btn"; sh.textContent = "↗ Compartir";
      sh.onclick = () => navigator.share({ files: [f], title: r.name }).catch(() => {});
      li.appendChild(sh);
    }
    const del = document.createElement("button");
    del.className = "btn"; del.textContent = "🗑 Borrar";
    del.onclick = async () => { if (confirm("¿Borrar esta grabación?")) { await DB.del(r.id); renderRecs(); } };
    li.appendChild(del);
    list.appendChild(li);
  }
}

// ---------- arranque ----------
selectStyle(localStorage.getItem("colorbeat.style") in STYLES ? localStorage.getItem("colorbeat.style") : "hiphop");
renderFx();
applyStyleFx();
renderPhrasePads();
renderVoicePads();
if ("speechSynthesis" in window) speechSynthesis.getVoices();
animate();
DB.open().then(() => { renderRecs(); loadVoices(); }).catch(() => { $("#recs").innerHTML = '<li class="empty">No se pueden guardar grabaciones en este navegador.</li>'; });

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
