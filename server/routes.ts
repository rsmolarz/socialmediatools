import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertThumbnailSchema } from "@shared/schema";
import { z } from "zod";
import { generateImageBuffer } from "./replit_integrations/image";
import { fetchYouTubeVideos, updateYouTubeVideo, checkYouTubeConnection } from "./youtube";
import OpenAI from "openai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Get all thumbnails
  app.get("/api/thumbnails", async (_req, res) => {
    try {
      const thumbnails = await storage.getAllThumbnails();
      res.json(thumbnails);
    } catch (error) {
      console.error("Error fetching thumbnails:", error);
      res.status(500).json({ error: "Failed to fetch thumbnails" });
    }
  });

  // Get single thumbnail
  app.get("/api/thumbnails/:id", async (req, res) => {
    try {
      const thumbnail = await storage.getThumbnail(req.params.id);
      if (!thumbnail) {
        return res.status(404).json({ error: "Thumbnail not found" });
      }
      res.json(thumbnail);
    } catch (error) {
      console.error("Error fetching thumbnail:", error);
      res.status(500).json({ error: "Failed to fetch thumbnail" });
    }
  });

  // Create thumbnail
  app.post("/api/thumbnails", async (req, res) => {
    try {
      const parsed = insertThumbnailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid thumbnail data", details: parsed.error });
      }
      const thumbnail = await storage.createThumbnail(parsed.data);
      res.status(201).json(thumbnail);
    } catch (error) {
      console.error("Error creating thumbnail:", error);
      res.status(500).json({ error: "Failed to create thumbnail" });
    }
  });

  // Update thumbnail
  app.patch("/api/thumbnails/:id", async (req, res) => {
    try {
      const parsed = insertThumbnailSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid thumbnail data", details: parsed.error });
      }
      const thumbnail = await storage.updateThumbnail(req.params.id, parsed.data);
      if (!thumbnail) {
        return res.status(404).json({ error: "Thumbnail not found" });
      }
      res.json(thumbnail);
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      res.status(500).json({ error: "Failed to update thumbnail" });
    }
  });

  // Delete thumbnail
  app.delete("/api/thumbnails/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteThumbnail(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Thumbnail not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting thumbnail:", error);
      res.status(500).json({ error: "Failed to delete thumbnail" });
    }
  });

  // Generate AI background image
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, size = "1024x1024" } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const imageBuffer = await generateImageBuffer(prompt, size as "1024x1024" | "512x512" | "256x256");
      const b64_json = imageBuffer.toString("base64");

      res.json({ b64_json });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  // YouTube Integration Routes
  
  // Check YouTube connection status
  app.get("/api/youtube/status", async (_req, res) => {
    try {
      const connected = await checkYouTubeConnection();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Fetch YouTube videos
  app.get("/api/youtube/videos", async (req, res) => {
    try {
      const maxResults = parseInt(req.query.maxResults as string) || 10;
      const daysBack = parseInt(req.query.daysBack as string) || 30;
      const result = await fetchYouTubeVideos(maxResults, daysBack);
      res.json(result);
    } catch (error) {
      console.error("Error fetching YouTube videos:", error);
      res.status(500).json({ error: "Failed to fetch YouTube videos. Make sure YouTube is connected." });
    }
  });

  // Update YouTube video
  const updateVideoSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    tags: z.array(z.string()).optional().default([]),
    categoryId: z.string().optional(),
  });

  app.patch("/api/youtube/videos/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      const parsed = updateVideoSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request data", details: parsed.error.errors });
      }
      
      const { title, description, tags, categoryId } = parsed.data;
      
      const result = await updateYouTubeVideo(
        videoId,
        title,
        description,
        tags,
        categoryId
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error("Error updating YouTube video:", error);
      res.status(500).json({ error: "Failed to update YouTube video" });
    }
  });

  // AI SEO Optimization endpoint
  const optimizeSeoSchema = z.object({
    title: z.string().min(1, "Video title is required"),
    description: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
  });

  app.post("/api/youtube/optimize-seo", async (req, res) => {
    try {
      const parsed = optimizeSeoSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request data", details: parsed.error.errors });
      }
      
      const { title, description, tags } = parsed.data;

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const prompt = `You are an expert YouTube SEO specialist. Analyze the following video and generate optimized content for better discoverability and engagement.

**Video Title:** ${title}

**Current Description:**
${description || "(No description)"}

**Current Tags:**
${tags?.length > 0 ? tags.join(", ") : "(No tags)"}

Please provide:
1. An optimized description that:
   - Has a compelling hook in the first 2-3 lines (visible before "Show more")
   - Includes relevant keywords naturally
   - Has clear formatting with line breaks
   - Includes a call-to-action (subscribe, like, comment)
   - Is between 200-500 words for optimal SEO

2. A list of 15-25 optimized tags that:
   - Include broad and specific topic tags
   - Use relevant long-tail keywords
   - Cover variations and synonyms of key terms

Respond with valid JSON in this exact format:
{
  "optimizedDescription": "your optimized description here",
  "optimizedTags": ["tag1", "tag2", "tag3", ...]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      const optimized = JSON.parse(responseText);

      res.json({
        optimizedDescription: optimized.optimizedDescription || description,
        optimizedTags: optimized.optimizedTags || tags || [],
      });
    } catch (error) {
      console.error("Error optimizing SEO:", error);
      res.status(500).json({ error: "Failed to generate SEO optimization" });
    }
  });

  return httpServer;
}
