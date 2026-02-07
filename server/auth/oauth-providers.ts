import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import AppleStrategy from "passport-apple";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

// Format the Apple private key with proper PEM headers
function formatApplePrivateKey(key: string): string {
  // Remove any existing headers/footers and whitespace
  let cleanKey = key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN EC PRIVATE KEY-----/g, '')
    .replace(/-----END EC PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  // Split into 64-character lines
  const lines: string[] = [];
  for (let i = 0; i < cleanKey.length; i += 64) {
    lines.push(cleanKey.substring(i, i + 64));
  }
  
  // Add proper PEM headers
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
}

// Generate Apple client secret (JWT)
function generateAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const privateKey = formatApplePrivateKey(process.env.APPLE_PRIVATE_KEY!);
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 15777000, // 6 months
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

const APP_URL = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : process.env.APP_URL || "http://localhost:5000";

interface OAuthProfile {
  id: string;
  provider: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

async function findOrCreateUser(profile: OAuthProfile) {
  const odataId = `${profile.provider}_${profile.id}`;
  
  const existingUsers = await db.select().from(users).where(eq(users.id, odataId));
  
  if (existingUsers.length > 0) {
    return existingUsers[0];
  }

  const [newUser] = await db.insert(users).values({
    id: odataId,
    email: profile.email || null,
    firstName: profile.firstName || null,
    lastName: profile.lastName || null,
    profileImageUrl: profile.profileImageUrl || null,
  }).returning();

  return newUser;
}

export function setupOAuthProviders() {
  // Google OAuth - uses SOCIAL_MEDIA_GOOGLE_CLIENT_ID for Thumb Meta Tool project
  const googleClientId = process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (googleClientId && googleClientSecret) {
    const trimmedClientId = googleClientId.trim();
    const trimmedClientSecret = googleClientSecret.trim();
    console.log("[oauth] Google Client ID length:", trimmedClientId.length, "ends with:", trimmedClientId.substring(trimmedClientId.length - 30));
    console.log("[oauth] Google Client Secret length:", trimmedClientSecret.length);
    console.log("[oauth] Google callback URL:", `${APP_URL}/api/auth/google/callback`);
    passport.use(new GoogleStrategy({
      clientID: trimmedClientId,
      clientSecret: trimmedClientSecret,
      callbackURL: `${APP_URL}/api/auth/google/callback`,
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
    console.log("[oauth] Google OAuth not configured (missing SOCIAL_MEDIA_GOOGLE_CLIENT_ID or SOCIAL_MEDIA_GOOGLE_CLIENT_SECRET)");
  }

  // Facebook OAuth
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${APP_URL}/api/auth/facebook/callback`,
      profileFields: ["id", "emails", "name", "picture.type(large)"],
    }, async (accessToken, refreshToken, profile, done) => {
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
    console.log("[oauth] Facebook OAuth not configured (missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET)");
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
          lastName: nameParts.slice(1).join(" ") || null,
          profileImageUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }));
    console.log("[oauth] GitHub OAuth configured");
  } else {
    console.log("[oauth] GitHub OAuth not configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)");
  }

  // Apple OAuth
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    try {
      const formattedPrivateKey = formatApplePrivateKey(process.env.APPLE_PRIVATE_KEY);
      const clientSecret = generateAppleClientSecret();
      passport.use(new AppleStrategy({
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: formattedPrivateKey,
        callbackURL: `${APP_URL}/api/auth/apple/callback`,
        scope: ["name", "email"],
        passReqToCallback: false,
      }, async (accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
        try {
          // Apple may not return email after first login
          const email = profile.email || idToken?.email;
          const firstName = profile.name?.firstName || "Apple";
          const lastName = profile.name?.lastName || "User";
          
          const user = await findOrCreateUser({
            id: profile.id || idToken?.sub,
            provider: "apple",
            email: email,
            firstName: firstName,
            lastName: lastName,
            profileImageUrl: undefined,
          });
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }));
      console.log("[oauth] Apple OAuth configured");
    } catch (error) {
      console.log("[oauth] Apple OAuth configuration failed:", error);
    }
  } else {
    console.log("[oauth] Apple OAuth not configured (missing APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY)");
  }
}

export function getConfiguredProviders(): string[] {
  const providers: string[] = [];
  if ((process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) && (process.env.SOCIAL_MEDIA_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)) providers.push("google");
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) providers.push("facebook");
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) providers.push("github");
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) providers.push("apple");
  return providers;
}
