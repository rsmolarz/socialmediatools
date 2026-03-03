const http = require("http");

let expressApp: any = null;

const server = http.createServer((req: any, res: any) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
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
