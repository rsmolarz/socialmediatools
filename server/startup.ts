const http = require("http");
const path = require("path");
const fs = require("fs");

let expressApp: any = null;
let indexHtml: string = "<html><body>Loading...</body></html>";

try {
  const p = path.resolve(__dirname, "public", "index.html");
  if (fs.existsSync(p)) indexHtml = fs.readFileSync(p, "utf-8");
} catch {}

const server = http.createServer((req: any, res: any) => {
  if (req.method === "GET" && req.url === "/__health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (expressApp) {
    expressApp(req, res);
    return;
  }

  if (req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Cache-Control": "no-cache",
    });
    res.end(indexHtml);
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
      const express = require("express");
      const app = express();

      app.get("/__health", (_req: any, res: any) => {
        res.status(200).send("ok");
      });

      const mod = require("./app.cjs");
      if (!mod.initApp) throw new Error("initApp not found in app.cjs");
      await mod.initApp(server, app);
      expressApp = app;
      console.log(`[startup] Application fully initialized`);
    } catch (err) {
      console.error("[startup] Failed to initialize:", err);
    }
  });
});
