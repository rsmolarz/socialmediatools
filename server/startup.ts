const http = require("http");
const path = require("path");
const fs = require("fs");

let expressApp: any = null;
let indexHtml: string = "<html><body>Loading...</body></html>";

try {
  const p = path.resolve(__dirname, "public", "index.html");
  if (fs.existsSync(p)) indexHtml = fs.readFileSync(p, "utf-8");
} catch {}

console.log("[startup] Pre-loading modules...");
const express = require("express");
const appModule = require("./app.cjs");
console.log("[startup] Modules loaded");

function getPathname(rawUrl: string): string {
  const qIdx = rawUrl.indexOf("?");
  return qIdx === -1 ? rawUrl : rawUrl.substring(0, qIdx);
}

const server = http.createServer((req: any, res: any) => {
  const pathname = getPathname(req.url || "/");

  if (req.method === "GET" && (pathname === "/" || pathname === "/__health")) {
    if (pathname === "/__health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
    } else {
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(indexHtml);
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
  console.log(`[startup] Listening on port ${port}`);

  setImmediate(async () => {
    try {
      const app = express();

      app.get("/__health", (_req: any, res: any) => {
        res.status(200).send("ok");
      });

      if (!appModule.initApp) throw new Error("initApp not found in app.cjs");
      await appModule.initApp(server, app);
      expressApp = app;
      console.log(`[startup] Application fully initialized`);
    } catch (err) {
      console.error("[startup] Failed to initialize:", err);
    }
  });
});
