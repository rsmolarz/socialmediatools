const http = require("http");
const path = require("path");
const fs = require("fs");

let expressApp: any = null;
let indexHtml: string = "<!DOCTYPE html><html><head><title>Loading</title></head><body>Loading...</body></html>";

try {
  const p = path.resolve(__dirname, "public", "index.html");
  if (fs.existsSync(p)) {
    indexHtml = fs.readFileSync(p, "utf-8");
    console.log("[startup] index.html loaded (" + indexHtml.length + " bytes)");
  } else {
    console.log("[startup] No index.html found at " + p);
  }
} catch (e: any) {
  console.log("[startup] Error reading index.html:", e.message);
}

const server = http.createServer((req: any, res: any) => {
  const url = req.url || "/";
  const pathname = url.split("?")[0];

  if (req.method === "GET" && (pathname === "/" || pathname === "/__health")) {
    console.log(`[health] ${req.method} ${pathname} -> 200`);
    res.writeHead(200, {
      "Content-Type": pathname === "/__health" ? "text/plain" : "text/html",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end(pathname === "/__health" ? "ok" : indexHtml);
    return;
  }

  if (expressApp) {
    expressApp(req, res);
    return;
  }

  console.log(`[startup] ${req.method} ${pathname} -> 503 (app not ready)`);
  res.writeHead(503, { "Content-Type": "text/plain" });
  res.end("Starting...");
});

const port = parseInt(process.env.PORT || "5000", 10);

server.listen(port, "0.0.0.0", () => {
  console.log(`[startup] Server listening on port ${port}`);

  function loadApp() {
    console.log("[startup] Loading express...");
    const express = require("express");
    console.log("[startup] Express loaded, loading app bundle...");
    const appModule = require("./app.cjs");
    console.log("[startup] App bundle loaded, initializing...");

    const app = express();
    app.get("/__health", (_req: any, res: any) => {
      res.status(200).send("ok");
    });

    if (!appModule.initApp) {
      console.error("[startup] initApp not found in app.cjs");
      return;
    }

    appModule.initApp(server, app).then(() => {
      expressApp = app;
      console.log("[startup] Application fully initialized");
    }).catch((err: any) => {
      console.error("[startup] initApp failed:", err);
    });
  }

  setTimeout(loadApp, 3000);
});
