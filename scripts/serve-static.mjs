// Minimal dependency-free static server for the exported site (used by e2e tests and `npm start`).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "out");
const port = Number(process.env.PORT ?? process.argv[3] ?? 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".txt": "text/plain" };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    let file = path.join(root, p);
    if (!file.startsWith(root)) throw new Error("traversal");
    const s = await stat(file).catch(() => null);
    if (s?.isDirectory()) file = path.join(file, "index.html");
    else if (!s) file = (await stat(file + ".html").catch(() => null)) ? file + ".html" : path.join(root, "404.html");
    const body = await readFile(file);
    res.writeHead(file.endsWith("404.html") && !p.endsWith("404.html") ? 404 : 200, {
      "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=(self)",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
