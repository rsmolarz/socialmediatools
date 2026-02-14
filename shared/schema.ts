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
  offsetX: z.number().min(-640).max(640).default(0),
  offsetY: z.number().min(-400).max(400).default(0),
});

// Saved photo (after background removal)
export const savedPhotoSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  createdAt: z.string(),
});

export type SavedPhoto = z.infer<typeof savedPhotoSchema>;

// Saved photos table
export const savedPhotos = pgTable("saved_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  imageData: text("image_data").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedPhotoSchema = createInsertSchema(savedPhotos).omit({
  id: true,
  createdAt: true,
});

export type InsertSavedPhoto = z.infer<typeof insertSavedPhotoSchema>;
export type SavedPhotoRecord = typeof savedPhotos.$inferSelect;

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
  textOffsetX: z.number().default(0).optional(),
  textOffsetY: z.number().default(0).optional(),
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

// Users table is defined in shared/models/auth.ts and exported via the auth models export below

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

// ============================================
// NEW FEATURE SCHEMAS
// ============================================

// Template Library - Pre-designed thumbnail templates
export const templatesTable = pgTable("templates", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(), // tech, finance, health, gaming, lifestyle
    thumbnail: text("thumbnail_url"), // Preview image
    config: jsonb("config").notNull(), // Stores default TextLine, Background, etc
    tags: text("tags").array(), // For searching
    isPublic: boolean("is_public").default(true),
    creator: text("creator_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type Template = typeof templatesTable.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export const insertTemplateSchema = createInsertSchema(templatesTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Brand Kit - Store brand colors, fonts, logos
export const brandKitsTable = pgTable("brand_kits", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    colors: jsonb("colors").notNull(), // { primary, secondary, accent, text, background }
    fonts: jsonb("fonts").notNull(), // { heading, body, accent }
    logos: jsonb("logos").notNull(), // Array of logo objects with variants
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type BrandKit = typeof brandKitsTable.$inferSelect;
export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export const insertBrandKitSchema = createInsertSchema(brandKitsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Scheduled Content - For scheduling posts
export const scheduledContentTable = pgTable("scheduled_content", {
    id: serial("id").primaryKey(),
    thumbnailId: integer("thumbnail_id"),
    platforms: text("platforms").array(), // youtube, tiktok, instagram
    scheduledTime: timestamp("scheduled_time").notNull(),
    status: text("status").default("pending"), // pending, scheduled, published, failed
    timezone: text("timezone").default("UTC"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ScheduledContent = typeof scheduledContentTable.$inferSelect;
export type InsertScheduledContent = z.infer<typeof insertScheduledContentSchema>;
export const insertScheduledContentSchema = createInsertSchema(scheduledContentTable).omit({
    id: true,
    createdAt: true,
});

// Collections/Folders - Organize thumbnails
export const collectionsTable = pgTable("collections", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    icon: text("icon"),
    isPrivate: boolean("is_private").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type Collection = typeof collectionsTable.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export const insertCollectionSchema = createInsertSchema(collectionsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Collaboration - Share and comment on thumbnails
export const collaborationTable = pgTable("collaborations", {
    id: serial("id").primaryKey(),
    thumbnailId: integer("thumbnail_id"),
    sharedWith: text("shared_with_user_id").notNull(),
    permission: text("permission").default("view"), // view, edit, comment
    shareToken: text("share_token").unique(),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Collaboration = typeof collaborationTable.$inferSelect;
export type InsertCollaboration = z.infer<typeof insertCollaborationSchema>;
export const insertCollaborationSchema = createInsertSchema(collaborationTable).omit({
    id: true,
    createdAt: true,
});

// Comments - Comments on thumbnails
export const commentsTable = pgTable("comments", {
    id: serial("id").primaryKey(),
    thumbnailId: integer("thumbnail_id"),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    resolved: boolean("resolved").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type Comment = typeof commentsTable.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export const insertCommentSchema = createInsertSchema(commentsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Keyboard Shortcuts - User-defined shortcuts
export const keyboardShortcutsTable = pgTable("keyboard_shortcuts", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(), // export, undo, save, etc
    keys: text("keys").notNull(), // e.g., "ctrl+e"
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type KeyboardShortcut = typeof keyboardShortcutsTable.$inferSelect;
export type InsertKeyboardShortcut = z.infer<typeof insertKeyboardShortcutSchema>;
export const insertKeyboardShortcutSchema = createInsertSchema(keyboardShortcutsTable).omit({
    id: true,
    createdAt: true,
});

// Analytics - Track user actions and feature usage
export const analyticsTable = pgTable("analytics", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(), // thumbnail_created, export_click, etc
    metadata: jsonb("metadata"), // Additional data
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Analytics = typeof analyticsTable.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export const insertAnalyticsSchema = createInsertSchema(analyticsTable).omit({
    id: true,
    createdAt: true,
});

// A/B Testing - Create and track thumbnail variants
export const abTestsTable = pgTable("ab_tests", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    originalThumbnailId: text("original_thumbnail_id").notNull(),
    variants: jsonb("variants").$type<{id: string; name: string; config: ThumbnailConfig}[]>().notNull(),
    status: text("status").default("draft"), // draft, active, completed
    winner: text("winner"), // variant id that won
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type ABTest = typeof abTestsTable.$inferSelect;
export type InsertABTest = z.infer<typeof insertABTestSchema>;
export const insertABTestSchema = createInsertSchema(abTestsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Image Filters - Preset filters for images
export const imageFilterSchema = z.object({
    id: z.string(),
    name: z.string(),
    brightness: z.number().min(-100).max(100).default(0),
    contrast: z.number().min(-100).max(100).default(0),
    saturation: z.number().min(-100).max(100).default(0),
    hue: z.number().min(-180).max(180).default(0),
    blur: z.number().min(0).max(20).default(0),
    sepia: z.number().min(0).max(100).default(0),
    grayscale: z.number().min(0).max(100).default(0),
    opacity: z.number().min(0).max(100).default(100),
});

export type ImageFilter = z.infer<typeof imageFilterSchema>;

// Thumbnail Tags - For organizing thumbnails
export const thumbnailTagsTable = pgTable("thumbnail_tags", {
    id: serial("id").primaryKey(),
    thumbnailId: text("thumbnail_id").notNull(),
    tag: text("tag").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ThumbnailTag = typeof thumbnailTagsTable.$inferSelect;
export type InsertThumbnailTag = z.infer<typeof insertThumbnailTagSchema>;
export const insertThumbnailTagSchema = createInsertSchema(thumbnailTagsTable).omit({
    id: true,
    createdAt: true,
});

// Thumbnail Folders - For organizing thumbnails
export const thumbnailFoldersTable = pgTable("thumbnail_folders", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    parentId: integer("parent_id"),
    color: text("color").default("#6B7280"),
    icon: text("icon").default("folder"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type ThumbnailFolder = typeof thumbnailFoldersTable.$inferSelect;
export type InsertThumbnailFolder = z.infer<typeof insertThumbnailFolderSchema>;
export const insertThumbnailFolderSchema = createInsertSchema(thumbnailFoldersTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Analytics - Track thumbnail performance
export const thumbnailAnalyticsTable = pgTable("thumbnail_analytics", {
    id: serial("id").primaryKey(),
    thumbnailId: text("thumbnail_id").notNull(),
    date: timestamp("date").defaultNow().notNull(),
    impressions: integer("impressions").default(0).notNull(),
    clicks: integer("clicks").default(0).notNull(),
    platform: text("platform").default("youtube"),
    source: text("source").default("organic"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type ThumbnailAnalytics = typeof thumbnailAnalyticsTable.$inferSelect;
export type InsertThumbnailAnalytics = z.infer<typeof insertThumbnailAnalyticsSchema>;
export const insertThumbnailAnalyticsSchema = createInsertSchema(thumbnailAnalyticsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Analytics Events - Individual tracking events
export const analyticsEventsTable = pgTable("analytics_events", {
    id: serial("id").primaryKey(),
    thumbnailId: text("thumbnail_id").notNull(),
    eventType: text("event_type").notNull(), // 'impression', 'click', 'share', 'save'
    platform: text("platform").default("youtube"),
    source: text("source").default("organic"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEventsTable).omit({
    id: true,
    createdAt: true,
});

// Agent Logs table - stores logs from Code Guardian and Code Upgrade agents
export const agentLogsTable = pgTable("agent_logs", {
    id: serial("id").primaryKey(),
    agentType: text("agent_type").notNull(), // 'guardian' or 'upgrade'
    action: text("action").notNull(), // 'error_detected', 'fix_applied', 'recommendation', 'scan_complete'
    severity: text("severity").default("info"), // 'info', 'warning', 'error', 'critical'
    title: text("title").notNull(),
    description: text("description"),
    filePath: text("file_path"),
    lineNumber: integer("line_number"),
    recommendation: text("recommendation"),
    status: text("status").default("pending"), // 'pending', 'resolved', 'ignored', 'in_progress'
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
});

export type AgentLog = typeof agentLogsTable.$inferSelect;
export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;
export const insertAgentLogSchema = createInsertSchema(agentLogsTable).omit({
    id: true,
    createdAt: true,
    resolvedAt: true,
});

// Feature Recommendations table - AI-suggested features
export const featureRecommendationsTable = pgTable("feature_recommendations", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'critical'
    category: text("category").default("enhancement"), // 'enhancement', 'performance', 'security', 'ux'
    estimatedEffort: text("estimated_effort"), // 'small', 'medium', 'large'
    status: text("status").default("pending"), // 'pending', 'approved', 'rejected', 'implemented'
    rationale: text("rationale"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at"),
});

export type FeatureRecommendation = typeof featureRecommendationsTable.$inferSelect;
export type InsertFeatureRecommendation = z.infer<typeof insertFeatureRecommendationSchema>;
export const insertFeatureRecommendationSchema = createInsertSchema(featureRecommendationsTable).omit({
    id: true,
    createdAt: true,
    reviewedAt: true,
});

// Auth models
export * from "./models/auth";
