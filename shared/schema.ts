import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Text line configuration (Line 1, 2, 3 format)
export const textLineSchema = z.object({
  id: z.string(),
  text: z.string(),
  highlight: z.boolean().default(false),
});

export type TextLine = z.infer<typeof textLineSchema>;

// Text overlay configuration (for legacy support)
export const textOverlaySchema = z.object({
  id: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  fontSize: z.number(),
  fontFamily: z.string(),
  color: z.string(),
  fontWeight: z.enum(["normal", "bold", "600", "700", "800", "900"]),
  textAlign: z.enum(["left", "center", "right"]),
  shadow: z.boolean().optional(),
  outline: z.boolean().optional(),
});

export type TextOverlay = z.infer<typeof textOverlaySchema>;

// Background effects configuration
export const backgroundEffectsSchema = z.object({
  darkOverlay: z.number().min(0).max(100).default(40),
  vignetteIntensity: z.number().min(0).max(100).default(50),
  colorTint: z.enum(["none", "purple", "blue", "orange"]).default("none"),
});

export type BackgroundEffects = z.infer<typeof backgroundEffectsSchema>;

// Thumbnail configuration
export const thumbnailConfigSchema = z.object({
  backgroundColor: z.string(),
  backgroundImage: z.string().optional(),
  overlays: z.array(textOverlaySchema),
  width: z.number().default(1280),
  height: z.number().default(720),
  // New features
  textLines: z.array(textLineSchema).optional(),
  layout: z.enum(["centered", "left-aligned", "stacked"]).default("centered"),
  accentColor: z.enum(["orange", "blue", "purple"]).default("orange"),
  backgroundEffects: backgroundEffectsSchema.optional(),
});

export type ThumbnailConfig = z.infer<typeof thumbnailConfigSchema>;

// Thumbnails table
export const thumbnails = pgTable("thumbnails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  config: jsonb("config").$type<ThumbnailConfig>().notNull(),
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertThumbnailSchema = createInsertSchema(thumbnails).omit({
  id: true,
  createdAt: true,
});

export type InsertThumbnail = z.infer<typeof insertThumbnailSchema>;
export type Thumbnail = typeof thumbnails.$inferSelect;

// Users table (keeping for future auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
