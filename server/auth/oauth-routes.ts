import { Express, RequestHandler } from "express";
import passport from "passport";
import session from "express-session";
import connectPg from "connect-pg-simple";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { setupOAuthProviders, getConfiguredProviders, findOrCreateUser, generateAppleClientSecret } from "./oauth-providers";
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
  const APP_URL = process.env.APP_URL 
    || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");

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

  // Debug endpoint to show callback URLs and Apple config diagnostics
  app.get("/api/auth/debug", (req, res) => {
    const DEBUG_APP_URL = process.env.APP_URL 
      || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
    
    const appleClientId = process.env.APPLE_CLIENT_ID || "";
    const appleTeamId = process.env.APPLE_TEAM_ID || "";
    const appleKeyId = process.env.APPLE_KEY_ID || "";
    const applePrivateKey = process.env.APPLE_PRIVATE_KEY || "";
    
    let clientSecretTest = "not_attempted";
    try {
      const secret = generateAppleClientSecret();
      clientSecretTest = `success (length: ${secret.length})`;
    } catch (e: any) {
      clientSecretTest = `FAILED: ${e.message}`;
    }
    
    res.json({
      appUrl: DEBUG_APP_URL,
      callbacks: {
        google: `${DEBUG_APP_URL}/api/auth/google/callback`,
        github: `${DEBUG_APP_URL}/api/auth/github/callback`,
        apple: `${DEBUG_APP_URL}/api/auth/apple/callback`,
      },
      providers: getConfiguredProviders(),
      apple: {
        clientId: appleClientId,
        teamId: appleTeamId,
        keyId: appleKeyId,
        privateKeyLength: applePrivateKey.length,
        privateKeyStart: applePrivateKey.substring(0, 30) + "...",
        privateKeyContainsBeginMarker: applePrivateKey.includes("BEGIN"),
        privateKeyContainsNewlines: applePrivateKey.includes("\n"),
        clientSecretTest,
        authUrl: `https://appleid.apple.com/auth/authorize?client_id=${encodeURIComponent(appleClientId)}&redirect_uri=${encodeURIComponent(DEBUG_APP_URL + '/api/auth/apple/callback')}&response_type=code%20id_token&response_mode=form_post&scope=name%20email`,
      },
      env: {
        hasReplitDevDomain: !!process.env.REPLIT_DEV_DOMAIN,
        replitDevDomain: process.env.REPLIT_DEV_DOMAIN,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  });

  // Google OAuth diagnostic - shows the exact URL that would be used
  app.get("/api/auth/google/debug-url", (req, res) => {
    const GOOGLE_DEBUG_URL = process.env.APP_URL 
      || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const callbackUrl = `${GOOGLE_DEBUG_URL}/api/auth/google/callback`;
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

  // Google OAuth routes - manual implementation for better error handling
  const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const googleCallbackUrl = `${APP_URL}/api/auth/google/callback`;
  console.log("[oauth-routes] Google Client ID source:", process.env.GOOGLE_OAUTH_CLIENT_ID ? 'GOOGLE_OAUTH_CLIENT_ID' : process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_ID ? 'SOCIAL_MEDIA_GOOGLE_CLIENT_ID' : 'GOOGLE_CLIENT_ID');
  console.log("[oauth-routes] Google Client Secret source:", process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_SECRET ? 'SOCIAL_MEDIA_GOOGLE_CLIENT_SECRET' : 'GOOGLE_CLIENT_SECRET');
  console.log("[oauth-routes] Google Client Secret length:", googleClientSecret?.length);

  app.get("/api/auth/google", (req, res) => {
    console.log("[oauth] Starting manual Google OAuth flow");
    const state = Math.random().toString(36).substring(2);
    (req.session as any).googleOAuthState = state;
    
    // Use minimal parameters to avoid 403
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId || '')}&redirect_uri=${encodeURIComponent(googleCallbackUrl)}&response_type=code&scope=openid%20email%20profile&state=${state}`;
    console.log("[oauth] Redirecting to Google:", authUrl);
    res.redirect(authUrl);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    console.log("[oauth] Google callback received, query:", JSON.stringify(req.query));
    
    const { code, error, error_description } = req.query;
    
    if (error) {
      console.error("[oauth] Google returned error:", error, error_description);
      return res.redirect(`/?error=google_auth_failed&detail=${encodeURIComponent(String(error_description || error))}`);
    }
    
    if (!code) {
      console.error("[oauth] No authorization code received");
      return res.redirect("/?error=google_auth_failed&detail=no_code");
    }
    
    try {
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: googleClientId || '',
          client_secret: googleClientSecret || '',
          redirect_uri: googleCallbackUrl,
          grant_type: 'authorization_code',
        }),
      });
      
      const tokenData = await tokenResponse.json();
      console.log("[oauth] Token response status:", tokenResponse.status);
      
      if (!tokenResponse.ok) {
        console.error("[oauth] Token exchange failed:", tokenData);
        return res.redirect(`/?error=google_auth_failed&detail=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
      }
      
      // Get user info
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      
      const userInfo = await userInfoResponse.json();
      console.log("[oauth] Google user info:", JSON.stringify(userInfo));
      
      // Find or create user
      const user = await findOrCreateUser({
        id: userInfo.id,
        provider: "google",
        email: userInfo.email,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        profileImageUrl: userInfo.picture,
      });
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("[oauth] Login error:", err);
          return res.redirect("/?error=google_auth_failed&detail=login_error");
        }
        console.log("[oauth] Google auth successful, user:", user.id);
        res.redirect("/");
      });
    } catch (err) {
      console.error("[oauth] Google OAuth error:", err);
      res.redirect("/?error=google_auth_failed&detail=server_error");
    }
  });

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

  // Apple OAuth routes - manual implementation (no passport-apple)
  app.get("/api/auth/apple", (req, res) => {
    console.log("[oauth] Starting manual Apple OAuth flow");
    const clientId = process.env.APPLE_CLIENT_ID!;
    const callbackUrl = `${APP_URL}/api/auth/apple/callback`;
    const state = Math.random().toString(36).substring(2);
    (req.session as any).appleOAuthState = state;
    
    console.log("[oauth] Apple client_id:", clientId);
    console.log("[oauth] Apple redirect_uri:", callbackUrl);
    
    // Test that we can generate a client secret (validates the private key)
    try {
      const testSecret = generateAppleClientSecret();
      console.log("[oauth] Apple client secret generated successfully, length:", testSecret.length);
    } catch (e: any) {
      console.error("[oauth] Apple client secret generation FAILED:", e.message);
      return res.redirect(`/?error=apple_auth_failed&message=${encodeURIComponent('client_secret_generation_failed: ' + e.message)}`);
    }
    
    const authUrl = `https://appleid.apple.com/auth/authorize?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state: state,
    }).toString();
    
    console.log("[oauth] Apple auth URL:", authUrl);
    res.redirect(authUrl);
  });

  // Apple may redirect with GET for errors
  app.get("/api/auth/apple/callback", (req, res) => {
    console.log("[oauth] Apple GET callback received (error redirect)");
    console.log("[oauth] Apple GET query:", JSON.stringify(req.query));
    const error = req.query.error || "unknown_error";
    res.redirect(`/?error=apple_auth_failed&message=${encodeURIComponent(String(error))}`);
  });

  app.post("/api/auth/apple/callback", async (req, res) => {
    try {
      console.log("[oauth] Apple callback received");
      console.log("[oauth] Apple callback body keys:", Object.keys(req.body || {}));
      
      const { code, id_token, user: userJson, state, error: appleError } = req.body || {};
      
      if (appleError) {
        console.error("[oauth] Apple returned error:", appleError);
        return res.redirect(`/?error=apple_auth_failed&message=${encodeURIComponent(appleError)}`);
      }
      
      if (!code) {
        console.error("[oauth] No authorization code from Apple");
        return res.redirect("/?error=apple_auth_failed&message=no_authorization_code");
      }
      
      console.log("[oauth] Apple code length:", code.length);
      console.log("[oauth] Apple id_token present:", !!id_token);
      console.log("[oauth] Apple user JSON present:", !!userJson);
      
      // Parse user info (Apple only sends this on first authorization)
      let appleUserInfo: any = {};
      if (userJson) {
        try {
          appleUserInfo = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
          console.log("[oauth] Apple user info:", JSON.stringify(appleUserInfo));
        } catch (e) {
          console.log("[oauth] Could not parse Apple user JSON");
        }
      }
      
      // Generate client secret for token exchange
      const clientSecret = generateAppleClientSecret();
      const clientId = process.env.APPLE_CLIENT_ID!;
      const callbackUrl = `${APP_URL}/api/auth/apple/callback`;
      
      // Exchange code for tokens
      console.log("[oauth] Exchanging Apple code for tokens...");
      const tokenResponse = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: callbackUrl,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      console.log("[oauth] Apple token response status:", tokenResponse.status);
      
      if (!tokenResponse.ok) {
        console.error("[oauth] Apple token exchange failed:", JSON.stringify(tokenData));
        return res.redirect(`/?error=apple_auth_failed&message=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`);
      }
      
      // Decode the id_token (use the one from token response, or the one from the callback)
      const idTokenToUse = tokenData.id_token || id_token;
      if (!idTokenToUse) {
        console.error("[oauth] No id_token available");
        return res.redirect("/?error=apple_auth_failed&message=no_id_token");
      }
      
      const decoded: any = jwt.decode(idTokenToUse);
      console.log("[oauth] Apple decoded token - sub:", decoded?.sub, "email:", decoded?.email);
      
      if (!decoded?.sub) {
        console.error("[oauth] No sub in Apple id_token");
        return res.redirect("/?error=apple_auth_failed&message=invalid_token");
      }
      
      // Extract user info
      const email = decoded.email;
      const firstName = appleUserInfo?.name?.firstName || "Apple";
      const lastName = appleUserInfo?.name?.lastName || "User";
      
      console.log("[oauth] Apple user - email:", email, "sub:", decoded.sub, "name:", firstName, lastName);
      
      // Find or create user
      const user = await findOrCreateUser({
        id: decoded.sub,
        provider: "apple",
        email: email,
        firstName: firstName,
        lastName: lastName,
        profileImageUrl: undefined,
      });
      
      console.log("[oauth] Apple user created/found:", user.id);
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("[oauth] Apple login session error:", err);
          return res.redirect("/?error=apple_auth_failed&message=session_error");
        }
        console.log("[oauth] Apple auth successful!");
        res.redirect("/");
      });
    } catch (err: any) {
      console.error("[oauth] Apple OAuth error:", err);
      res.redirect(`/?error=apple_auth_failed&message=${encodeURIComponent(err.message || 'server_error')}`);
    }
  });

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

  // Demo login endpoint
  app.post("/api/auth/demo-login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const [demoUser] = await db.select().from(users).where(eq(users.username, username));
      if (!demoUser || !demoUser.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, demoUser.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { password: _pw, ...safeUser } = demoUser;
      req.login(safeUser, (err) => {
        if (err) {
          console.error("[auth] Demo login session error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        res.json({ success: true, user: safeUser });
      });
    } catch (err: any) {
      console.error("[auth] Demo login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  console.log("[oauth] OAuth routes configured");
  console.log("[oauth] Available providers:", getConfiguredProviders());
}

export async function seedDemoAccount() {
  try {
    const [existing] = await db.select().from(users).where(eq(users.username, "demo"));
    if (existing) {
      console.log("[auth] Demo account already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("demo1234", 10);
    await db.insert(users).values({
      username: "demo",
      email: "demo@medicineandmoney.show",
      firstName: "Demo",
      lastName: "User",
      provider: "local",
      providerId: "demo",
      password: hashedPassword,
    });
    console.log("[auth] Demo account created (username: demo, password: demo1234)");
  } catch (err) {
    console.error("[auth] Failed to seed demo account:", err);
  }
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
