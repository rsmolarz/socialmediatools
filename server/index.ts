import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupSwagger } from "./swagger";
import { setupWebSocket } from "./websocket";
import path from "path";

import { alertMiddleware } from "./middleware/alert-middleware";
import { loggingService } from "./lib/logging-service";
import {
    CreateThumbnailSchema,
    UpdateThumbnailSchema,
    ExportThumbnailSchema,
    BatchThumbnailSchema,
    ThumbnailQuerySchema,
    type CreateThumbnailInput,
    type UpdateThumbnailInput,
    type ExportThumbnailInput,
} from '../shared/schemas/validation';
import { PLATFORM_PRESETS } from '../shared/types/thumbnail';

const app = express();
const httpServer = createServer(app);

setupWebSocket(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

let appReady = false;

app.use((req, res, next) => {
  if (!appReady && req.method === "GET" && (req.path === "/" || req.path === "/__healthcheck")) {
    return res.status(200).send("ok");
  }
  if (!appReady && !req.path.startsWith("/api/status")) {
    return res.status(503).send("Server starting...");
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`serving on port ${port}`);
  },
);

(async () => {
  setupSwagger(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  app.use(alertMiddleware.middleware());

  app.use('/.well-known', express.static(path.join(process.cwd(), 'client', 'public', '.well-known'), {
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'text/plain');
    }
  }));

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  appReady = true;
  log("Application fully initialized");
})();
