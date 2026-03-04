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
const publicDir = path.resolve(__dirname, "public");

try {
  const p = path.resolve(publicDir, "index.html");
  if (fs.existsSync(p)) {
    indexHtml = fs.readFileSync(p, "utf-8");
    console.log("[startup] index.html loaded (" + indexHtml.length + " bytes)");
  } else {
    console.log("[startup] WARNING: No index.html found at " + p);
  }
} catch (e: any) {
  console.log("[startup] Error reading index.html:", e.message);
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".map": "application/json",
};

function serveStaticFile(pathname: string, res: any): boolean {
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) return false;

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const body = fs.readFileSync(filePath);
      const cacheControl = pathname.includes("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": body.length,
        "Cache-Control": cacheControl,
      });
      res.end(body);
      return true;
    }
  } catch {}
  return false;
}

const server = http.createServer((req: any, res: any) => {
  try {
    const rawUrl = req.url || "/";
    const pathname = rawUrl.split("?")[0].replace(/\/+$/, "") || "/";

    if (req.method === "GET" && pathname === "/__health") {
      res.writeHead(200, { "Content-Type": "text/plain", "Content-Length": 2 });
      res.end("ok");
      return;
    }

    if (expressApp) {
      expressApp(req, res);
      return;
    }

    if (req.method === "GET") {
      if (serveStaticFile(pathname, res)) return;

      if (!pathname.startsWith("/api/")) {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": Buffer.byteLength(indexHtml),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        });
        res.end(indexHtml);
        return;
      }
    }

    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Application is starting, please wait..." }));
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
  console.log(`[startup] Static files + health checks responding immediately`);

  loadApp();
});

async function loadApp() {
  try {
    console.log("[startup] Beginning async app load via dynamic import()...");
    const t0 = Date.now();

    console.log("[startup] Importing express...");
    const expressModule = await import("express");
    const express = expressModule.default || expressModule;
    console.log(`[startup] express loaded in ${Date.now() - t0}ms`);

    console.log("[startup] Importing app bundle (app.mjs)...");
    const t1 = Date.now();
    const appModule = await import("./app.mjs");
    console.log(`[startup] app.mjs loaded in ${Date.now() - t1}ms`);

    console.log("[startup] Initializing app...");
    const app = express();

    app.get("/__health", (_req: any, res: any) => {
      res.status(200).send("ok");
    });

    if (!appModule.initApp) {
      console.error("[startup] FATAL: initApp not exported from app.mjs");
      return;
    }

    await appModule.initApp(server, app);
    expressApp = app;
    console.log(`[startup] Application fully initialized in ${Date.now() - t0}ms`);
  } catch (err: any) {
    console.error("[startup] INIT ERROR:", err);
  }
}
