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
  analyticsTable
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
}

export const storage = new DatabaseStorage();
