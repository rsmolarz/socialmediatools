import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

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
  // Google OAuth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
    console.log("[oauth] Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)");
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
}

export function getConfiguredProviders(): string[] {
  const providers: string[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) providers.push("google");
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) providers.push("facebook");
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) providers.push("github");
  return providers;
}
