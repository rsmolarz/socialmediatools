const http = require("http");

let expressApp: any = null;
let indexHtml: string = "ok";

function getPathname(rawUrl: string): string {
  const qIdx = rawUrl.indexOf("?");
  return qIdx === -1 ? rawUrl : rawUrl.substring(0, qIdx);
}

const server = http.createServer((req: any, res: any) => {
  const pathname = getPathname(req.url || "/");

  if (req.method === "GET" && (pathname === "/" || pathname === "/__health")) {
    res.writeHead(200, {
      "Content-Type": pathname === "/" ? "text/html" : "text/plain",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    res.end(pathname === "/" ? indexHtml : "ok");
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
  console.log(`[startup] Listening on port ${port}, health checks active`);

  setTimeout(async () => {
    try {
      const path = require("path");
      const fs = require("fs");

      try {
        const p = path.resolve(__dirname, "public", "index.html");
        if (fs.existsSync(p)) indexHtml = fs.readFileSync(p, "utf-8");
      } catch {}

      console.log("[startup] Loading application modules...");
      const express = require("express");
      const appModule = require("./app.cjs");
      console.log("[startup] Modules loaded, initializing app...");

      const app = express();
      app.get("/__health", (_req: any, res: any) => {
        res.status(200).send("ok");
      });

      if (!appModule.initApp) throw new Error("initApp not found");
      await appModule.initApp(server, app);
      expressApp = app;
      console.log("[startup] Application fully initialized");
    } catch (err) {
      console.error("[startup] Failed to initialize:", err);
    }
  }, 2000);
});
