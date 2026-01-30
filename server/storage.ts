import { 
  type Thumbnail, 
  type InsertThumbnail,
  type User, 
  type InsertUser,
  thumbnails,
  users 
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
}

export const storage = new DatabaseStorage();
