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
  
  // Determine if we're on HTTPS (Replit always uses HTTPS)
  const isHttps = !!process.env.REPLIT_DEV_DOMAIN || process.env.NODE_ENV === "production";
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax", // Required for cross-origin OAuth callbacks
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

  // Debug endpoint to show callback URLs (only in development)
  app.get("/api/auth/debug", (req, res) => {
    const APP_URL = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.APP_URL || "http://localhost:5000";
    
    res.json({
      appUrl: APP_URL,
      callbacks: {
        google: `${APP_URL}/api/auth/google/callback`,
        github: `${APP_URL}/api/auth/github/callback`,
        apple: `${APP_URL}/api/auth/apple/callback`,
      },
      providers: getConfiguredProviders(),
      env: {
        hasReplitDevDomain: !!process.env.REPLIT_DEV_DOMAIN,
        replitDevDomain: process.env.REPLIT_DEV_DOMAIN,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  });

  // Google OAuth diagnostic - shows the exact URL that would be used
  app.get("/api/auth/google/debug-url", (req, res) => {
    const APP_URL = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.APP_URL || "http://localhost:5000";
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const callbackUrl = `${APP_URL}/api/auth/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId || '')}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent('profile email')}`;
    res.json({
      clientId: clientId ? `${clientId.substring(0, 20)}...${clientId.substring(clientId.length - 20)}` : 'NOT SET',
      clientIdLength: clientId?.length,
      callbackUrl,
      authUrl,
      instructions: [
        "1. In Google Cloud Console > APIs & Services > Credentials, find this OAuth client",
        `2. Add this EXACT redirect URI: ${callbackUrl}`,
        "3. Go to OAuth consent screen > Set to 'External'",
        "4. If app is in 'Testing' mode, add your email as a test user",
        "5. Enable 'Google People API' in APIs & Services > Library",
      ]
    });
  });

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    console.log("[oauth] Starting Google OAuth flow");
    next();
  }, passport.authenticate("google", { 
    scope: ["openid", "profile", "email"],
    accessType: "online",
    prompt: "consent"
  })
  );

  app.get("/api/auth/google/callback", (req, res, next) => {
    console.log("[oauth] Google callback received");
    next();
  },
    passport.authenticate("google", { 
      failureRedirect: "/?error=google_auth_failed",
      failureMessage: true 
    }),
    (req, res) => {
      console.log("[oauth] Google auth successful, user:", req.user);
      res.redirect("/");
    }
  );

  // Facebook OAuth routes
  app.get("/api/auth/facebook", (req, res, next) => {
    console.log("[oauth] Starting Facebook OAuth flow");
    next();
  }, passport.authenticate("facebook", { scope: ["email"] })
  );

  app.get("/api/auth/facebook/callback", (req, res, next) => {
    console.log("[oauth] Facebook callback received");
    next();
  },
    passport.authenticate("facebook", { 
      failureRedirect: "/?error=facebook_auth_failed",
      failureMessage: true 
    }),
    (req, res) => {
      console.log("[oauth] Facebook auth successful, user:", req.user);
      res.redirect("/");
    }
  );

  // GitHub OAuth routes
  app.get("/api/auth/github", (req, res, next) => {
    console.log("[oauth] Starting GitHub OAuth flow");
    next();
  }, passport.authenticate("github", { scope: ["user:email"] })
  );

  app.get("/api/auth/github/callback", (req, res, next) => {
    console.log("[oauth] GitHub callback received");
    next();
  },
    passport.authenticate("github", { 
      failureRedirect: "/?error=github_auth_failed",
      failureMessage: true 
    }),
    (req, res) => {
      console.log("[oauth] GitHub auth successful, user:", req.user);
      res.redirect("/");
    }
  );

  // Apple OAuth routes
  app.get("/api/auth/apple", (req, res, next) => {
    console.log("[oauth] Starting Apple OAuth flow");
    next();
  }, passport.authenticate("apple")
  );

  app.post("/api/auth/apple/callback", (req, res, next) => {
    console.log("[oauth] Apple callback received");
    next();
  },
    passport.authenticate("apple", { 
      failureRedirect: "/?error=apple_auth_failed",
      failureMessage: true 
    }),
    (req, res) => {
      console.log("[oauth] Apple auth successful, user:", req.user);
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
