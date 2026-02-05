import { Express, RequestHandler } from "express";
import passport from "passport";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { setupOAuthProviders, getConfiguredProviders } from "./oauth-providers";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

export function getOAuthSession(): RequestHandler {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export function setupOAuthRoutes(app: Express) {
  // Initialize session and passport
  app.set("trust proxy", 1);
  app.use(getOAuthSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize/deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      done(null, result[0] || null);
    } catch (error) {
      done(error);
    }
  });

  // Setup OAuth providers
  setupOAuthProviders();

  // Get available providers
  app.get("/api/auth/providers", (req, res) => {
    res.json({ providers: getConfiguredProviders() });
  });

  // Google OAuth routes
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/?error=google_auth_failed" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Facebook OAuth routes
  app.get("/api/auth/facebook",
    passport.authenticate("facebook", { scope: ["email"] })
  );

  app.get("/api/auth/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/?error=facebook_auth_failed" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // GitHub OAuth routes
  app.get("/api/auth/github",
    passport.authenticate("github", { scope: ["user:email"] })
  );

  app.get("/api/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/?error=github_auth_failed" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Apple OAuth routes
  app.get("/api/auth/apple",
    passport.authenticate("apple")
  );

  app.post("/api/auth/apple/callback",
    passport.authenticate("apple", { failureRedirect: "/?error=apple_auth_failed" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Logout
  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });

  // Legacy login route - redirects to login page
  app.get("/api/login", (req, res) => {
    res.redirect("/?showLogin=true");
  });

  console.log("[oauth] OAuth routes configured");
  console.log("[oauth] Available providers:", getConfiguredProviders());
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
