const http = require("http");
const express = require("express");

const app = express();
const httpServer = http.createServer(app);

const port = parseInt(process.env.PORT || "5000", 10);

app.get("/", (_req: any, res: any) => {
  res.status(200).send("ok");
});

httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
  console.log(`[startup] Listening on port ${port}, loading application...`);

  setTimeout(async () => {
    try {
      const mod = require("./app.cjs");
      const initApp = mod.initApp;
      if (!initApp) {
        throw new Error("Could not find initApp export from app.cjs");
      }
      await initApp(httpServer, app);
      console.log(`[startup] Application fully initialized`);
    } catch (err) {
      console.error("[startup] Failed to initialize application:", err);
      process.exit(1);
    }
  }, 100);
});
