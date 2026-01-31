import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";
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

// Photo configuration schema
export const photoConfigSchema = z.object({
  url: z.string().nullable().default(null),
  scale: z.number().min(50).max(200).default(100),
  offsetX: z.number().min(-200).max(200).default(0),
  offsetY: z.number().min(-200).max(200).default(0),
});

export type PhotoConfig = z.infer<typeof photoConfigSchema>;

// Thumbnail configuration
export const thumbnailConfigSchema = z.object({
  backgroundColor: z.string(),
  backgroundImage: z.string().optional(),
  backgroundOpacity: z.number().min(0).max(100).default(50),
  overlays: z.array(textOverlaySchema),
  width: z.number().default(1280),
  height: z.number().default(720),
  // New features
  textLines: z.array(textLineSchema).optional(),
  layout: z.enum(["centered", "twoFace", "soloLeft", "soloRight", "left-aligned", "stacked"]).default("centered"),
  accentColor: z.enum(["orange", "blue", "purple"]).default("orange"),
  backgroundEffects: backgroundEffectsSchema.optional(),
  elementOpacity: z.number().min(0).max(100).default(70),
  hostPhoto: photoConfigSchema.optional(),
  guestPhoto: photoConfigSchema.optional(),
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

// Conversations table (for AI chat)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Messages table (for AI chat)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Viral Content table - stores AI-generated viral content ideas
export const viralContent = pgTable("viral_content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoType: text("video_type").default("generated"),
  platform: text("platform").default("multi-platform"),
  originalData: jsonb("original_data"),
  generatedContent: jsonb("generated_content"),
  viralityScore: integer("virality_score").default(0),
  brandVoiceApplied: text("brand_voice_applied"),
  themes: jsonb("themes").$type<string[]>(),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertViralContentSchema = createInsertSchema(viralContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ViralContent = typeof viralContent.$inferSelect;
export type InsertViralContent = z.infer<typeof insertViralContentSchema>;

// Social Posts table - stores generated social media posts
export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  viralContentId: integer("viral_content_id").references(() => viralContent.id, { onDelete: "set null" }),
  platform: text("platform").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  script: text("script"),
  hashtags: jsonb("hashtags").$type<string[]>(),
  hooks: jsonb("hooks").$type<string[]>(),
  targetLength: text("target_length"),
  viralityScore: integer("virality_score").default(0),
  status: text("status").default("draft"),
  approvedBy: text("approved_by"),
  postedAt: timestamp("posted_at"),
  platformPostId: text("platform_post_id"),
  thumbnailUrl: text("thumbnail_url"),
  backgroundUrl: text("background_url"),
  backgroundOpacity: integer("background_opacity").default(100),
  showLogo: boolean("show_logo").default(false),
  logoSize: integer("logo_size").default(50),
  logoPosition: text("logo_position").default("top-right"),
  selectedHook: text("selected_hook"),
  callToAction: text("call_to_action"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;

// Social Thumbnails table - stores generated thumbnails for social posts
export const socialThumbnails = pgTable("social_thumbnails", {
  id: serial("id").primaryKey(),
  viralContentId: integer("viral_content_id").references(() => viralContent.id, { onDelete: "set null" }),
  socialPostId: integer("social_post_id").references(() => socialPosts.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  title: text("title"),
  description: text("description"),
  style: text("style").default("professional"),
  dimensions: jsonb("dimensions").$type<{ width: number; height: number }>(),
  imageUrl: text("image_url"),
  prompt: text("prompt"),
  generationData: jsonb("generation_data"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertSocialThumbnailSchema = createInsertSchema(socialThumbnails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SocialThumbnail = typeof socialThumbnails.$inferSelect;
export type InsertSocialThumbnail = z.infer<typeof insertSocialThumbnailSchema>;

// Viral Topics table - stores discovered trending topics
export const viralTopics = pgTable("viral_topics", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull(),
  averageInterest: integer("average_interest").default(0),
  trendDirection: text("trend_direction").default("stable"),
  popularity: text("popularity").default("medium"),
  contentSuggestion: jsonb("content_suggestion"),
  source: text("source").default("google_trends"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertViralTopicSchema = createInsertSchema(viralTopics).omit({
  id: true,
  createdAt: true,
});

export type ViralTopic = typeof viralTopics.$inferSelect;
export type InsertViralTopic = z.infer<typeof insertViralTopicSchema>;
