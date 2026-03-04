const http = require("http");
const path = require("path");
const fs = require("fs");

process.on("uncaughtException", (err: any) => {
  console.error("[startup] UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err: any) => {
  console.error("[startup] UNHANDLED REJECTION:", err);
});

let expressApp: any = null;
let indexHtml: string = "<!DOCTYPE html><html><head><title>Medicine &amp; Money Hub</title></head><body><p>Loading...</p></body></html>";

try {
  const p = path.resolve(__dirname, "public", "index.html");
  if (fs.existsSync(p)) {
    indexHtml = fs.readFileSync(p, "utf-8");
    console.log("[startup] index.html loaded (" + indexHtml.length + " bytes)");
  } else {
    console.log("[startup] WARNING: No index.html found at " + p);
    const files = fs.readdirSync(__dirname);
    console.log("[startup] Files in __dirname:", files.join(", "));
    const publicDir = path.resolve(__dirname, "public");
    if (fs.existsSync(publicDir)) {
      const pubFiles = fs.readdirSync(publicDir);
      console.log("[startup] Files in public/:", pubFiles.join(", "));
    }
  }
} catch (e: any) {
  console.log("[startup] Error reading index.html:", e.message);
}

const server = http.createServer((req: any, res: any) => {
  try {
    const rawUrl = req.url || "/";
    const pathname = rawUrl.split("?")[0].replace(/\/+$/, "") || "/";

    if (req.method === "GET" && (pathname === "/" || pathname === "/__health")) {
      const body = pathname === "/__health" ? "ok" : indexHtml;
      const contentType = pathname === "/__health" ? "text/plain" : "text/html; charset=utf-8";
      console.log(`[health] ${req.method} ${pathname} -> 200 (${body.length} bytes)`);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(body);
      return;
    }

    if (expressApp) {
      expressApp(req, res);
      return;
    }

    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Starting...");
  } catch (err: any) {
    console.error("[startup] REQUEST HANDLER ERROR:", err);
    try {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain" });
      }
      res.end("Internal Server Error");
    } catch {}
  }
});

server.on("error", (err: any) => {
  console.error("[startup] SERVER ERROR:", err);
});

const port = parseInt(process.env.PORT || "5000", 10);

server.listen(port, "0.0.0.0", () => {
  console.log(`[startup] Server listening on 0.0.0.0:${port}`);

  setTimeout(async () => {
    try {
      console.log("[startup] Loading express...");
      const express = require("express");
      console.log("[startup] Loading app bundle...");
      const appModule = require("./app.cjs");
      console.log("[startup] Initializing app...");

      const app = express();

      app.get("/__health", (_req: any, res: any) => {
        res.status(200).send("ok");
      });

      if (!appModule.initApp) {
        console.error("[startup] FATAL: initApp not exported from app.cjs");
        return;
      }

      await appModule.initApp(server, app);
      expressApp = app;
      console.log("[startup] Application fully initialized");
    } catch (err: any) {
      console.error("[startup] INIT ERROR:", err);
    }
  }, 1000);
});
