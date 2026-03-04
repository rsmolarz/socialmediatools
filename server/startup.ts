const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");

let expressApp: any = null;
let cachedIndexHtml: string | null = null;

function getIndexHtml(): string | null {
  if (cachedIndexHtml) return cachedIndexHtml;
  try {
    const indexPath = path.resolve(__dirname, "public", "index.html");
    if (fs.existsSync(indexPath)) {
      cachedIndexHtml = fs.readFileSync(indexPath, "utf-8");
      return cachedIndexHtml;
    }
  } catch {}
  return null;
}

const server = http.createServer((req: any, res: any) => {
  const parsed = url.parse(req.url || "/");
  const pathname = parsed.pathname;

  if (req.method === "GET" && (pathname === "/" || pathname === "/__health")) {
    const html = getIndexHtml();
    if (html && pathname === "/") {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(html);
    } else {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
    }
    return;
  }
  if (expressApp) {
    expressApp(req, res);
    return;
  }
  res.writeHead(503, { "Content-Type": "text/plain" });
  res.end("Starting...");
});

const port = parseInt(process.env.PORT || "5000", 10);

server.listen(port, "0.0.0.0", () => {
  console.log(`[startup] Listening on port ${port}, loading application...`);

  setTimeout(async () => {
    console.log(`[startup] Beginning app load...`);
    try {
      const express = require("express");
      const app = express();
      const mod = require("./app.cjs");
      const initApp = mod.initApp;
      if (!initApp) {
        throw new Error("Could not find initApp export from app.cjs");
      }
      await initApp(server, app);
      expressApp = app;
      console.log(`[startup] Application fully initialized`);
    } catch (err) {
      console.error("[startup] Failed to initialize application:", err);
      process.exit(1);
    }
  }, 500);
});
