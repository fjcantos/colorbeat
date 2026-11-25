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
  const loops = $("#loops"), hits = $("#hits");
  loops.innerHTML = ""; hits.innerHTML = "";
  current.loops.forEach((l, i) => loops.appendChild(makePad(l.name, l.color, () => Engine.toggleLoop(i))));
  current.hits.forEach((h) => hits.appendChild(makePad(h.name, h.color, (b) => { Engine.hit(h.voice); flash(b); })));
  updateLoopPads();
}
function updateLoopPads() {
  const states = Engine.states;
  [...$("#loops").children].forEach((b, i) => {
    b.classList.toggle("on", states[i] === "on");
    b.classList.toggle("waiting", states[i] === "waiting");
  });
}
Engine.on((e) => { if (e.type === "loops") updateLoopPads(); });

function animate() {
  if (current) {
    [...$("#loops").children].forEach((b, i) => {
      b.querySelector(".prog").style.width = (Engine.loopProgress(i) * 100).toFixed(1) + "%";
    });
  }
  requestAnimationFrame(animate);
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
$("#startBtn").addEventListener("click", () => {
  Engine.init();
  $("#start").classList.add("hide");
});

// ---------- grabaciones (se guardan en el propio dispositivo) ----------
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open("colorbeat", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("recs", { keyPath: "id", autoIncrement: true });
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  tx(mode) { return this.db.transaction("recs", mode).objectStore("recs"); },
  all() { return new Promise((res) => { const r = this.tx("readonly").getAll(); r.onsuccess = () => res(r.result); }); },
  add(rec) { return new Promise((res) => { const r = this.tx("readwrite").add(rec); r.onsuccess = () => res(r.result); }); },
  del(id) { return new Promise((res) => { const r = this.tx("readwrite").delete(id); r.onsuccess = () => res(); }); },
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
animate();
DB.open().then(renderRecs).catch(() => { $("#recs").innerHTML = '<li class="empty">No se pueden guardar grabaciones en este navegador.</li>'; });

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
