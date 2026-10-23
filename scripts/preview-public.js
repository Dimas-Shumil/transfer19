"use strict";
// Временный сервер для вёрстки: НЕ запускает Prisma/backend и не обрабатывает заявки.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PREVIEW_PORT || 4173);
const types = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"application/javascript; charset=utf-8", ".webp":"image/webp", ".svg":"image/svg+xml", ".png":"image/png", ".webmanifest":"application/manifest+json" };
http.createServer((req,res) => {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = new URL(req.url, `http://127.0.0.1:${port}`).pathname; }
  catch { res.writeHead(400); res.end(); return; }
  let relative = "";
  if (["/manifest.webmanifest", "/pwa-sw.js", "/offline.html"].includes(pathname)) relative = pathname.slice(1);
  else if (pathname === "/" || pathname === "/index.html") relative = "public/index.html";
  else if (/^\/(autopark|car)\.html$/.test(pathname)) relative = `public/${pathname.slice(1)}`;
  else if (/^\/components\/(header|footer)\.html$/.test(pathname)) relative = pathname.slice(1);
  else if (/^\/site\/(css|scripts|img)\/[\w.-]+$/.test(pathname)) relative = pathname.slice(1);
  else { res.writeHead(404, {"Content-Type":"text/plain; charset=utf-8"}); res.end("Страница пока не создана"); return; }
  const file = path.join(root, relative);
  fs.readFile(file, (error,content) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(req.method === "HEAD" ? undefined : content);
  });
}).listen(port, "127.0.0.1", () => console.log(`Комфорт Сибири — превью: http://127.0.0.1:${port}`));
