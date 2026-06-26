const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 5173;
const root = __dirname;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[\/\\])+/, "");
  const finalPath = path.join(root, normalized === "/" ? "index.html" : normalized);
  if (!finalPath.startsWith(root)) return path.join(root, "index.html");
  return finalPath;
}

const server = http.createServer((req, res) => {
  let filePath = safePath(req.url);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(root, "index.html");
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": mime[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`AURA running at http://localhost:${port}`);
});
