import express, { type Request, Response, NextFunction, type Express } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { type Server } from "http";
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

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function initApp(httpServer: Server, app: Express) {
  setupWebSocket(httpServer);

  app.get("/__health", (_req: Request, res: Response) => {
    res.status(200).send("ok");
  });

  app.use(
    express.json({
      limit: '50mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (reqPath.startsWith("/api")) {
        let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

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
}

if (process.env.NODE_ENV !== "production") {
  (async () => {
    const { createServer } = await import("http");
    const devApp = express();
    const devServer = createServer(devApp);
    const port = parseInt(process.env.PORT || "5000", 10);

    await initApp(devServer, devApp);

    devServer.listen(
      { port, host: "0.0.0.0", reusePort: true },
      () => {
        log(`serving on port ${port}`);
      },
    );
  })();
}
