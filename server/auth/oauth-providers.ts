import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

export function formatApplePrivateKey(key: string): string {
  let cleanKey = key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN EC PRIVATE KEY-----/g, '')
    .replace(/-----END EC PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  const lines: string[] = [];
  for (let i = 0; i < cleanKey.length; i += 64) {
    lines.push(cleanKey.substring(i, i + 64));
  }
  
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
}

export function getAppleClientId(): string {
  return process.env.APPLE_BUNDLE_ID || process.env.APPLE_CLIENT_ID || '';
}

export function generateAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = getAppleClientId();
  const keyId = process.env.APPLE_KEY_ID!;
  const privateKey = formatApplePrivateKey(process.env.APPLE_PRIVATE_KEY!);
  
  if (!clientId) {
    throw new Error("Missing APPLE_BUNDLE_ID or APPLE_CLIENT_ID");
  }
  
  console.log("[apple] Generating client secret with:", {
    teamId,
    clientId,
    keyId,
    privateKeyLength: privateKey.length,
  });
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 15777000,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };
  
  return jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    header: {
      alg: "ES256",
      kid: keyId,
    },
  });
}

interface OAuthUserData {
  id: string;
  provider: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export async function findOrCreateUser(data: OAuthUserData) {
  const existingUsers = await db.select().from(users).where(eq(users.providerId, data.id));
  
  if (existingUsers.length > 0) {
    return existingUsers[0];
  }
  
  if (data.email) {
    const emailUsers = await db.select().from(users).where(eq(users.email, data.email));
    if (emailUsers.length > 0) {
      const existingUser = emailUsers[0];
      const [updated] = await db.update(users)
        .set({
          providerId: data.id,
          provider: data.provider,
          profileImageUrl: data.profileImageUrl || existingUser.profileImageUrl,
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updated;
    }
  }

  const [newUser] = await db.insert(users).values({
    provider: data.provider,
    providerId: data.id,
    email: data.email || null,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    profileImageUrl: data.profileImageUrl || null,
    username: data.email || `${data.provider}_${data.id}`,
  }).returning();
  
  return newUser;
}

const APP_URL = process.env.APP_URL 
  || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000");

export function setupOAuthProviders() {
  console.log("[oauth] Setting up OAuth providers with APP_URL:", APP_URL);

  // Google OAuth
  const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  
  if (googleClientId && googleClientSecret) {
    const callbackURL = `${APP_URL}/api/auth/google/callback`;
    console.log("[oauth] Google Client ID length:", googleClientId.length, "ends with:", googleClientId.slice(-35));
    console.log("[oauth] Google Client Secret length:", googleClientSecret.length);
    console.log("[oauth] Google callback URL:", callbackURL);
    
    passport.use(new GoogleStrategy({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: callbackURL,
      scope: ["profile", "email"],
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUser({
          id: profile.id,
          provider: "google",
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }));
    console.log("[oauth] Google OAuth configured");
  } else {
    console.log("[oauth] Google OAuth not configured (missing credentials)");
  }

  // Facebook OAuth
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${APP_URL}/api/auth/facebook/callback`,
      profileFields: ["id", "emails", "name", "picture.type(large)"],
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const user = await findOrCreateUser({
          id: profile.id,
          provider: "facebook",
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profileImageUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }));
    console.log("[oauth] Facebook OAuth configured");
  } else {
    console.log("[oauth] Facebook OAuth not configured");
  }

  // GitHub OAuth
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${APP_URL}/api/auth/github/callback`,
      scope: ["user:email"],
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const nameParts = (profile.displayName || "").split(" ");
        const user = await findOrCreateUser({
          id: profile.id,
          provider: "github",
          email: profile.emails?.[0]?.value,
          firstName: nameParts[0] || profile.username,
          lastName: nameParts.slice(1).join(" ") || undefined,
          profileImageUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }));
    console.log("[oauth] GitHub OAuth configured");
  } else {
    console.log("[oauth] GitHub OAuth not configured");
  }

  // Apple OAuth - handled manually in oauth-routes.ts (not via passport-apple)
  const appleClientId = getAppleClientId();
  if (appleClientId && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    console.log("[oauth] Apple OAuth configured (manual implementation)");
    console.log("[oauth] Apple client_id:", appleClientId);
    console.log("[oauth] Apple team_id:", process.env.APPLE_TEAM_ID);
    console.log("[oauth] Apple key_id:", process.env.APPLE_KEY_ID);
  } else {
    console.log("[oauth] Apple OAuth not configured (missing APPLE_BUNDLE_ID/APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY)");
  }
}

export function getConfiguredProviders(): string[] {
  const providers: string[] = [];
  if ((process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) && (process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)) providers.push("google");
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) providers.push("facebook");
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) providers.push("github");
  if (getAppleClientId() && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) providers.push("apple");
  return providers;
}