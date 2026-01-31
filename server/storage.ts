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
  thumbnails,
  users,
  viralContent,
  socialPosts,
  viralTopics
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
