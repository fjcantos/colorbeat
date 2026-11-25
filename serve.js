// Servidor sencillo para probar ColorBeat en el ordenador: node serve.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5174;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(__dirname, url === "/" ? "index.html" : url);
  if (!file.startsWith(__dirname)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end("No encontrado"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`ColorBeat en http://localhost:${PORT}`));
