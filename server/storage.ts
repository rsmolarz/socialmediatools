import { 
  type Thumbnail, 
  type InsertThumbnail,
  type User, 
  type InsertUser,
  type ViralContent,
  type InsertViralContent,
  type SocialPost,
  type InsertSocialPost,
  type ViralTopic,
  type InsertViralTopic,
  type Template,
  type InsertTemplate,
  type BrandKit,
  type InsertBrandKit,
  type ScheduledContent,
  type InsertScheduledContent,
  type Collection,
  type InsertCollection,
  type Collaboration,
  type InsertCollaboration,
  type Comment,
  type InsertComment,
  type KeyboardShortcut,
  type InsertKeyboardShortcut,
  type Analytics,
  type InsertAnalytics,
  type SavedPhotoRecord,
  type InsertSavedPhoto,
  type SpeakerKit,
  type InsertSpeakerKit,
  type SpeakerOpportunity,
  type InsertSpeakerOpportunity,
  type SiteReview,
  type InsertSiteReview,
  thumbnails,
  users,
  viralContent,
  socialPosts,
  viralTopics,
  templatesTable,
  brandKitsTable,
  scheduledContentTable,
  collectionsTable,
  collaborationTable,
  commentsTable,
  keyboardShortcutsTable,
  analyticsTable,
  savedPhotos,
  speakerKitsTable,
  speakerOpportunitiesTable,
  siteReviewsTable,
  type AiSuggestion,
  type InsertAiSuggestion,
  type AiAction,
  type InsertAiAction,
  type AiAutomation,
  type InsertAiAutomation,
  aiSuggestionsTable,
  aiActionsTable,
  aiAutomationsTable,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Thumbnail methods
  getAllThumbnails(): Promise<Thumbnail[]>;
  getThumbnail(id: string): Promise<Thumbnail | undefined>;
  createThumbnail(thumbnail: InsertThumbnail): Promise<Thumbnail>;
  updateThumbnail(id: string, thumbnail: Partial<InsertThumbnail>): Promise<Thumbnail | undefined>;
  deleteThumbnail(id: string): Promise<boolean>;

  // Viral Content methods
  getAllViralContent(limit?: number): Promise<ViralContent[]>;
  createViralContent(content: InsertViralContent): Promise<ViralContent>;
  
  // Social Posts methods
  getAllSocialPosts(limit?: number): Promise<SocialPost[]>;
  getSocialPost(id: number): Promise<SocialPost | undefined>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  updateSocialPost(id: number, updates: Partial<InsertSocialPost>): Promise<SocialPost | undefined>;
  deleteSocialPost(id: number): Promise<boolean>;
  
  // Viral Topics methods
  createViralTopic(topic: InsertViralTopic): Promise<ViralTopic>;

  // Template methods
  getAllTemplates(category?: string): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, updates: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<boolean>;
  searchTemplates(query: string): Promise<Template[]>;

  // Brand Kit methods
  getAllBrandKits(userId: string): Promise<BrandKit[]>;
  getBrandKit(id: number): Promise<BrandKit | undefined>;
  createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit>;
  updateBrandKit(id: number, updates: Partial<InsertBrandKit>): Promise<BrandKit | undefined>;
  deleteBrandKit(id: number): Promise<boolean>;

  // Scheduled Content methods
  getAllScheduledContent(): Promise<ScheduledContent[]>;
  getScheduledContent(id: number): Promise<ScheduledContent | undefined>;
  createScheduledContent(content: InsertScheduledContent): Promise<ScheduledContent>;
  updateScheduledContent(id: number, updates: Partial<InsertScheduledContent>): Promise<ScheduledContent | undefined>;
  deleteScheduledContent(id: number): Promise<boolean>;
  getScheduledContentByDateRange(start: Date, end: Date): Promise<ScheduledContent[]>;

  // Collection methods
  getAllCollections(userId: string): Promise<Collection[]>;
  getCollection(id: number): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, updates: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: number): Promise<boolean>;

  // Collaboration methods
  getCollaborationsByThumbnail(thumbnailId: number): Promise<Collaboration[]>;
  getCollaborationsByUser(userId: string): Promise<Collaboration[]>;
  getCollaborationByToken(token: string): Promise<Collaboration | undefined>;
  createCollaboration(collab: InsertCollaboration): Promise<Collaboration>;
  deleteCollaboration(id: number): Promise<boolean>;

  // Comment methods
  getCommentsByThumbnail(thumbnailId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: number, updates: Partial<InsertComment>): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<boolean>;

  // Keyboard Shortcut methods
  getShortcutsByUser(userId: string): Promise<KeyboardShortcut[]>;
  createShortcut(shortcut: InsertKeyboardShortcut): Promise<KeyboardShortcut>;
  updateShortcut(id: number, updates: Partial<InsertKeyboardShortcut>): Promise<KeyboardShortcut | undefined>;
  deleteShortcut(id: number): Promise<boolean>;

  // Analytics methods
  createAnalyticsEvent(event: InsertAnalytics): Promise<Analytics>;
  getAnalyticsByUser(userId: string, limit?: number): Promise<Analytics[]>;
  getAnalyticsByAction(action: string, limit?: number): Promise<Analytics[]>;

  // Saved Photos methods
  getAllSavedPhotos(): Promise<Omit<SavedPhotoRecord, "imageData">[]>;
  getSavedPhoto(id: string): Promise<SavedPhotoRecord | undefined>;
  createSavedPhoto(photo: InsertSavedPhoto): Promise<SavedPhotoRecord>;
  deleteSavedPhoto(id: string): Promise<boolean>;

  // Speaker Kit methods
  getAllSpeakerKits(): Promise<SpeakerKit[]>;
  getSpeakerKit(id: number): Promise<SpeakerKit | undefined>;
  createSpeakerKit(kit: InsertSpeakerKit): Promise<SpeakerKit>;
  updateSpeakerKit(id: number, updates: Partial<InsertSpeakerKit>): Promise<SpeakerKit | undefined>;
  deleteSpeakerKit(id: number): Promise<boolean>;

  // Speaker Opportunity methods
  getAllSpeakerOpportunities(): Promise<SpeakerOpportunity[]>;
  getSpeakerOpportunity(id: number): Promise<SpeakerOpportunity | undefined>;
  createSpeakerOpportunity(opp: InsertSpeakerOpportunity): Promise<SpeakerOpportunity>;
  updateSpeakerOpportunity(id: number, updates: Partial<InsertSpeakerOpportunity>): Promise<SpeakerOpportunity | undefined>;
  deleteSpeakerOpportunity(id: number): Promise<boolean>;

  // AI Content Team - Suggestions
  getAllAiSuggestions(userId?: string): Promise<AiSuggestion[]>;
  createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion>;
  updateAiSuggestion(id: number, updates: Partial<InsertAiSuggestion>): Promise<AiSuggestion | undefined>;

  // AI Content Team - Actions
  getAllAiActions(userId?: string, limit?: number): Promise<AiAction[]>;
  createAiAction(action: InsertAiAction): Promise<AiAction>;

  // AI Content Team - Automations
  getAllAiAutomations(userId?: string): Promise<AiAutomation[]>;
  createAiAutomation(automation: InsertAiAutomation): Promise<AiAutomation>;
  updateAiAutomation(id: number, updates: Partial<InsertAiAutomation>): Promise<AiAutomation | undefined>;
  deleteAiAutomation(id: number): Promise<boolean>;

  // Site Review methods
  createSiteReview(review: InsertSiteReview): Promise<SiteReview>;
  getSiteReview(id: number): Promise<SiteReview | undefined>;
  getSiteReviewByProofId(proofId: string): Promise<SiteReview | undefined>;
  getAllSiteReviews(userId?: string): Promise<SiteReview[]>;
  updateSiteReview(id: number, updates: Partial<InsertSiteReview>): Promise<SiteReview | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Thumbnail methods
  async getAllThumbnails(): Promise<Thumbnail[]> {
    return db.select().from(thumbnails).orderBy(desc(thumbnails.createdAt));
  }

  async getThumbnail(id: string): Promise<Thumbnail | undefined> {
    const [thumbnail] = await db.select().from(thumbnails).where(eq(thumbnails.id, id));
    return thumbnail;
  }

  async createThumbnail(thumbnail: InsertThumbnail): Promise<Thumbnail> {
    const [created] = await db.insert(thumbnails).values(thumbnail).returning();
    return created;
  }

  async updateThumbnail(id: string, updates: Partial<InsertThumbnail>): Promise<Thumbnail | undefined> {
    const [updated] = await db
      .update(thumbnails)
      .set(updates)
      .where(eq(thumbnails.id, id))
      .returning();
    return updated;
  }

  async deleteThumbnail(id: string): Promise<boolean> {
    const result = await db.delete(thumbnails).where(eq(thumbnails.id, id)).returning();
    return result.length > 0;
  }

  // Viral Content methods
  async getAllViralContent(limit: number = 50): Promise<ViralContent[]> {
    return db.select().from(viralContent).orderBy(desc(viralContent.createdAt)).limit(limit);
  }

  async createViralContent(content: InsertViralContent): Promise<ViralContent> {
    const [created] = await db.insert(viralContent).values(content).returning();
    return created;
  }

  // Social Posts methods
  async getAllSocialPosts(limit: number = 50): Promise<SocialPost[]> {
    return db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(limit);
  }

  async getSocialPost(id: number): Promise<SocialPost | undefined> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
    return post;
  }

  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    const [created] = await db.insert(socialPosts).values(post).returning();
    return created;
  }

  async updateSocialPost(id: number, updates: Partial<InsertSocialPost>): Promise<SocialPost | undefined> {
    const [updated] = await db
      .update(socialPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(socialPosts.id, id))
      .returning();
    return updated;
  }

  async deleteSocialPost(id: number): Promise<boolean> {
    const result = await db.delete(socialPosts).where(eq(socialPosts.id, id)).returning();
    return result.length > 0;
  }

  // Viral Topics methods
  async createViralTopic(topic: InsertViralTopic): Promise<ViralTopic> {
    const [created] = await db.insert(viralTopics).values(topic).returning();
    return created;
  }

  // Template methods
  async getAllTemplates(category?: string): Promise<Template[]> {
    if (category) {
      return db.select().from(templatesTable)
        .where(eq(templatesTable.category, category))
        .orderBy(desc(templatesTable.createdAt));
    }
    return db.select().from(templatesTable).orderBy(desc(templatesTable.createdAt));
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, id));
    return template;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db.insert(templatesTable).values(template).returning();
    return created;
  }

  async updateTemplate(id: number, updates: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [updated] = await db
      .update(templatesTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(templatesTable.id, id))
      .returning();
    return updated;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    const result = await db.delete(templatesTable).where(eq(templatesTable.id, id)).returning();
    return result.length > 0;
  }

  async searchTemplates(query: string): Promise<Template[]> {
    return db.select().from(templatesTable)
      .where(or(
        ilike(templatesTable.name, `%${query}%`),
        ilike(templatesTable.description, `%${query}%`)
      ))
      .orderBy(desc(templatesTable.createdAt));
  }

  // Brand Kit methods
  async getAllBrandKits(userId: string): Promise<BrandKit[]> {
    return db.select().from(brandKitsTable)
      .where(eq(brandKitsTable.userId, userId))
      .orderBy(desc(brandKitsTable.createdAt));
  }

  async getBrandKit(id: number): Promise<BrandKit | undefined> {
    const [kit] = await db.select().from(brandKitsTable).where(eq(brandKitsTable.id, id));
    return kit;
  }

  async createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit> {
    const [created] = await db.insert(brandKitsTable).values(brandKit).returning();
    return created;
  }

  async updateBrandKit(id: number, updates: Partial<InsertBrandKit>): Promise<BrandKit | undefined> {
    const [updated] = await db
      .update(brandKitsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandKitsTable.id, id))
      .returning();
    return updated;
  }

  async deleteBrandKit(id: number): Promise<boolean> {
    const result = await db.delete(brandKitsTable).where(eq(brandKitsTable.id, id)).returning();
    return result.length > 0;
  }

  // Scheduled Content methods
  async getAllScheduledContent(): Promise<ScheduledContent[]> {
    return db.select().from(scheduledContentTable).orderBy(desc(scheduledContentTable.scheduledTime));
  }

  async getScheduledContent(id: number): Promise<ScheduledContent | undefined> {
    const [content] = await db.select().from(scheduledContentTable).where(eq(scheduledContentTable.id, id));
    return content;
  }

  async createScheduledContent(content: InsertScheduledContent): Promise<ScheduledContent> {
    const [created] = await db.insert(scheduledContentTable).values(content).returning();
    return created;
  }

  async updateScheduledContent(id: number, updates: Partial<InsertScheduledContent>): Promise<ScheduledContent | undefined> {
    const [updated] = await db
      .update(scheduledContentTable)
      .set(updates)
      .where(eq(scheduledContentTable.id, id))
      .returning();
    return updated;
  }

  async deleteScheduledContent(id: number): Promise<boolean> {
    const result = await db.delete(scheduledContentTable).where(eq(scheduledContentTable.id, id)).returning();
    return result.length > 0;
  }

  async getScheduledContentByDateRange(start: Date, end: Date): Promise<ScheduledContent[]> {
    return db.select().from(scheduledContentTable)
      .where(and(
        gte(scheduledContentTable.scheduledTime, start),
        lte(scheduledContentTable.scheduledTime, end)
      ))
      .orderBy(scheduledContentTable.scheduledTime);
  }

  // Collection methods
  async getAllCollections(userId: string): Promise<Collection[]> {
    return db.select().from(collectionsTable)
      .where(eq(collectionsTable.userId, userId))
      .orderBy(desc(collectionsTable.createdAt));
  }

  async getCollection(id: number): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collectionsTable).where(eq(collectionsTable.id, id));
    return collection;
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [created] = await db.insert(collectionsTable).values(collection).returning();
    return created;
  }

  async updateCollection(id: number, updates: Partial<InsertCollection>): Promise<Collection | undefined> {
    const [updated] = await db
      .update(collectionsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(collectionsTable.id, id))
      .returning();
    return updated;
  }

  async deleteCollection(id: number): Promise<boolean> {
    const result = await db.delete(collectionsTable).where(eq(collectionsTable.id, id)).returning();
    return result.length > 0;
  }

  // Collaboration methods
  async getCollaborationsByThumbnail(thumbnailId: number): Promise<Collaboration[]> {
    return db.select().from(collaborationTable)
      .where(eq(collaborationTable.thumbnailId, thumbnailId))
      .orderBy(desc(collaborationTable.createdAt));
  }

  async getCollaborationsByUser(userId: string): Promise<Collaboration[]> {
    return db.select().from(collaborationTable)
      .where(eq(collaborationTable.sharedWith, userId))
      .orderBy(desc(collaborationTable.createdAt));
  }

  async getCollaborationByToken(token: string): Promise<Collaboration | undefined> {
    const [collab] = await db.select().from(collaborationTable).where(eq(collaborationTable.shareToken, token));
    return collab;
  }

  async createCollaboration(collab: InsertCollaboration): Promise<Collaboration> {
    const [created] = await db.insert(collaborationTable).values(collab).returning();
    return created;
  }

  async deleteCollaboration(id: number): Promise<boolean> {
    const result = await db.delete(collaborationTable).where(eq(collaborationTable.id, id)).returning();
    return result.length > 0;
  }

  // Comment methods
  async getCommentsByThumbnail(thumbnailId: number): Promise<Comment[]> {
    return db.select().from(commentsTable)
      .where(eq(commentsTable.thumbnailId, thumbnailId))
      .orderBy(desc(commentsTable.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [created] = await db.insert(commentsTable).values(comment).returning();
    return created;
  }

  async updateComment(id: number, updates: Partial<InsertComment>): Promise<Comment | undefined> {
    const [updated] = await db
      .update(commentsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(commentsTable.id, id))
      .returning();
    return updated;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(commentsTable).where(eq(commentsTable.id, id)).returning();
    return result.length > 0;
  }

  // Keyboard Shortcut methods
  async getShortcutsByUser(userId: string): Promise<KeyboardShortcut[]> {
    return db.select().from(keyboardShortcutsTable)
      .where(eq(keyboardShortcutsTable.userId, userId))
      .orderBy(keyboardShortcutsTable.action);
  }

  async createShortcut(shortcut: InsertKeyboardShortcut): Promise<KeyboardShortcut> {
    const [created] = await db.insert(keyboardShortcutsTable).values(shortcut).returning();
    return created;
  }

  async updateShortcut(id: number, updates: Partial<InsertKeyboardShortcut>): Promise<KeyboardShortcut | undefined> {
    const [updated] = await db
      .update(keyboardShortcutsTable)
      .set(updates)
      .where(eq(keyboardShortcutsTable.id, id))
      .returning();
    return updated;
  }

  async deleteShortcut(id: number): Promise<boolean> {
    const result = await db.delete(keyboardShortcutsTable).where(eq(keyboardShortcutsTable.id, id)).returning();
    return result.length > 0;
  }

  // Analytics methods
  async createAnalyticsEvent(event: InsertAnalytics): Promise<Analytics> {
    const [created] = await db.insert(analyticsTable).values(event).returning();
    return created;
  }

  async getAnalyticsByUser(userId: string, limit: number = 100): Promise<Analytics[]> {
    return db.select().from(analyticsTable)
      .where(eq(analyticsTable.userId, userId))
      .orderBy(desc(analyticsTable.createdAt))
      .limit(limit);
  }

  async getAnalyticsByAction(action: string, limit: number = 100): Promise<Analytics[]> {
    return db.select().from(analyticsTable)
      .where(eq(analyticsTable.action, action))
      .orderBy(desc(analyticsTable.createdAt))
      .limit(limit);
  }

  // Saved Photos methods
  async getAllSavedPhotos(): Promise<Omit<SavedPhotoRecord, "imageData">[]> {
    return db.select({
      id: savedPhotos.id,
      name: savedPhotos.name,
      userId: savedPhotos.userId,
      createdAt: savedPhotos.createdAt,
    }).from(savedPhotos).orderBy(desc(savedPhotos.createdAt));
  }

  async getSavedPhoto(id: string): Promise<SavedPhotoRecord | undefined> {
    const [photo] = await db.select().from(savedPhotos).where(eq(savedPhotos.id, id));
    return photo;
  }

  async createSavedPhoto(photo: InsertSavedPhoto): Promise<SavedPhotoRecord> {
    const [created] = await db.insert(savedPhotos).values(photo).returning();
    return created;
  }

  async deleteSavedPhoto(id: string): Promise<boolean> {
    const result = await db.delete(savedPhotos).where(eq(savedPhotos.id, id));
    return true;
  }

  // Speaker Kit methods
  async getAllSpeakerKits(): Promise<SpeakerKit[]> {
    return db.select().from(speakerKitsTable).orderBy(desc(speakerKitsTable.createdAt));
  }

  async getSpeakerKit(id: number): Promise<SpeakerKit | undefined> {
    const [kit] = await db.select().from(speakerKitsTable).where(eq(speakerKitsTable.id, id));
    return kit;
  }

  async createSpeakerKit(kit: InsertSpeakerKit): Promise<SpeakerKit> {
    const [created] = await db.insert(speakerKitsTable).values(kit).returning();
    return created;
  }

  async updateSpeakerKit(id: number, updates: Partial<InsertSpeakerKit>): Promise<SpeakerKit | undefined> {
    const [updated] = await db.update(speakerKitsTable).set({ ...updates, updatedAt: new Date() }).where(eq(speakerKitsTable.id, id)).returning();
    return updated;
  }

  async deleteSpeakerKit(id: number): Promise<boolean> {
    await db.delete(speakerKitsTable).where(eq(speakerKitsTable.id, id));
    return true;
  }

  // Speaker Opportunity methods
  async getAllSpeakerOpportunities(): Promise<SpeakerOpportunity[]> {
    return db.select().from(speakerOpportunitiesTable).orderBy(desc(speakerOpportunitiesTable.createdAt));
  }

  async getSpeakerOpportunity(id: number): Promise<SpeakerOpportunity | undefined> {
    const [opp] = await db.select().from(speakerOpportunitiesTable).where(eq(speakerOpportunitiesTable.id, id));
    return opp;
  }

  async createSpeakerOpportunity(opp: InsertSpeakerOpportunity): Promise<SpeakerOpportunity> {
    const [created] = await db.insert(speakerOpportunitiesTable).values(opp).returning();
    return created;
  }

  async updateSpeakerOpportunity(id: number, updates: Partial<InsertSpeakerOpportunity>): Promise<SpeakerOpportunity | undefined> {
    const [updated] = await db.update(speakerOpportunitiesTable).set(updates).where(eq(speakerOpportunitiesTable.id, id)).returning();
    return updated;
  }

  async deleteSpeakerOpportunity(id: number): Promise<boolean> {
    await db.delete(speakerOpportunitiesTable).where(eq(speakerOpportunitiesTable.id, id));
    return true;
  }

  // AI Content Team - Suggestions
  async getAllAiSuggestions(userId?: string): Promise<AiSuggestion[]> {
    if (userId) {
      return db.select().from(aiSuggestionsTable).where(eq(aiSuggestionsTable.userId, userId)).orderBy(desc(aiSuggestionsTable.createdAt));
    }
    return db.select().from(aiSuggestionsTable).orderBy(desc(aiSuggestionsTable.createdAt));
  }

  async createAiSuggestion(suggestion: InsertAiSuggestion): Promise<AiSuggestion> {
    const [created] = await db.insert(aiSuggestionsTable).values(suggestion).returning();
    return created;
  }

  async updateAiSuggestion(id: number, updates: Partial<InsertAiSuggestion>): Promise<AiSuggestion | undefined> {
    const [updated] = await db.update(aiSuggestionsTable).set(updates).where(eq(aiSuggestionsTable.id, id)).returning();
    return updated;
  }

  // AI Content Team - Actions
  async getAllAiActions(userId?: string, limit?: number): Promise<AiAction[]> {
    let query = db.select().from(aiActionsTable).orderBy(desc(aiActionsTable.createdAt));
    if (userId) {
      query = db.select().from(aiActionsTable).where(eq(aiActionsTable.userId, userId)).orderBy(desc(aiActionsTable.createdAt));
    }
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async createAiAction(action: InsertAiAction): Promise<AiAction> {
    const [created] = await db.insert(aiActionsTable).values(action).returning();
    return created;
  }

  // AI Content Team - Automations
  async getAllAiAutomations(userId?: string): Promise<AiAutomation[]> {
    if (userId) {
      return db.select().from(aiAutomationsTable).where(eq(aiAutomationsTable.userId, userId)).orderBy(desc(aiAutomationsTable.createdAt));
    }
    return db.select().from(aiAutomationsTable).orderBy(desc(aiAutomationsTable.createdAt));
  }

  async createAiAutomation(automation: InsertAiAutomation): Promise<AiAutomation> {
    const [created] = await db.insert(aiAutomationsTable).values(automation).returning();
    return created;
  }

  async updateAiAutomation(id: number, updates: Partial<InsertAiAutomation>): Promise<AiAutomation | undefined> {
    const [updated] = await db.update(aiAutomationsTable).set(updates).where(eq(aiAutomationsTable.id, id)).returning();
    return updated;
  }

  async deleteAiAutomation(id: number): Promise<boolean> {
    await db.delete(aiAutomationsTable).where(eq(aiAutomationsTable.id, id));
    return true;
  }

  // Site Review methods
  async createSiteReview(review: InsertSiteReview): Promise<SiteReview> {
    const [created] = await db.insert(siteReviewsTable).values(review).returning();
    return created;
  }

  async getSiteReview(id: number): Promise<SiteReview | undefined> {
    const [review] = await db.select().from(siteReviewsTable).where(eq(siteReviewsTable.id, id));
    return review;
  }

  async getSiteReviewByProofId(proofId: string): Promise<SiteReview | undefined> {
    const [review] = await db.select().from(siteReviewsTable).where(eq(siteReviewsTable.proofId, proofId));
    return review;
  }

  async getAllSiteReviews(userId?: string): Promise<SiteReview[]> {
    if (userId) {
      return db.select().from(siteReviewsTable).where(eq(siteReviewsTable.userId, userId)).orderBy(desc(siteReviewsTable.createdAt));
    }
    return db.select().from(siteReviewsTable).orderBy(desc(siteReviewsTable.createdAt));
  }

  async updateSiteReview(id: number, updates: Partial<InsertSiteReview>): Promise<SiteReview | undefined> {
    const [updated] = await db.update(siteReviewsTable).set(updates).where(eq(siteReviewsTable.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
