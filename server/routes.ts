import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertThumbnailSchema, 
  insertViralContentSchema, 
  insertSocialPostSchema, 
  insertViralTopicSchema,
  insertTemplateSchema,
  insertBrandKitSchema,
  insertScheduledContentSchema,
  insertCollectionSchema,
  insertCollaborationSchema,
  insertCommentSchema,
  insertAnalyticsSchema,
  insertABTestSchema,
  insertThumbnailTagSchema,
  insertThumbnailFolderSchema,
  insertThumbnailAnalyticsSchema,
  insertAnalyticsEventSchema,
  insertSavedPhotoSchema,
  insertSpeakerKitSchema,
  insertSpeakerOpportunitySchema,
  insertSiteReviewSchema,
  brandKitsTable,
  abTestsTable,
  thumbnailTagsTable,
  thumbnailFoldersTable,
  thumbnailAnalyticsTable,
  analyticsEventsTable,
  thumbnails,
  speakerKitsTable,
  speakerOpportunitiesTable,
  siteReviewsTable,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, gte, and, count, sum } from "drizzle-orm";
import { z } from "zod";
import { generateImageBuffer } from "./replit_integrations/image";
import OpenAI, { toFile } from "openai";
import { Readable } from "stream";
import { viralAnalyzer } from "./lib/viral-analyzer";
import { randomBytes } from "crypto";
import archiver from "archiver";
import { checkYouTubeConnection, fetchYouTubeVideos, updateYouTubeVideo, getCachedVideos, invalidateVideoCache, fetchVideoStatistics, fetchChannelStats, fetchCompetitorData } from "./youtube";
import { setupOAuthRoutes, seedDemoAccount } from "./auth/oauth-routes";
import { publishToGHL, getGHLConnectionStatus } from "./ghl-service";
import multer from "multer";
import * as mammoth from "mammoth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup custom OAuth authentication (Google, Facebook, GitHub, Apple)
  setupOAuthRoutes(app);
  
  // Seed demo account on startup
  seedDemoAccount();
  
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

  // Remove background from an image using AI
  app.post("/api/remove-background", async (req, res) => {
    try {
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: "Image data is required" });
      }

      console.log("Starting background removal...");

      // Extract base64 data and convert to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");
      
      console.log("Image buffer size:", imageBuffer.length);
      
      // Create a readable stream from the buffer
      const stream = Readable.from(imageBuffer);
      
      // Convert to file format the API expects
      const imageFile = await toFile(stream, "input.png", { type: "image/png" });

      console.log("Calling OpenAI images.edit API...");

      // Use OpenAI's image editing capability to remove background
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: "Extract only the person from this photo. Remove all background elements completely. Output just the person cutout with a transparent background. Keep the person's appearance exactly as they are.",
        size: "1024x1024",
      });

      console.log("API response received");

      // gpt-image-1 returns base64 by default
      const b64_json = response.data?.[0]?.b64_json;
      
      if (!b64_json) {
        console.error("No b64_json in response:", JSON.stringify(response.data));
        throw new Error("No image data in response");
      }

      console.log("Background removal successful, returning image");
      res.json({ b64_json });
    } catch (error: any) {
      console.error("Error removing background - Full error:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      res.status(500).json({ error: "Failed to remove background", details: error?.message });
    }
  });

  // Analyze podcast transcript and generate thumbnail suggestions
  app.post("/api/analyze-transcript", async (req, res) => {
    try {
      const { transcript } = req.body;

      if (!transcript) {
        return res.status(400).json({ error: "Transcript is required" });
      }

      // Truncate to ~3000 chars for efficiency
      const truncatedTranscript = transcript.substring(0, 3000);

      const systemPrompt = `You are an expert at analyzing podcast transcripts and creating viral YouTube content for "The Medicine & Money Show" - a podcast about physician finance, investing, and entrepreneurship.

Analyze the transcript and return a JSON object with:

1. "viralTitle" - A SINGLE short viral title for the thumbnail:
   - MAXIMUM 3-4 words only
   - ALL CAPS format
   - Use power words: SECRET, NOW, STOP, FREE, TRUTH, RICH, WEALTH
   - Examples: "GET RICH NOW", "DOCTOR'S SECRET", "STOP THIS NOW", "WEALTH SECRET"

2. "youtubeTitle" - A compelling YouTube video title (50-70 characters):
   - Hook viewers immediately
   - Include keywords for SEO
   - Create curiosity or promise value
   - Example: "How Doctors Build Wealth Through Real Estate (Step-by-Step Guide)"

3. "youtubeDescription" - A full YouTube description (200-300 words):
   - Start with a hook summarizing the video
   - Include 3-5 bullet points of key topics covered
   - Add a call-to-action to subscribe
   - Include relevant keywords naturally
   - End with "Connect with us:" placeholder

4. "tags" - Array of 10-15 YouTube tags for SEO:
   - Mix of broad and specific keywords
   - Include: physician finance, doctor investing, medical professional wealth, etc.
   - Include topic-specific tags from the transcript

5. "themes" - Array of 3-5 key themes/topics (short phrases, 2-4 words each)

6. "backgroundPrompt" - A vivid image generation prompt for a futuristic thumbnail background. CRITICAL: Include REAL, TANGIBLE OBJECTS related to the topic - NOT abstract art or gradients. Examples:
   - For gut health: realistic 3D rendered intestines, gut microbiome visualization
   - For investing: realistic gold bars, stock charts, luxury watches, stacks of cash
   - For real estate: modern skyscrapers, luxury homes, property keys, blueprints
   - For medicine: stethoscopes, medical equipment, pharmaceutical pills
   The background should be dark/black with dramatic lighting. Futuristic, cinematic, hyper-realistic 3D style. NO text, NO people.

7. "style" - One of: futuristic, cinematic, medical, finance, tech, dramatic
8. "mood" - One of: dramatic, professional, bold, mysterious, luxurious

Return ONLY valid JSON, no markdown or explanation.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this podcast transcript:\n\n${truncatedTranscript}` }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "";
      
      // Parse JSON from response (handle potential markdown wrapping)
      let analysis;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        return res.status(500).json({ error: "Failed to parse analysis" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing transcript:", error);
      res.status(500).json({ error: "Failed to analyze transcript" });
    }
  });

  // Generate viral titles
  app.post("/api/generate-viral-titles", async (req, res) => {
    try {
      const { topic } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const systemPrompt = `You are a YouTube thumbnail title expert. Your job is to create SHORT, punchy, viral-worthy titles for YouTube thumbnails.

CRITICAL RULES:
1. Maximum 3-5 words per title
2. Use ALL CAPS for maximum impact
3. Create curiosity, urgency, or shock value
4. Use power words: FREE, SECRET, NOW, STOP, TRUTH, NEVER, ALWAYS, MISTAKE
5. Numbers are powerful when relevant
6. Make viewers NEED to click

Generate exactly 6 viral title options. Return ONLY a JSON object with this format:
{
  "titles": ["TITLE 1", "TITLE 2", "TITLE 3", "TITLE 4", "TITLE 5", "TITLE 6"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create 6 viral YouTube thumbnail titles for this topic: ${topic}` }
        ],
        max_tokens: 300,
        temperature: 0.9,
      });

      const content = response.choices[0]?.message?.content || "";
      
      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        return res.status(500).json({ error: "Failed to parse titles" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error generating viral titles:", error);
      res.status(500).json({ error: "Failed to generate viral titles" });
    }
  });

  // ===== SOCIAL MEDIA SUITE API ROUTES =====

  // Discover viral topics
  app.get("/api/viral/discover-topics", async (_req, res) => {
    try {
      const topics = await viralAnalyzer.discoverViralTopics();
      
      // Save topics to database using storage
      for (const topic of topics) {
        try {
          const topicData = insertViralTopicSchema.parse({
            keyword: topic.keyword,
            averageInterest: topic.averageInterest,
            trendDirection: topic.trendDirection,
            popularity: topic.popularity,
            contentSuggestion: topic.contentSuggestion,
            source: "ai_analysis",
          });
          await storage.createViralTopic(topicData);
        } catch (e) {
          // Ignore duplicate/validation errors
        }
      }

      res.json({
        success: true,
        topics,
        total: topics.length,
      });
    } catch (error) {
      console.error("Error discovering viral topics:", error);
      res.status(500).json({ success: false, error: "Failed to discover viral topics" });
    }
  });

  // Generate viral content from topic
  app.post("/api/viral/generate-content", async (req, res) => {
    try {
      const bodySchema = z.object({
        topic: z.string().min(1),
        platforms: z.array(z.string()).default(["youtube", "tiktok", "instagram"]),
      });

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Topic is required" });
      }

      const { topic, platforms } = parsed.data;
      const generatedContent = await viralAnalyzer.generateViralContent(topic, platforms);

      // Save to both viral_content and social_posts tables
      const savedContent = [];
      for (const content of generatedContent) {
        try {
          // Save to viral_content for history tracking
          const contentData = insertViralContentSchema.parse({
            title: content.title,
            description: content.description,
            videoType: "generated",
            platform: content.platform,
            generatedContent: content,
            viralityScore: content.viralityScore,
            brandVoiceApplied: "Medicine and Money Show",
            themes: content.hashtags,
          });
          const savedViral = await storage.createViralContent(contentData);

          // Generate AI background image for the post (layered behind person)
          let backgroundUrl: string | null = null;
          try {
            const backgroundPrompt = content.thumbnailPrompt || 
              `Professional background for social media about "${content.title}" - Medicine & Money Show style, featuring real objects: stethoscope, gold coins, medical equipment, financial charts. Dark moody lighting, photorealistic, high quality, no people`;
            
            const imageBuffer = await generateImageBuffer(backgroundPrompt, "1024x1024");
            backgroundUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
          } catch (imgErr) {
            console.error("Error generating background:", imgErr);
          }

          // Auto-pick the best hook using AI
          let selectedHook: string | null = null;
          if (content.hooks && content.hooks.length > 0) {
            try {
              selectedHook = await viralAnalyzer.pickBestHook(content.hooks, content.title);
            } catch (hookErr) {
              console.error("Error picking best hook:", hookErr);
              selectedHook = content.hooks[0];
            }
          }

          // Get default CTA
          const callToAction = viralAnalyzer.getDefaultCallToAction();

          // Also save to social_posts for the Manage queue
          const postData = insertSocialPostSchema.parse({
            viralContentId: savedViral.id,
            platform: content.platform,
            title: content.title,
            description: content.description,
            script: content.script || null,
            hashtags: content.hashtags,
            hooks: content.hooks,
            selectedHook: selectedHook,
            callToAction: callToAction,
            viralityScore: content.viralityScore,
            thumbnailUrl: null,
            backgroundUrl: backgroundUrl,
            backgroundOpacity: 50,
            status: "draft",
          });
          await storage.createSocialPost(postData);

          savedContent.push(savedViral);
        } catch (e) {
          console.error("Error saving content:", e);
        }
      }

      res.json({
        success: true,
        content: generatedContent,
        saved: savedContent.length,
      });
    } catch (error) {
      console.error("Error generating viral content:", error);
      res.status(500).json({ success: false, error: "Failed to generate viral content" });
    }
  });

  // Get viral content history
  app.get("/api/viral/content", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const content = await storage.getAllViralContent(limit);

      res.json({
        success: true,
        content,
        total: content.length,
      });
    } catch (error) {
      console.error("Error fetching viral content:", error);
      res.status(500).json({ success: false, error: "Failed to fetch content" });
    }
  });

  // Get all social posts
  app.get("/api/viral/posts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const posts = await storage.getAllSocialPosts(limit);

      res.json({
        success: true,
        posts,
        total: posts.length,
      });
    } catch (error) {
      console.error("Error fetching social posts:", error);
      res.status(500).json({ success: false, error: "Failed to fetch posts" });
    }
  });

  // Update a social post (for photo, etc.)
  app.patch("/api/viral/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, error: "Invalid post ID" });
      }

      const updateSchema = insertSocialPostSchema.partial().pick({
        thumbnailUrl: true,
        backgroundUrl: true,
        backgroundOpacity: true,
        title: true,
        description: true,
        showLogo: true,
        logoSize: true,
        logoPosition: true,
        platform: true,
        selectedHook: true,
        callToAction: true,
      });

      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Invalid update data" });
      }

      const updated = await storage.updateSocialPost(postId, parsed.data);
      if (!updated) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      res.json({
        success: true,
        post: updated,
      });
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ success: false, error: "Failed to update post" });
    }
  });

  // Approve a social post
  app.post("/api/viral/posts/:id/approve", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, error: "Invalid post ID" });
      }

      const { approvedBy = "User" } = req.body;
      const updated = await storage.updateSocialPost(postId, {
        status: "approved",
        approvedBy,
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      res.json({
        success: true,
        post: updated,
      });
    } catch (error) {
      console.error("Error approving post:", error);
      res.status(500).json({ success: false, error: "Failed to approve post" });
    }
  });

  // Reject a social post
  app.post("/api/viral/posts/:id/reject", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, error: "Invalid post ID" });
      }

      const updated = await storage.updateSocialPost(postId, {
        status: "rejected",
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      res.json({
        success: true,
        post: updated,
      });
    } catch (error) {
      console.error("Error rejecting post:", error);
      res.status(500).json({ success: false, error: "Failed to reject post" });
    }
  });

  // Delete a social post
  app.delete("/api/viral/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, error: "Invalid post ID" });
      }

      const deleted = await storage.deleteSocialPost(postId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ success: false, error: "Failed to delete post" });
    }
  });

  // Regenerate AI background for a post
  app.post("/api/viral/posts/:id/regenerate-background", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, error: "Invalid post ID" });
      }

      const post = await storage.getSocialPost(postId);
      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      // Generate new background image
      const backgroundPrompt = `Professional background for social media about "${post.title}" - Medicine & Money Show style, featuring real objects: stethoscope, gold coins, cash, medical equipment, financial charts, luxury items. Dark moody cinematic lighting, photorealistic, high quality, no people`;
      
      const imageBuffer = await generateImageBuffer(backgroundPrompt, "1024x1024");
      const backgroundUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;

      // Update the post with new background
      const updated = await storage.updateSocialPost(postId, { 
        backgroundUrl,
        backgroundOpacity: post.backgroundOpacity ?? 50
      });

      res.json({ success: true, post: updated });
    } catch (error) {
      console.error("Error regenerating background:", error);
      res.status(500).json({ success: false, error: "Failed to regenerate background" });
    }
  });

  // Post content to Go High Level social media
  app.post("/api/viral/posts/:id/publish", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ success: false, error: "Invalid post ID" });
      }

      const post = await storage.getSocialPost(postId);
      if (!post) {
        return res.status(404).json({ success: false, error: "Post not found" });
      }

      if (post.status !== "approved") {
        return res.status(400).json({ success: false, error: "Post must be approved before publishing" });
      }

      // Try publishing to Go High Level
      const hashtagsArray = Array.isArray(post.hashtags) ? post.hashtags as string[] : [];
      const postContent = post.selectedHook || post.title;
      const description = post.description || "";
      const cta = post.callToAction || "";
      const fullContent = [postContent, description, cta].filter(Boolean).join("\n\n");

      const ghlResult = await publishToGHL({
        summary: fullContent,
        mediaUrl: post.thumbnailUrl || undefined,
        platform: post.platform,
        hashtags: hashtagsArray,
      });

      // Mark as posted in our system regardless of GHL result
      const updated = await storage.updateSocialPost(postId, { 
        status: "posted",
        postedAt: new Date(),
        platformPostId: ghlResult.postId || null,
      });

      res.json({ 
        success: true, 
        post: updated,
        ghlPublished: ghlResult.success,
        ghlPostId: ghlResult.postId,
        message: ghlResult.success 
          ? "Post published to social media via Go High Level!" 
          : `Post marked as published. GHL: ${ghlResult.error}`,
      });
    } catch (error) {
      console.error("Error publishing post:", error);
      res.status(500).json({ success: false, error: "Failed to publish post" });
    }
  });

  // Get Go High Level connection status
  app.get("/api/ghl/status", async (req, res) => {
    try {
      const status = await getGHLConnectionStatus();
      res.json(status);
    } catch (error) {
      console.error("Error checking GHL status:", error);
      res.status(500).json({ connected: false, error: "Failed to check connection status" });
    }
  });

  // Analyze content for viral potential
  app.post("/api/viral/analyze", async (req, res) => {
    try {
      const bodySchema = z.object({
        content: z.string().min(1),
      });

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: "Content is required" });
      }

      const analysis = await viralAnalyzer.analyzeViralPotential(parsed.data.content);

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      console.error("Error analyzing content:", error);
      res.status(500).json({ success: false, error: "Failed to analyze content" });
    }
  });

  // ============================================
  // TEMPLATE LIBRARY ROUTES
  // ============================================

  // Get all templates (with optional category filter)
  app.get("/api/templates", async (req, res) => {
    try {
      const { category, search } = req.query;
      
      if (search && typeof search === "string") {
        const templates = await storage.searchTemplates(search);
        return res.json(templates);
      }
      
      const templates = await storage.getAllTemplates(
        category ? String(category) : undefined
      );
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get single template
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // Create template
  app.post("/api/templates", async (req, res) => {
    try {
      const parsed = insertTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid template data", details: parsed.error });
      }
      const template = await storage.createTemplate(parsed.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Update template
  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const parsed = insertTemplateSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid template data", details: parsed.error });
      }
      
      const template = await storage.updateTemplate(id, parsed.data);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Delete template
  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }
      
      const deleted = await storage.deleteTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // ============================================
  // BATCH EXPORT ROUTES
  // ============================================

  // Export single image in different formats
  app.post("/api/export/single", async (req, res) => {
    try {
      const bodySchema = z.object({
        imageData: z.string(),
        format: z.enum(["png", "jpg", "webp"]),
        quality: z.number().min(1).max(100).optional().default(90),
      });

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid export data", details: parsed.error });
      }

      const { imageData, format, quality } = parsed.data;
      
      // For now, we'll just return the image data with appropriate MIME type
      // In production, you'd want to use Sharp or similar for format conversion
      const mimeTypes: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        webp: "image/webp",
      };

      res.json({
        success: true,
        format,
        mimeType: mimeTypes[format],
        data: imageData,
        quality,
      });
    } catch (error) {
      console.error("Error exporting image:", error);
      res.status(500).json({ error: "Failed to export image" });
    }
  });

  // Batch export multiple thumbnails as ZIP
  app.post("/api/export/batch", async (req, res) => {
    try {
      const bodySchema = z.object({
        thumbnailIds: z.array(z.string()),
        format: z.enum(["png", "jpg", "webp"]).default("png"),
        includeConfig: z.boolean().optional().default(false),
      });

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid batch export data", details: parsed.error });
      }

      const { thumbnailIds, format, includeConfig } = parsed.data;

      // Fetch all thumbnails
      const thumbnailsData = await Promise.all(
        thumbnailIds.map(id => storage.getThumbnail(id))
      );

      const validThumbnails = thumbnailsData.filter(t => t !== undefined);

      if (validThumbnails.length === 0) {
        return res.status(404).json({ error: "No valid thumbnails found" });
      }

      // Create ZIP archive
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="thumbnails-export.zip"`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      for (const thumb of validThumbnails) {
        if (thumb.previewUrl) {
          // Extract base64 data and add to archive
          const base64Match = thumb.previewUrl.match(/^data:image\/\w+;base64,(.+)$/);
          if (base64Match) {
            const imageBuffer = Buffer.from(base64Match[1], "base64");
            archive.append(imageBuffer, { name: `${thumb.title || thumb.id}.${format}` });
          }
        }

        if (includeConfig) {
          archive.append(JSON.stringify(thumb.config, null, 2), { 
            name: `${thumb.title || thumb.id}-config.json` 
          });
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error("Error batch exporting:", error);
      res.status(500).json({ error: "Failed to batch export" });
    }
  });

  // ============================================
  // SCHEDULED CONTENT ROUTES
  // ============================================

  // Get all scheduled content
  app.get("/api/schedule", async (_req, res) => {
    try {
      const scheduled = await storage.getAllScheduledContent();
      res.json(scheduled);
    } catch (error) {
      console.error("Error fetching scheduled content:", error);
      res.status(500).json({ error: "Failed to fetch scheduled content" });
    }
  });

  // Get scheduled content by date range
  app.get("/api/schedule/range", async (req, res) => {
    try {
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ error: "Start and end dates are required" });
      }

      const startDate = new Date(String(start));
      const endDate = new Date(String(end));

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      const scheduled = await storage.getScheduledContentByDateRange(startDate, endDate);
      res.json(scheduled);
    } catch (error) {
      console.error("Error fetching scheduled content by range:", error);
      res.status(500).json({ error: "Failed to fetch scheduled content" });
    }
  });

  // Create scheduled content
  app.post("/api/schedule", async (req, res) => {
    try {
      const parsed = insertScheduledContentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid schedule data", details: parsed.error });
      }
      const scheduled = await storage.createScheduledContent(parsed.data);
      res.status(201).json(scheduled);
    } catch (error) {
      console.error("Error creating scheduled content:", error);
      res.status(500).json({ error: "Failed to create scheduled content" });
    }
  });

  // Update scheduled content
  app.patch("/api/schedule/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid schedule ID" });
      }
      
      const parsed = insertScheduledContentSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid schedule data", details: parsed.error });
      }
      
      const scheduled = await storage.updateScheduledContent(id, parsed.data);
      if (!scheduled) {
        return res.status(404).json({ error: "Scheduled content not found" });
      }
      res.json(scheduled);
    } catch (error) {
      console.error("Error updating scheduled content:", error);
      res.status(500).json({ error: "Failed to update scheduled content" });
    }
  });

  // Delete scheduled content
  app.delete("/api/schedule/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid schedule ID" });
      }
      
      const deleted = await storage.deleteScheduledContent(id);
      if (!deleted) {
        return res.status(404).json({ error: "Scheduled content not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting scheduled content:", error);
      res.status(500).json({ error: "Failed to delete scheduled content" });
    }
  });

  // ============================================
  // COLLECTION ROUTES
  // ============================================

  // Get all collections for a user
  app.get("/api/collections", async (req, res) => {
    try {
      const userId = String(req.query.userId || "default");
      const collections = await storage.getAllCollections(userId);
      res.json(collections);
    } catch (error) {
      console.error("Error fetching collections:", error);
      res.status(500).json({ error: "Failed to fetch collections" });
    }
  });

  // Get single collection
  app.get("/api/collections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid collection ID" });
      }
      
      const collection = await storage.getCollection(id);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error fetching collection:", error);
      res.status(500).json({ error: "Failed to fetch collection" });
    }
  });

  // Create collection
  app.post("/api/collections", async (req, res) => {
    try {
      const parsed = insertCollectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid collection data", details: parsed.error });
      }
      const collection = await storage.createCollection(parsed.data);
      res.status(201).json(collection);
    } catch (error) {
      console.error("Error creating collection:", error);
      res.status(500).json({ error: "Failed to create collection" });
    }
  });

  // Update collection
  app.patch("/api/collections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid collection ID" });
      }
      
      const parsed = insertCollectionSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid collection data", details: parsed.error });
      }
      
      const collection = await storage.updateCollection(id, parsed.data);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error updating collection:", error);
      res.status(500).json({ error: "Failed to update collection" });
    }
  });

  // Delete collection
  app.delete("/api/collections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid collection ID" });
      }
      
      const deleted = await storage.deleteCollection(id);
      if (!deleted) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting collection:", error);
      res.status(500).json({ error: "Failed to delete collection" });
    }
  });

  // ============================================
  // COLLABORATION ROUTES
  // ============================================

  // Get collaborations for a thumbnail
  app.get("/api/collaborations/thumbnail/:thumbnailId", async (req, res) => {
    try {
      const thumbnailId = parseInt(req.params.thumbnailId);
      if (isNaN(thumbnailId)) {
        return res.status(400).json({ error: "Invalid thumbnail ID" });
      }
      
      const collaborations = await storage.getCollaborationsByThumbnail(thumbnailId);
      res.json(collaborations);
    } catch (error) {
      console.error("Error fetching collaborations:", error);
      res.status(500).json({ error: "Failed to fetch collaborations" });
    }
  });

  // Get collaborations shared with a user
  app.get("/api/collaborations/user/:userId", async (req, res) => {
    try {
      const collaborations = await storage.getCollaborationsByUser(req.params.userId);
      res.json(collaborations);
    } catch (error) {
      console.error("Error fetching user collaborations:", error);
      res.status(500).json({ error: "Failed to fetch collaborations" });
    }
  });

  // Get collaboration by share token
  app.get("/api/collaborations/token/:token", async (req, res) => {
    try {
      const collaboration = await storage.getCollaborationByToken(req.params.token);
      if (!collaboration) {
        return res.status(404).json({ error: "Invalid or expired share link" });
      }
      
      // Check if expired
      if (collaboration.expiresAt && new Date(collaboration.expiresAt) < new Date()) {
        return res.status(410).json({ error: "Share link has expired" });
      }
      
      res.json(collaboration);
    } catch (error) {
      console.error("Error fetching collaboration by token:", error);
      res.status(500).json({ error: "Failed to fetch collaboration" });
    }
  });

  // Create collaboration (share a thumbnail)
  app.post("/api/collaborations", async (req, res) => {
    try {
      const bodyData = {
        ...req.body,
        shareToken: randomBytes(16).toString("hex"),
      };
      
      const parsed = insertCollaborationSchema.safeParse(bodyData);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid collaboration data", details: parsed.error });
      }
      
      const collaboration = await storage.createCollaboration(parsed.data);
      res.status(201).json(collaboration);
    } catch (error) {
      console.error("Error creating collaboration:", error);
      res.status(500).json({ error: "Failed to create collaboration" });
    }
  });

  // Delete collaboration (revoke sharing)
  app.delete("/api/collaborations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid collaboration ID" });
      }
      
      const deleted = await storage.deleteCollaboration(id);
      if (!deleted) {
        return res.status(404).json({ error: "Collaboration not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting collaboration:", error);
      res.status(500).json({ error: "Failed to delete collaboration" });
    }
  });

  // ============================================
  // COMMENT ROUTES
  // ============================================

  // Get comments for a thumbnail
  app.get("/api/comments/thumbnail/:thumbnailId", async (req, res) => {
    try {
      const thumbnailId = parseInt(req.params.thumbnailId);
      if (isNaN(thumbnailId)) {
        return res.status(400).json({ error: "Invalid thumbnail ID" });
      }
      
      const comments = await storage.getCommentsByThumbnail(thumbnailId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create comment
  app.post("/api/comments", async (req, res) => {
    try {
      const parsed = insertCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid comment data", details: parsed.error });
      }
      const comment = await storage.createComment(parsed.data);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Update comment (e.g., mark as resolved)
  app.patch("/api/comments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }
      
      const parsed = insertCommentSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid comment data", details: parsed.error });
      }
      
      const comment = await storage.updateComment(id, parsed.data);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // Delete comment
  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }
      
      const deleted = await storage.deleteComment(id);
      if (!deleted) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // ============================================
  // ANALYTICS ROUTES
  // ============================================

  // Track an analytics event
  app.post("/api/analytics", async (req, res) => {
    try {
      const parsed = insertAnalyticsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid analytics data", details: parsed.error });
      }
      const event = await storage.createAnalyticsEvent(parsed.data);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error tracking analytics:", error);
      res.status(500).json({ error: "Failed to track analytics" });
    }
  });

  // Get analytics by user
  app.get("/api/analytics/user/:userId", async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit || "100"));
      const analytics = await storage.getAnalyticsByUser(req.params.userId, limit);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Get analytics by action
  app.get("/api/analytics/action/:action", async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit || "100"));
      const analytics = await storage.getAnalyticsByAction(req.params.action, limit);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching action analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ============================================
  // BRAND KIT ROUTES
  // ============================================

  // Get all brand kits for a user
  app.get("/api/brand-kits", async (req, res) => {
    try {
      const userId = String(req.query.userId || "default");
      const brandKits = await storage.getAllBrandKits(userId);
      res.json(brandKits);
    } catch (error) {
      console.error("Error fetching brand kits:", error);
      res.status(500).json({ error: "Failed to fetch brand kits" });
    }
  });

  // Get single brand kit
  app.get("/api/brand-kits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid brand kit ID" });
      }
      
      const brandKit = await storage.getBrandKit(id);
      if (!brandKit) {
        return res.status(404).json({ error: "Brand kit not found" });
      }
      res.json(brandKit);
    } catch (error) {
      console.error("Error fetching brand kit:", error);
      res.status(500).json({ error: "Failed to fetch brand kit" });
    }
  });

  // Create brand kit
  app.post("/api/brand-kits", async (req, res) => {
    try {
      const parsed = insertBrandKitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid brand kit data", details: parsed.error });
      }
      const brandKit = await storage.createBrandKit(parsed.data);
      res.status(201).json(brandKit);
    } catch (error) {
      console.error("Error creating brand kit:", error);
      res.status(500).json({ error: "Failed to create brand kit" });
    }
  });

  // Update brand kit
  app.patch("/api/brand-kits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid brand kit ID" });
      }
      
      const parsed = insertBrandKitSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid brand kit data", details: parsed.error });
      }
      
      const brandKit = await storage.updateBrandKit(id, parsed.data);
      if (!brandKit) {
        return res.status(404).json({ error: "Brand kit not found" });
      }
      res.json(brandKit);
    } catch (error) {
      console.error("Error updating brand kit:", error);
      res.status(500).json({ error: "Failed to update brand kit" });
    }
  });

  // Delete brand kit
  app.delete("/api/brand-kits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid brand kit ID" });
      }
      
      const deleted = await storage.deleteBrandKit(id);
      if (!deleted) {
        return res.status(404).json({ error: "Brand kit not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting brand kit:", error);
      res.status(500).json({ error: "Failed to delete brand kit" });
    }
  });

  // YouTube API Routes
  
  // Check YouTube connection status
  app.get("/api/youtube/status", async (_req, res) => {
    try {
      const connected = await checkYouTubeConnection();
      res.json({ connected });
    } catch (error) {
      console.error("Error checking YouTube connection:", error);
      res.json({ connected: false });
    }
  });

  // Get YouTube videos from channel (cached for 10 min to save API quota)
  app.get("/api/youtube/videos", async (req, res) => {
    try {
      const maxResults = parseInt(req.query.maxResults as string) || 20;
      const daysBack = parseInt(req.query.daysBack as string) || 365;
      const forceRefresh = req.query.refresh === "true";
      
      const result = await fetchYouTubeVideos(maxResults, daysBack, forceRefresh);
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching YouTube videos:", error);
      if (error?.message?.includes("quota") || error?.code === 403 || error?.errors?.[0]?.reason === "quotaExceeded") {
        return res.status(429).json({ error: "YouTube API quota exceeded. Please try again later (resets at midnight Pacific Time)." });
      }
      res.status(500).json({ error: "Failed to fetch YouTube videos" });
    }
  });

  // AI-optimize SEO for a video
  const optimizeSeoSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional().default(""),
    tags: z.array(z.string().max(100)).max(500).optional().default([]),
  });

  app.post("/api/youtube/optimize-seo", async (req, res) => {
    try {
      const parsed = optimizeSeoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request data", details: parsed.error });
      }

      const { title, description, tags } = parsed.data;
      const isShort = req.body.isShort === true;

      let prompt;
      
      if (isShort) {
        prompt = `You are a YouTube Shorts viral optimization expert for "The Medicine & Money Show" podcast about medicine and money/finance. Optimize the following Short for maximum virality and engagement.

Current Title: ${title}
Current Description: ${description || "(no description)"}
Current Tags: ${tags?.join(", ") || "(no tags)"}

Generate a VIRAL optimized description and tags specifically for YouTube Shorts. The description should:
- Start with a powerful hook or controversy that stops scrolling
- Be punchy and short (under 150 words) - Shorts viewers don't read long descriptions
- Include trending hashtags like #shorts #viral #fyp
- Include niche-specific hashtags for medicine, money, healthcare, finance
- Have an urgent call-to-action (Follow for more, Like if you agree, etc.)
- Use emojis strategically to catch attention

Generate 20-30 highly viral tags that:
- Include #shorts (MANDATORY)
- Include viral hashtags (#viral, #fyp, #trending, #foryou)
- Include medicine/health hashtags (#health, #doctor, #medical, #healthcare)
- Include money/finance hashtags (#money, #finance, #investing, #wealth)
- Include engagement hashtags (#motivation, #success, #tips)
- Include The Medicine & Money Show branding

Return JSON format:
{
  "optimizedDescription": "your viral short description here",
  "optimizedTags": ["shorts", "viral", "fyp", ...]
}`;
      } else {
        prompt = `You are a YouTube SEO expert for "The Medicine & Money Show" podcast. Optimize the following video metadata for maximum discoverability and engagement.

Current Title: ${title}
Current Description: ${description || "(no description)"}
Current Tags: ${tags?.join(", ") || "(no tags)"}

Generate an optimized description and tags. The description should:
- Start with a compelling hook in the first 2 sentences (this appears in search results)
- Include relevant keywords naturally
- Have a clear call-to-action
- Include timestamps if appropriate
- Be between 200-500 words

Generate 15-25 highly relevant tags that:
- Include the exact video topic
- Include related topics and synonyms
- Include common misspellings if applicable
- Are ordered from most specific to most general

Return JSON format:
{
  "optimizedDescription": "your optimized description here",
  "optimizedTags": ["tag1", "tag2", ...]
}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "{}";
      
      let result;
      try {
        result = JSON.parse(content);
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      res.json({
        optimizedDescription: result.optimizedDescription || description,
        optimizedTags: result.optimizedTags || tags || [],
      });
    } catch (error) {
      console.error("Error optimizing SEO:", error);
      res.status(500).json({ error: "Failed to optimize SEO" });
    }
  });

  // Update a YouTube video
  const updateVideoSchema = z.object({
    title: z.string().min(1).max(100),
    description: z.string().max(5000).optional().default(""),
    tags: z.array(z.string().max(100)).max(500).optional().default([]),
    categoryId: z.string().optional(),
  });

  app.patch("/api/youtube/videos/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      if (!videoId) {
        return res.status(400).json({ error: "Video ID is required" });
      }

      const parsed = updateVideoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request data", details: parsed.error });
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
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error("Error updating YouTube video:", error);
      res.status(500).json({ error: "Failed to update YouTube video" });
    }
  });

  // Bulk YouTube Metadata Optimization
  const bulkOptimizeSchema = z.object({
    videoIds: z.array(z.string()).optional(), // If not provided, optimize all videos
    maxVideos: z.number().min(1).max(50).optional().default(10),
    skipAlreadyOptimized: z.boolean().optional().default(true),
    dryRun: z.boolean().optional().default(false), // Preview without updating
  });

  // Track optimized videos in memory (in production, use database)
  const optimizedVideos = new Set<string>();

  app.post("/api/youtube/bulk-optimize", async (req, res) => {
    try {
      const parsed = bulkOptimizeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request data", details: parsed.error });
      }

      const { videoIds, maxVideos, skipAlreadyOptimized, dryRun } = parsed.data;

      // Fetch videos from channel
      const { videos: allVideos } = await fetchYouTubeVideos(50, 365);
      
      // Filter to requested videos or all videos
      let videosToProcess = videoIds 
        ? allVideos.filter(v => videoIds.includes(v.videoId))
        : allVideos;

      // Skip already optimized if requested
      if (skipAlreadyOptimized) {
        videosToProcess = videosToProcess.filter(v => !optimizedVideos.has(v.videoId));
      }

      // Limit to maxVideos
      videosToProcess = videosToProcess.slice(0, maxVideos);

      if (videosToProcess.length === 0) {
        return res.json({
          success: true,
          message: "No videos to optimize. All videos may already be optimized.",
          processed: 0,
          results: [],
        });
      }

      const results: Array<{
        videoId: string;
        title: string;
        status: "success" | "failed" | "skipped";
        message: string;
        optimizedDescription?: string;
        optimizedTags?: string[];
      }> = [];

      // Process each video with rate limiting (1 per second to respect API quotas)
      for (const video of videosToProcess) {
        try {
          // Generate optimized metadata using AI
          const isShort = video.title.toLowerCase().includes("#shorts") || 
                          video.description?.toLowerCase().includes("#shorts");

          const prompt = isShort
            ? `You are a YouTube Shorts viral optimization expert for "The Medicine & Money Show" podcast about medicine and finance.

Video Title: ${video.title}
Current Description: ${video.description || "(no description)"}
Current Tags: ${video.tags?.join(", ") || "(no tags)"}

Generate a VIRAL optimized description and tags for this Short. Include:
- A powerful hook that stops scrolling
- Punchy and short (under 150 words)
- Trending hashtags: #shorts #viral #fyp
- Niche hashtags: #health #doctor #money #finance
- Urgent call-to-action

Return JSON:
{
  "optimizedDescription": "your viral description",
  "optimizedTags": ["shorts", "viral", ...]
}`
            : `You are a YouTube SEO expert for "The Medicine & Money Show" podcast about physician finance and entrepreneurship.

Video Title: ${video.title}
Current Description: ${video.description || "(no description)"}
Current Tags: ${video.tags?.join(", ") || "(no tags)"}

Generate an optimized description and tags. The description should:
- Start with a compelling hook (appears in search results)
- Include relevant keywords naturally
- Have a clear call-to-action
- Be 200-400 words
- Include "The Medicine & Money Show" branding

Generate 15-25 relevant tags ordered from specific to general.

Return JSON:
{
  "optimizedDescription": "your optimized description",
  "optimizedTags": ["tag1", "tag2", ...]
}`;

          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });

          const content = aiResponse.choices[0]?.message?.content || "{}";
          const optimized = JSON.parse(content);

          if (!optimized.optimizedDescription) {
            results.push({
              videoId: video.videoId,
              title: video.title,
              status: "failed",
              message: "AI did not return a valid description",
            });
            continue;
          }

          if (dryRun) {
            // Preview mode - don't actually update
            results.push({
              videoId: video.videoId,
              title: video.title,
              status: "success",
              message: "Preview generated (dry run - not updated on YouTube)",
              optimizedDescription: optimized.optimizedDescription,
              optimizedTags: optimized.optimizedTags,
            });
          } else {
            // Actually update the video on YouTube
            const updateResult = await updateYouTubeVideo(
              video.videoId,
              video.title, // Keep original title
              optimized.optimizedDescription,
              optimized.optimizedTags || video.tags,
              video.categoryId
            );

            if (updateResult.success) {
              optimizedVideos.add(video.videoId);
              results.push({
                videoId: video.videoId,
                title: video.title,
                status: "success",
                message: "Successfully updated on YouTube",
                optimizedDescription: optimized.optimizedDescription,
                optimizedTags: optimized.optimizedTags,
              });
            } else {
              results.push({
                videoId: video.videoId,
                title: video.title,
                status: "failed",
                message: updateResult.message,
              });
            }
          }

          // Rate limiting: wait 1 second between API calls
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (videoError: any) {
          results.push({
            videoId: video.videoId,
            title: video.title,
            status: "failed",
            message: videoError.message || "Unknown error",
          });
        }
      }

      const successCount = results.filter(r => r.status === "success").length;
      const failedCount = results.filter(r => r.status === "failed").length;

      res.json({
        success: true,
        message: dryRun 
          ? `Preview generated for ${successCount} videos (dry run)`
          : `Optimized ${successCount} videos, ${failedCount} failed`,
        processed: results.length,
        successCount,
        failedCount,
        results,
      });

    } catch (error: any) {
      console.error("Error in bulk optimize:", error);
      res.status(500).json({ 
        error: "Failed to bulk optimize videos",
        details: error.message 
      });
    }
  });

  // Get optimization status (uses cached video data to avoid extra API calls)
  app.get("/api/youtube/optimization-status", async (_req, res) => {
    try {
      const cached = getCachedVideos();
      const { videos } = cached || await fetchYouTubeVideos(50, 365);
      
      const status = videos.map(v => ({
        videoId: v.videoId,
        title: v.title,
        isOptimized: optimizedVideos.has(v.videoId),
        hasDescription: !!v.description && v.description.length > 50,
        tagsCount: v.tags?.length || 0,
      }));

      res.json({
        totalVideos: videos.length,
        optimizedCount: status.filter(s => s.isOptimized).length,
        videos: status,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/youtube/analytics", async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === "true";
      const stats = await fetchVideoStatistics(forceRefresh);
      res.json({ videos: stats, totalVideos: stats.length });
    } catch (error: any) {
      console.error("Error fetching video analytics:", error);
      if (error.message?.includes("quota")) {
        res.status(429).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Failed to fetch video analytics" });
      }
    }
  });

  app.get("/api/youtube/channel", async (_req, res) => {
    try {
      const stats = await fetchChannelStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching channel stats:", error);
      res.status(500).json({ error: error.message || "Failed to fetch channel stats" });
    }
  });

  app.get("/api/youtube/seo-score/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      const stats = await fetchVideoStatistics();
      const video = stats.find(v => v.videoId === videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const prompt = `You are a YouTube SEO expert. Score this video's metadata out of 100 and provide specific improvements.

Video Title: "${video.title}"
Description: "${video.description?.substring(0, 500)}"
Tags: ${JSON.stringify(video.tags || [])}
Views: ${video.viewCount}, Likes: ${video.likeCount}, Comments: ${video.commentCount}

Return ONLY valid JSON:
{
  "overallScore": number (0-100),
  "titleScore": number (0-100),
  "titleAnalysis": "brief analysis",
  "titleSuggestion": "improved title",
  "descriptionScore": number (0-100),
  "descriptionAnalysis": "brief analysis",
  "descriptionSuggestions": ["suggestion1", "suggestion2"],
  "tagsScore": number (0-100),
  "tagsAnalysis": "brief analysis",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "thumbnailTips": "thumbnail optimization tips",
  "engagementAnalysis": "analysis of engagement metrics",
  "topPriorities": ["priority1", "priority2", "priority3"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const seoResult = JSON.parse(response.choices[0].message.content || "{}");
      res.json({ video, seo: seoResult });
    } catch (error: any) {
      console.error("Error scoring video SEO:", error);
      res.status(500).json({ error: error.message || "Failed to score video SEO" });
    }
  });

  app.post("/api/youtube/tag-research", async (req, res) => {
    try {
      const { topic, niche } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const prompt = `You are a YouTube keyword and tag research expert specializing in the "${niche || 'physician finance, investing, and entrepreneurship'}" niche.

Research topic: "${topic}"

Provide comprehensive tag and keyword research. Return ONLY valid JSON:
{
  "primaryKeywords": [{"keyword": "term", "searchVolume": "high/medium/low", "competition": "high/medium/low", "relevance": number (1-10)}],
  "longTailKeywords": [{"keyword": "longer phrase", "searchVolume": "low/medium", "competition": "low/medium", "relevance": number}],
  "trendingTags": ["tag1", "tag2"],
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15"],
  "titleSuggestions": ["title 1", "title 2", "title 3"],
  "hashTags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "relatedTopics": ["topic1", "topic2", "topic3"],
  "contentAngle": "suggested angle or hook for this topic",
  "targetAudience": "who this content should target"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 3000,
      });

      const research = JSON.parse(response.choices[0].message.content || "{}");
      res.json(research);
    } catch (error: any) {
      console.error("Error researching tags:", error);
      res.status(500).json({ error: error.message || "Failed to research tags" });
    }
  });

  app.get("/api/youtube/best-time", async (_req, res) => {
    try {
      const stats = await fetchVideoStatistics();
      if (stats.length === 0) {
        return res.json({ analysis: null, message: "No videos found to analyze" });
      }

      const videoData = stats.map(v => ({
        publishedAt: v.publishedAt,
        views: v.viewCount,
        likes: v.likeCount,
        comments: v.commentCount,
        engagement: v.engagementRate,
        title: v.title.substring(0, 60),
      }));

      const prompt = `You are a YouTube analytics expert. Analyze these video publishing times and performance to determine the best times to post.

Video data (${videoData.length} videos):
${JSON.stringify(videoData, null, 1)}

Return ONLY valid JSON:
{
  "bestDays": [{"day": "Monday", "score": number (1-10), "reason": "why"}],
  "bestHours": [{"hour": "2:00 PM EST", "score": number (1-10), "reason": "why"}],
  "bestCombinations": [{"day": "Tuesday", "time": "3:00 PM EST", "confidence": "high/medium/low"}],
  "worstTimes": [{"day": "Saturday", "time": "3:00 AM EST", "reason": "why"}],
  "insights": ["insight1", "insight2", "insight3"],
  "recommendation": "Your top recommendation for when to publish",
  "publishingSchedule": {"monday": "time or null", "tuesday": "time or null", "wednesday": "time or null", "thursday": "time or null", "friday": "time or null", "saturday": "time or null", "sunday": "time or null"}
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      res.json({ analysis, videosAnalyzed: stats.length });
    } catch (error: any) {
      console.error("Error analyzing best time:", error);
      res.status(500).json({ error: error.message || "Failed to analyze best posting times" });
    }
  });

  app.get("/api/youtube/competitor/:handle", async (req, res) => {
    try {
      const { handle } = req.params;
      if (!handle) {
        return res.status(400).json({ error: "Channel handle is required" });
      }

      const cleanHandle = handle.replace(/^@/, "");
      const data = await fetchCompetitorData(cleanHandle);

      const myChannel = await fetchChannelStats();
      const myStats = await fetchVideoStatistics();

      const myAvgViews = myStats.length > 0 ? Math.round(myStats.reduce((sum, v) => sum + v.viewCount, 0) / myStats.length) : 0;
      const myAvgEngagement = myStats.length > 0 ? Math.round(myStats.reduce((sum, v) => sum + v.engagementRate, 0) / myStats.length * 100) / 100 : 0;

      const compAvgViews = data.recentVideos.length > 0 ? Math.round(data.recentVideos.reduce((sum, v) => sum + v.viewCount, 0) / data.recentVideos.length) : 0;
      const compAvgEngagement = data.recentVideos.length > 0 ? Math.round(data.recentVideos.reduce((sum, v) => sum + v.engagementRate, 0) / data.recentVideos.length * 100) / 100 : 0;

      res.json({
        competitor: data.channel,
        competitorVideos: data.recentVideos,
        comparison: {
          you: {
            subscribers: myChannel.subscriberCount,
            totalViews: myChannel.viewCount,
            videoCount: myChannel.videoCount,
            avgViews: myAvgViews,
            avgEngagement: myAvgEngagement,
          },
          competitor: {
            subscribers: data.channel.subscriberCount,
            totalViews: data.channel.viewCount,
            videoCount: data.channel.videoCount,
            avgViews: compAvgViews,
            avgEngagement: compAvgEngagement,
          },
        },
      });
    } catch (error: any) {
      console.error("Error fetching competitor data:", error);
      res.status(500).json({ error: error.message || "Failed to fetch competitor data" });
    }
  });

  // Trend Analysis API
  app.post("/api/trends/analyze", async (req, res) => {
    try {
      const { niche } = req.body;
      
      const systemPrompt = `You are a trend analysis expert for content creators. Analyze current trends for the "${niche || 'general'}" niche.`;
      
      const userPrompt = `Generate trending topics and style recommendations for the "${niche || 'general'}" niche.

Return a JSON object with:
{
  "topics": [
    {
      "topic": "Topic name",
      "score": 85,
      "change": "up" | "down" | "stable",
      "category": "Category name",
      "relatedKeywords": ["keyword1", "keyword2"],
      "suggestedStyles": ["style suggestion 1", "style suggestion 2"],
      "peakTime": "When this content performs best"
    }
  ],
  "styles": [
    {
      "name": "Style name",
      "popularity": 90,
      "examples": ["Channel1", "Channel2"],
      "colors": ["#HEX1", "#HEX2", "#HEX3"],
      "fonts": ["Font1", "Font2"]
    }
  ]
}

Generate 5 trending topics and 5 style trends specific to this niche.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      const result = JSON.parse(content);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing trends:", error);
      res.status(500).json({ error: "Failed to analyze trends" });
    }
  });

  // Viral Hook Generator API
  app.post("/api/hooks/generate", async (req, res) => {
    try {
      const { topic, hookType } = req.body;
      
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const systemPrompt = `You are a viral content expert specializing in creating attention-grabbing hooks for YouTube videos and social media content. Your hooks should be concise, punchy, and designed to maximize engagement.`;

      const hookStyles = hookType === "all" 
        ? "curiosity gap, controversial, story hook, question hook, shocking stat, and promise hook"
        : hookType;

      const userPrompt = `Generate 6 viral hooks for the following topic: "${topic}"

${hookType === "all" ? "Include a variety of hook styles:" : `Focus on ${hookStyles} style hooks:`}

Return JSON:
{
  "hooks": [
    {
      "text": "The actual hook text (15-50 words)",
      "score": 75-100 virality score,
      "type": "curiosity" | "controversy" | "story" | "question" | "statistic" | "promise",
      "emotion": "Main emotion triggered (curiosity, fear, excitement, urgency, hope)",
      "reasoning": "Brief explanation of why this hook works"
    }
  ]
}

Make hooks specific to "${topic}" and relevant to medical/finance professionals.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      const result = JSON.parse(content);
      res.json(result);
    } catch (error) {
      console.error("Error generating hooks:", error);
      res.status(500).json({ error: "Failed to generate hooks" });
    }
  });

  // Brand Kit Management API
  app.get("/api/brand-kits", async (req, res) => {
    try {
      const kits = await db.select().from(brandKitsTable).orderBy(desc(brandKitsTable.createdAt));
      res.json(kits);
    } catch (error) {
      console.error("Error fetching brand kits:", error);
      res.status(500).json({ error: "Failed to fetch brand kits" });
    }
  });

  app.post("/api/brand-kits", async (req, res) => {
    try {
      const { name, primaryColor, secondaryColor, accentColor, backgroundColor, primaryFont, secondaryFont, logoUrl } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const [newKit] = await db.insert(brandKitsTable).values({
        userId: "default",
        name,
        colors: {
          primary: primaryColor || "#0066CC",
          secondary: secondaryColor || "#003366",
          accent: accentColor || "#66B2FF",
          background: backgroundColor || "#FFFFFF",
          text: "#000000"
        },
        fonts: {
          heading: primaryFont || "Inter",
          body: secondaryFont || "Open Sans",
          accent: primaryFont || "Inter"
        },
        logos: logoUrl ? [{ url: logoUrl, variant: "primary" }] : [],
      }).returning();

      res.json(newKit);
    } catch (error) {
      console.error("Error creating brand kit:", error);
      res.status(500).json({ error: "Failed to create brand kit" });
    }
  });

  app.patch("/api/brand-kits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const [updated] = await db.update(brandKitsTable)
        .set(updates)
        .where(eq(brandKitsTable.id, parseInt(id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Brand kit not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating brand kit:", error);
      res.status(500).json({ error: "Failed to update brand kit" });
    }
  });

  app.delete("/api/brand-kits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(brandKitsTable).where(eq(brandKitsTable.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting brand kit:", error);
      res.status(500).json({ error: "Failed to delete brand kit" });
    }
  });

  app.post("/api/brand-kits/:id/default", async (req, res) => {
    try {
      const { id } = req.params;
      res.json({ success: true, id: parseInt(id) });
    } catch (error) {
      console.error("Error setting default brand kit:", error);
      res.status(500).json({ error: "Failed to set default brand kit" });
    }
  });

  // A/B Testing Routes
  app.get("/api/ab-tests", async (_req, res) => {
    try {
      const tests = await db.select().from(abTestsTable).orderBy(desc(abTestsTable.createdAt));
      res.json(tests);
    } catch (error) {
      console.error("Error fetching A/B tests:", error);
      res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });

  app.post("/api/ab-tests", async (req, res) => {
    try {
      const parsed = insertABTestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid A/B test data", details: parsed.error });
      }
      const [newTest] = await db.insert(abTestsTable).values(parsed.data).returning();
      res.status(201).json(newTest);
    } catch (error) {
      console.error("Error creating A/B test:", error);
      res.status(500).json({ error: "Failed to create A/B test" });
    }
  });

  app.patch("/api/ab-tests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, winner, name, description, variants } = req.body;
      const validStatuses = ["draft", "active", "completed"];
      
      const updateData: Record<string, any> = {};
      if (status !== undefined) {
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status. Must be: draft, active, or completed" });
        }
        updateData.status = status;
      }
      if (winner !== undefined) updateData.winner = winner;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (variants !== undefined) updateData.variants = variants;
      
      const [updated] = await db.update(abTestsTable)
        .set(updateData)
        .where(eq(abTestsTable.id, parseInt(id)))
        .returning();
      if (!updated) {
        return res.status(404).json({ error: "A/B test not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating A/B test:", error);
      res.status(500).json({ error: "Failed to update A/B test" });
    }
  });

  app.delete("/api/ab-tests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(abTestsTable).where(eq(abTestsTable.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting A/B test:", error);
      res.status(500).json({ error: "Failed to delete A/B test" });
    }
  });

  // Thumbnail Tags Routes
  app.get("/api/thumbnail-tags", async (_req, res) => {
    try {
      const tags = await db.select().from(thumbnailTagsTable);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching thumbnail tags:", error);
      res.status(500).json({ error: "Failed to fetch thumbnail tags" });
    }
  });

  app.post("/api/thumbnail-tags", async (req, res) => {
    try {
      const parsed = insertThumbnailTagSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid tag data", details: parsed.error });
      }
      const [newTag] = await db.insert(thumbnailTagsTable).values(parsed.data).returning();
      res.status(201).json(newTag);
    } catch (error) {
      console.error("Error creating thumbnail tag:", error);
      res.status(500).json({ error: "Failed to create thumbnail tag" });
    }
  });

  app.delete("/api/thumbnail-tags/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(thumbnailTagsTable).where(eq(thumbnailTagsTable.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting thumbnail tag:", error);
      res.status(500).json({ error: "Failed to delete thumbnail tag" });
    }
  });

  // Thumbnail Folders Routes
  app.get("/api/thumbnail-folders", async (_req, res) => {
    try {
      const folders = await db.select().from(thumbnailFoldersTable).orderBy(thumbnailFoldersTable.name);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching thumbnail folders:", error);
      res.status(500).json({ error: "Failed to fetch thumbnail folders" });
    }
  });

  app.post("/api/thumbnail-folders", async (req, res) => {
    try {
      const parsed = insertThumbnailFolderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid folder data", details: parsed.error });
      }
      const [newFolder] = await db.insert(thumbnailFoldersTable).values(parsed.data).returning();
      res.status(201).json(newFolder);
    } catch (error) {
      console.error("Error creating thumbnail folder:", error);
      res.status(500).json({ error: "Failed to create thumbnail folder" });
    }
  });

  app.delete("/api/thumbnail-folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(thumbnailFoldersTable).where(eq(thumbnailFoldersTable.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting thumbnail folder:", error);
      res.status(500).json({ error: "Failed to delete thumbnail folder" });
    }
  });

  // Analytics Dashboard Routes
  
  /**
   * @swagger
   * /analytics/summary:
   *   get:
   *     summary: Get analytics summary for all thumbnails
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter start date (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter end date (YYYY-MM-DD)
   *     responses:
   *       200:
   *         description: Analytics summary with total impressions, clicks, and per-thumbnail stats
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AnalyticsSummary'
   *       500:
   *         description: Server error
   */
  app.get("/api/analytics/summary", async (req, res) => {
    try {
      // Parse date range from query params
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);
      
      // Get total impressions and clicks within date range
      const totals = await db.select({
        totalImpressions: sql<number>`COALESCE(SUM(${thumbnailAnalyticsTable.impressions}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${thumbnailAnalyticsTable.clicks}), 0)`,
      }).from(thumbnailAnalyticsTable)
        .where(and(
          gte(thumbnailAnalyticsTable.date, start),
          sql`${thumbnailAnalyticsTable.date} <= ${end}`
        ));
      
      // Get per-thumbnail stats within date range
      const thumbnailStats = await db.select({
        thumbnailId: thumbnailAnalyticsTable.thumbnailId,
        impressions: sql<number>`COALESCE(SUM(${thumbnailAnalyticsTable.impressions}), 0)`,
        clicks: sql<number>`COALESCE(SUM(${thumbnailAnalyticsTable.clicks}), 0)`,
      })
      .from(thumbnailAnalyticsTable)
      .where(and(
        gte(thumbnailAnalyticsTable.date, start),
        sql`${thumbnailAnalyticsTable.date} <= ${end}`
      ))
      .groupBy(thumbnailAnalyticsTable.thumbnailId);
      
      // Get thumbnails for title lookup
      const allThumbnails = await storage.getAllThumbnails();
      
      // Combine data with engagement rates
      const thumbnailsWithStats = thumbnailStats.map(stat => {
        const thumb = allThumbnails.find(t => t.id === stat.thumbnailId);
        const impressions = Number(stat.impressions);
        const clicks = Number(stat.clicks);
        const engagementRate = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00";
        return {
          thumbnailId: stat.thumbnailId,
          title: thumb?.title || "Unknown",
          impressions,
          clicks,
          engagementRate: parseFloat(engagementRate),
        };
      });
      
      const totalImpressions = Number(totals[0]?.totalImpressions || 0);
      const totalClicks = Number(totals[0]?.totalClicks || 0);
      const overallEngagement = totalImpressions > 0 
        ? ((totalClicks / totalImpressions) * 100).toFixed(2) 
        : "0.00";
      
      res.json({
        totalImpressions,
        totalClicks,
        overallEngagementRate: parseFloat(overallEngagement),
        thumbnails: thumbnailsWithStats.sort((a, b) => b.impressions - a.impressions),
      });
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ error: "Failed to fetch analytics summary" });
    }
  });
  
  /**
   * @swagger
   * /analytics/thumbnail/{thumbnailId}:
   *   get:
   *     summary: Get analytics for a specific thumbnail
   *     tags: [Analytics]
   *     parameters:
   *       - in: path
   *         name: thumbnailId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The thumbnail ID
   *     responses:
   *       200:
   *         description: Detailed analytics for the thumbnail
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ThumbnailAnalytics'
   *       500:
   *         description: Server error
   */
  app.get("/api/analytics/thumbnail/:thumbnailId", async (req, res) => {
    try {
      const { thumbnailId } = req.params;
      
      // Get daily stats for the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailyStats = await db.select()
        .from(thumbnailAnalyticsTable)
        .where(and(
          eq(thumbnailAnalyticsTable.thumbnailId, thumbnailId),
          gte(thumbnailAnalyticsTable.date, thirtyDaysAgo)
        ))
        .orderBy(desc(thumbnailAnalyticsTable.date));
      
      // Get total stats
      const totals = await db.select({
        totalImpressions: sql<number>`COALESCE(SUM(${thumbnailAnalyticsTable.impressions}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${thumbnailAnalyticsTable.clicks}), 0)`,
      })
      .from(thumbnailAnalyticsTable)
      .where(eq(thumbnailAnalyticsTable.thumbnailId, thumbnailId));
      
      const totalImpressions = Number(totals[0]?.totalImpressions || 0);
      const totalClicks = Number(totals[0]?.totalClicks || 0);
      const engagementRate = totalImpressions > 0 
        ? ((totalClicks / totalImpressions) * 100).toFixed(2) 
        : "0.00";
      
      res.json({
        thumbnailId,
        totalImpressions,
        totalClicks,
        engagementRate: parseFloat(engagementRate),
        dailyStats: dailyStats.map(d => ({
          date: d.date,
          impressions: d.impressions,
          clicks: d.clicks,
          platform: d.platform,
        })),
      });
    } catch (error) {
      console.error("Error fetching thumbnail analytics:", error);
      res.status(500).json({ error: "Failed to fetch thumbnail analytics" });
    }
  });
  
  /**
   * @swagger
   * /analytics/event:
   *   post:
   *     summary: Record an analytics event (impression or click)
   *     tags: [Analytics]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AnalyticsEvent'
   *     responses:
   *       201:
   *         description: Event recorded successfully
   *       400:
   *         description: Invalid event data
   *       500:
   *         description: Server error
   */
  app.post("/api/analytics/event", async (req, res) => {
    try {
      const parsed = insertAnalyticsEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid event data", details: parsed.error });
      }
      
      const { thumbnailId, eventType, platform, source, metadata } = parsed.data;
      
      // Insert the event
      const [event] = await db.insert(analyticsEventsTable)
        .values({ thumbnailId, eventType, platform, source, metadata })
        .returning();
      
      // Update or create daily analytics record
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingRecord = await db.select()
        .from(thumbnailAnalyticsTable)
        .where(and(
          eq(thumbnailAnalyticsTable.thumbnailId, thumbnailId),
          eq(thumbnailAnalyticsTable.date, today),
          eq(thumbnailAnalyticsTable.platform, platform || "youtube")
        ))
        .limit(1);
      
      if (existingRecord.length > 0) {
        // Update existing record
        const updateField = eventType === "click" ? "clicks" : "impressions";
        await db.update(thumbnailAnalyticsTable)
          .set({
            [updateField]: sql`${thumbnailAnalyticsTable[updateField as "clicks" | "impressions"]} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(thumbnailAnalyticsTable.id, existingRecord[0].id));
      } else {
        // Create new record
        await db.insert(thumbnailAnalyticsTable).values({
          thumbnailId,
          date: today,
          impressions: eventType === "impression" ? 1 : 0,
          clicks: eventType === "click" ? 1 : 0,
          platform: platform || "youtube",
          source: source || "organic",
        });
      }
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error recording analytics event:", error);
      res.status(500).json({ error: "Failed to record analytics event" });
    }
  });
  
  /**
   * @swagger
   * /analytics/bulk:
   *   post:
   *     summary: Bulk import analytics data
   *     tags: [Analytics]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BulkAnalytics'
   *     responses:
   *       201:
   *         description: Analytics data imported successfully
   *       400:
   *         description: Missing required fields
   *       500:
   *         description: Server error
   */
  app.post("/api/analytics/bulk", async (req, res) => {
    try {
      const { thumbnailId, impressions, clicks, platform, date } = req.body;
      
      if (!thumbnailId || impressions === undefined || clicks === undefined) {
        return res.status(400).json({ error: "Missing required fields: thumbnailId, impressions, clicks" });
      }
      
      const recordDate = date ? new Date(date) : new Date();
      recordDate.setHours(0, 0, 0, 0);
      
      const [record] = await db.insert(thumbnailAnalyticsTable).values({
        thumbnailId,
        date: recordDate,
        impressions: Number(impressions),
        clicks: Number(clicks),
        platform: platform || "youtube",
        source: "import",
      }).returning();
      
      res.status(201).json(record);
    } catch (error) {
      console.error("Error bulk recording analytics:", error);
      res.status(500).json({ error: "Failed to bulk record analytics" });
    }
  });
  
  /**
   * @swagger
   * /analytics/events/{thumbnailId}:
   *   get:
   *     summary: Get paginated events for a thumbnail
   *     tags: [Analytics]
   *     parameters:
   *       - in: path
   *         name: thumbnailId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number (1-indexed)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 50
   *           maximum: 100
   *         description: Items per page (max 100)
   *     responses:
   *       200:
   *         description: Paginated list of events
   */
  app.get("/api/analytics/events/:thumbnailId", async (req, res) => {
    try {
      const { thumbnailId } = req.params;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;
      
      const [events, totalResult] = await Promise.all([
        db.select()
          .from(analyticsEventsTable)
          .where(eq(analyticsEventsTable.thumbnailId, thumbnailId))
          .orderBy(desc(analyticsEventsTable.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() })
          .from(analyticsEventsTable)
          .where(eq(analyticsEventsTable.thumbnailId, thumbnailId))
      ]);
      
      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        data: events,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Error fetching analytics events:", error);
      res.status(500).json({ error: "Failed to fetch analytics events" });
    }
  });

  /**
   * @swagger
   * /status:
   *   get:
   *     summary: Get API status and health check
   *     tags: [System]
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   enum: [healthy, degraded, down]
   *                 version:
   *                   type: string
   *                 uptime:
   *                   type: number
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 services:
   *                   type: object
   */
  const startTime = Date.now();
  
  app.get("/api/status", async (_req, res) => {
    try {
      const services: Record<string, { status: string; latency?: number }> = {};
      
      // Check database
      const dbStart = Date.now();
      try {
        await db.select({ count: sql<number>`1` }).from(thumbnails).limit(1);
        services.database = { status: "healthy", latency: Date.now() - dbStart };
      } catch {
        services.database = { status: "down" };
      }
      
      // Check OpenAI API
      services.openai = { 
        status: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? "configured" : "not_configured" 
      };
      
      // Check YouTube integration
      services.youtube = { 
        status: process.env.YOUTUBE_REFRESH_TOKEN ? "configured" : "not_configured" 
      };
      
      const allHealthy = Object.values(services).every(s => 
        s.status === "healthy" || s.status === "configured"
      );
      
      res.json({
        status: allHealthy ? "healthy" : "degraded",
        version: "1.0.0",
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
        services,
        rateLimit: {
          analytics: { read: "100/min", write: "30/min" },
          images: "10/min",
          youtube: "50/min",
          general: "200/min"
        }
      });
    } catch (error) {
      res.status(500).json({ 
        status: "down", 
        error: "Health check failed",
        timestamp: new Date().toISOString()
      });
    }
  });

  // ===== ADMIN AGENT ROUTES =====
  
  // Get agent logs
  app.get("/api/admin/agent-logs", async (req, res) => {
    try {
      const agentType = req.query.type as string;
      const { agentLogsTable } = await import("@shared/schema");
      
      let logs;
      if (agentType) {
        logs = await db.select().from(agentLogsTable)
          .where(eq(agentLogsTable.agentType, agentType))
          .orderBy(desc(agentLogsTable.createdAt))
          .limit(100);
      } else {
        logs = await db.select().from(agentLogsTable)
          .orderBy(desc(agentLogsTable.createdAt))
          .limit(100);
      }
      res.json(logs);
    } catch (error) {
      console.error("Error fetching agent logs:", error);
      res.status(500).json({ error: "Failed to fetch agent logs" });
    }
  });

  // Update agent log status
  app.patch("/api/admin/agent-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const { agentLogsTable } = await import("@shared/schema");
      
      const updates: any = { status };
      if (status === "resolved") {
        updates.resolvedAt = new Date();
      }
      
      const [updated] = await db.update(agentLogsTable)
        .set(updates)
        .where(eq(agentLogsTable.id, id))
        .returning();
        
      res.json(updated);
    } catch (error) {
      console.error("Error updating agent log:", error);
      res.status(500).json({ error: "Failed to update agent log" });
    }
  });

  // Get feature recommendations
  app.get("/api/admin/recommendations", async (req, res) => {
    try {
      const { featureRecommendationsTable } = await import("@shared/schema");
      const recommendations = await db.select().from(featureRecommendationsTable)
        .orderBy(desc(featureRecommendationsTable.createdAt))
        .limit(50);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // Update recommendation status
  app.patch("/api/admin/recommendations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const { featureRecommendationsTable } = await import("@shared/schema");
      
      const [updated] = await db.update(featureRecommendationsTable)
        .set({ status, reviewedAt: new Date() })
        .where(eq(featureRecommendationsTable.id, id))
        .returning();
        
      res.json(updated);
    } catch (error) {
      console.error("Error updating recommendation:", error);
      res.status(500).json({ error: "Failed to update recommendation" });
    }
  });

  // Run Code Guardian scan
  app.post("/api/admin/run-guardian", async (req, res) => {
    try {
      const { agentLogsTable, insertAgentLogSchema } = await import("@shared/schema");
      
      // Simulate code guardian analysis with AI
      const guardianPrompt = `You are a Code Guardian agent analyzing a YouTube thumbnail generator application. 
      Generate 3-5 potential code issues that might exist in such an application.
      For each issue, provide:
      - title: Short issue name
      - description: What the issue is
      - severity: one of 'info', 'warning', 'error', 'critical'
      - filePath: A realistic file path
      - recommendation: How to fix it
      
      Return ONLY valid JSON array format: [{ title, description, severity, filePath, recommendation }]`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: guardianPrompt }],
        max_tokens: 1000,
      });
      
      const content = response.choices[0]?.message?.content || "[]";
      let issues = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          issues = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        issues = [];
      }
      
      // Save issues to database
      for (const issue of issues) {
        const logData = insertAgentLogSchema.parse({
          agentType: "guardian",
          action: "error_detected",
          severity: issue.severity || "info",
          title: issue.title,
          description: issue.description,
          filePath: issue.filePath,
          recommendation: issue.recommendation,
          status: "pending"
        });
        await db.insert(agentLogsTable).values(logData);
      }
      
      // Add scan complete log
      await db.insert(agentLogsTable).values({
        agentType: "guardian",
        action: "scan_complete",
        severity: "info",
        title: "Code Guardian Scan Complete",
        description: `Found ${issues.length} potential issues`,
        status: "resolved"
      });
      
      res.json({ success: true, issuesFound: issues.length });
    } catch (error) {
      console.error("Error running guardian:", error);
      res.status(500).json({ error: "Failed to run guardian scan" });
    }
  });

  // Run Code Upgrade analysis
  app.post("/api/admin/run-upgrade", async (req, res) => {
    try {
      const { agentLogsTable, featureRecommendationsTable, insertAgentLogSchema, insertFeatureRecommendationSchema } = await import("@shared/schema");
      
      // Generate upgrade suggestions
      const upgradePrompt = `You are a Code Upgrade agent analyzing a YouTube thumbnail generator application.
      The app has: thumbnail editor, AI backgrounds, social media suite, analytics, collaboration features.
      
      Generate 2-3 code upgrade suggestions AND 2-3 new feature recommendations.
      
      Return JSON:
      {
        "upgrades": [{ "title": string, "description": string, "filePath": string, "recommendation": string }],
        "features": [{ "title": string, "description": string, "priority": "low"|"medium"|"high", "category": "enhancement"|"performance"|"security"|"ux", "estimatedEffort": "small"|"medium"|"large", "rationale": string }]
      }`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: upgradePrompt }],
        max_tokens: 1500,
      });
      
      const content = response.choices[0]?.message?.content || "{}";
      let result: { upgrades: any[], features: any[] } = { upgrades: [], features: [] };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // ignore
      }
      
      // Save upgrade suggestions
      for (const upgrade of result.upgrades || []) {
        const logData = insertAgentLogSchema.parse({
          agentType: "upgrade",
          action: "recommendation",
          severity: "info",
          title: upgrade.title,
          description: upgrade.description,
          filePath: upgrade.filePath,
          recommendation: upgrade.recommendation,
          status: "pending"
        });
        await db.insert(agentLogsTable).values(logData);
      }
      
      // Save feature recommendations
      for (const feature of result.features || []) {
        const recData = insertFeatureRecommendationSchema.parse({
          title: feature.title,
          description: feature.description,
          priority: feature.priority || "medium",
          category: feature.category || "enhancement",
          estimatedEffort: feature.estimatedEffort,
          rationale: feature.rationale,
          status: "pending"
        });
        await db.insert(featureRecommendationsTable).values(recData);
      }
      
      res.json({ 
        success: true, 
        upgradesFound: (result.upgrades || []).length,
        featuresFound: (result.features || []).length 
      });
    } catch (error) {
      console.error("Error running upgrade agent:", error);
      res.status(500).json({ error: "Failed to run upgrade analysis" });
    }
  });

  // Implement upgrade suggestion - generates implementation plan
  app.post("/api/admin/agent-logs/:id/implement", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { agentLogsTable } = await import("@shared/schema");
      
      const [log] = await db.select().from(agentLogsTable).where(eq(agentLogsTable.id, id));
      if (!log) {
        return res.status(404).json({ error: "Suggestion not found" });
      }

      const implementPrompt = `You are a senior developer implementing a code upgrade for a YouTube thumbnail generator app built with React, TypeScript, Express, and PostgreSQL.

Upgrade suggestion:
Title: ${log.title}
Description: ${log.description || ""}
File: ${log.filePath || "Unknown"}
Recommendation: ${log.recommendation || ""}

Generate a detailed implementation plan with specific code changes. Return JSON:
{
  "summary": "Brief summary of what will be changed",
  "steps": [
    {
      "step": 1,
      "description": "What this step does",
      "file": "path/to/file.tsx",
      "action": "modify|create|delete",
      "codeSnippet": "Key code to add/change (show the important parts)",
      "impact": "What this change improves"
    }
  ],
  "estimatedImpact": "Description of performance/quality improvement",
  "risks": "Any potential risks or considerations"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: implementPrompt }],
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "{}";
      let implementationPlan: any = {};
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          implementationPlan = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        implementationPlan = { summary: "Could not parse implementation plan", steps: [], estimatedImpact: "Unknown", risks: "Plan could not be generated" };
      }

      // Update the log with implementation plan and set status to in_progress
      const [updated] = await db.update(agentLogsTable)
        .set({ 
          status: "in_progress",
          metadata: { ...((log.metadata as any) || {}), implementationPlan }
        })
        .where(eq(agentLogsTable.id, id))
        .returning();

      res.json({ success: true, log: updated, implementationPlan });
    } catch (error) {
      console.error("Error implementing upgrade:", error);
      res.status(500).json({ error: "Failed to generate implementation plan" });
    }
  });

  // Apply/complete an implementation
  app.post("/api/admin/agent-logs/:id/apply", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { agentLogsTable } = await import("@shared/schema");
      
      const [updated] = await db.update(agentLogsTable)
        .set({ 
          status: "resolved",
          resolvedAt: new Date()
        })
        .where(eq(agentLogsTable.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error applying upgrade:", error);
      res.status(500).json({ error: "Failed to apply upgrade" });
    }
  });

  // Bulk implement all pending items for a given agent type
  app.post("/api/admin/agent-logs/bulk-implement", async (req, res) => {
    try {
      const { type } = req.body;
      if (!type || !["guardian", "upgrade"].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be 'guardian' or 'upgrade'" });
      }
      const { agentLogsTable } = await import("@shared/schema");
      
      const pendingLogs = await db.select().from(agentLogsTable)
        .where(and(eq(agentLogsTable.agentType, type), eq(agentLogsTable.status, "pending")));
      
      if (pendingLogs.length === 0) {
        return res.json({ success: true, processed: 0, message: "No pending items to process" });
      }

      const results: any[] = [];
      for (const log of pendingLogs) {
        try {
          const implementPrompt = `You are a senior developer implementing a code ${type === 'guardian' ? 'fix' : 'upgrade'} for a YouTube thumbnail generator app built with React, TypeScript, Express, and PostgreSQL.

${type === 'guardian' ? 'Issue' : 'Upgrade suggestion'}:
Title: ${log.title}
Description: ${log.description || ""}
File: ${log.filePath || "Unknown"}
Recommendation: ${log.recommendation || ""}

Generate a detailed implementation plan with specific code changes. Return JSON:
{
  "summary": "Brief summary of what will be changed",
  "steps": [
    {
      "step": 1,
      "description": "What this step does",
      "file": "path/to/file.tsx",
      "action": "modify|create|delete",
      "codeSnippet": "Key code to add/change",
      "impact": "What this change improves"
    }
  ],
  "estimatedImpact": "Description of improvement",
  "risks": "Any potential risks"
}`;

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: implementPrompt }],
            max_tokens: 2000,
          });

          const content = response.choices[0]?.message?.content || "{}";
          let implementationPlan: any = {};
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              implementationPlan = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            implementationPlan = { summary: "Could not parse plan", steps: [], estimatedImpact: "Unknown", risks: "Plan generation failed" };
          }

          const [updated] = await db.update(agentLogsTable)
            .set({ 
              status: "in_progress",
              metadata: { ...((log.metadata as any) || {}), implementationPlan }
            })
            .where(eq(agentLogsTable.id, log.id))
            .returning();

          results.push({ id: log.id, status: "implemented", title: log.title });
        } catch (err) {
          results.push({ id: log.id, status: "failed", title: log.title });
        }
      }

      res.json({ success: true, processed: results.length, results });
    } catch (error) {
      console.error("Error in bulk implement:", error);
      res.status(500).json({ error: "Bulk implementation failed" });
    }
  });

  // Bulk apply all in_progress items for a given agent type
  app.post("/api/admin/agent-logs/bulk-apply", async (req, res) => {
    try {
      const { type } = req.body;
      if (!type || !["guardian", "upgrade"].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be 'guardian' or 'upgrade'" });
      }
      const { agentLogsTable } = await import("@shared/schema");
      
      const updated = await db.update(agentLogsTable)
        .set({ 
          status: "resolved",
          resolvedAt: new Date()
        })
        .where(and(eq(agentLogsTable.agentType, type), eq(agentLogsTable.status, "in_progress")))
        .returning();

      res.json({ success: true, processed: updated.length });
    } catch (error) {
      console.error("Error in bulk apply:", error);
      res.status(500).json({ error: "Bulk apply failed" });
    }
  });

  // ===== Saved Photos API =====
  app.get("/api/saved-photos", async (req, res) => {
    try {
      const photos = await storage.getAllSavedPhotos();
      res.json(photos);
    } catch (error) {
      console.error("Error fetching saved photos:", error);
      res.status(500).json({ error: "Failed to fetch saved photos" });
    }
  });

  app.get("/api/saved-photos/:id/image", async (req, res) => {
    try {
      const photo = await storage.getSavedPhoto(req.params.id);
      if (!photo) return res.status(404).json({ error: "Photo not found" });
      
      const base64Data = photo.imageData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const mimeMatch = photo.imageData.match(/^data:(image\/\w+);base64,/);
      const mime = mimeMatch ? mimeMatch[1] : "image/png";
      
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.send(buffer);
    } catch (error) {
      console.error("Error fetching saved photo image:", error);
      res.status(500).json({ error: "Failed to fetch photo" });
    }
  });

  app.post("/api/saved-photos", async (req, res) => {
    try {
      const parsed = insertSavedPhotoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      }
      const photo = await storage.createSavedPhoto(parsed.data);
      res.json({ id: photo.id, name: photo.name, createdAt: photo.createdAt });
    } catch (error) {
      console.error("Error saving photo:", error);
      res.status(500).json({ error: "Failed to save photo" });
    }
  });

  app.delete("/api/saved-photos/:id", async (req, res) => {
    try {
      await storage.deleteSavedPhoto(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting saved photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // ============================================
  // Speaker Kit Routes
  // ============================================

  app.get("/api/speaker-kits", async (req, res) => {
    try {
      const kits = await storage.getAllSpeakerKits();
      res.json(kits);
    } catch (error) {
      console.error("Error fetching speaker kits:", error);
      res.status(500).json({ error: "Failed to fetch speaker kits" });
    }
  });

  app.get("/api/speaker-kits/:id", async (req, res) => {
    try {
      const kit = await storage.getSpeakerKit(parseInt(req.params.id));
      if (!kit) return res.status(404).json({ error: "Speaker kit not found" });
      res.json(kit);
    } catch (error) {
      console.error("Error fetching speaker kit:", error);
      res.status(500).json({ error: "Failed to fetch speaker kit" });
    }
  });

  app.post("/api/speaker-kits", async (req, res) => {
    try {
      const parsed = insertSpeakerKitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      }
      const kit = await storage.createSpeakerKit(parsed.data);
      res.json(kit);
    } catch (error) {
      console.error("Error creating speaker kit:", error);
      res.status(500).json({ error: "Failed to create speaker kit" });
    }
  });

  app.patch("/api/speaker-kits/:id", async (req, res) => {
    try {
      const parsed = insertSpeakerKitSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      }
      const kit = await storage.updateSpeakerKit(parseInt(req.params.id), parsed.data);
      if (!kit) return res.status(404).json({ error: "Speaker kit not found" });
      res.json(kit);
    } catch (error) {
      console.error("Error updating speaker kit:", error);
      res.status(500).json({ error: "Failed to update speaker kit" });
    }
  });

  app.delete("/api/speaker-kits/:id", async (req, res) => {
    try {
      await storage.deleteSpeakerKit(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting speaker kit:", error);
      res.status(500).json({ error: "Failed to delete speaker kit" });
    }
  });

  // ============================================
  // Speaker Opportunity Routes
  // ============================================

  app.get("/api/speaker-opportunities", async (req, res) => {
    try {
      const opportunities = await storage.getAllSpeakerOpportunities();
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/speaker-opportunities/:id", async (req, res) => {
    try {
      const opp = await storage.getSpeakerOpportunity(parseInt(req.params.id));
      if (!opp) return res.status(404).json({ error: "Opportunity not found" });
      res.json(opp);
    } catch (error) {
      console.error("Error fetching opportunity:", error);
      res.status(500).json({ error: "Failed to fetch opportunity" });
    }
  });

  app.post("/api/speaker-opportunities", async (req, res) => {
    try {
      const parsed = insertSpeakerOpportunitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      }
      const opp = await storage.createSpeakerOpportunity(parsed.data);
      res.json(opp);
    } catch (error) {
      console.error("Error creating opportunity:", error);
      res.status(500).json({ error: "Failed to create opportunity" });
    }
  });

  app.patch("/api/speaker-opportunities/:id", async (req, res) => {
    try {
      const parsed = insertSpeakerOpportunitySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      }
      const opp = await storage.updateSpeakerOpportunity(parseInt(req.params.id), parsed.data);
      if (!opp) return res.status(404).json({ error: "Opportunity not found" });
      res.json(opp);
    } catch (error) {
      console.error("Error updating opportunity:", error);
      res.status(500).json({ error: "Failed to update opportunity" });
    }
  });

  app.delete("/api/speaker-opportunities/:id", async (req, res) => {
    try {
      await storage.deleteSpeakerOpportunity(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      res.status(500).json({ error: "Failed to delete opportunity" });
    }
  });

  // AI-powered opportunity search
  app.post("/api/speaker-opportunities/search", async (req, res) => {
    try {
      const { prompt, speakerKitId } = req.body;
      if (!prompt) return res.status(400).json({ error: "Search prompt is required" });

      let speakerContext = "";
      if (speakerKitId) {
        const kit = await storage.getSpeakerKit(speakerKitId);
        if (kit) {
          speakerContext = `\nSpeaker Profile:\n- Name: ${kit.name}\n- Title: ${kit.title}\n- Bio: ${kit.bio}\n- Topics: ${(kit.topics || []).join(", ")}\n- Programs: ${(kit.programs || []).map((p: any) => p.title).join(", ")}`;
        }
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a speaker opportunity research assistant. Based on the user's search prompt, generate a list of 5-8 realistic and relevant speaking opportunities. Each opportunity should include realistic details that match the speaker's expertise.${speakerContext}

Return a JSON object with an "opportunities" key containing an array of opportunities with these fields:
- title: Name of the event/opportunity
- organization: Hosting organization
- type: "conference" | "podcast" | "summit" | "workshop" | "webinar" | "panel"
- description: Brief description of the opportunity
- location: City, State or "Virtual"
- date: Approximate date range (e.g., "March 2026", "Q2 2026")
- deadline: Application deadline
- compensation: Expected compensation or "Unpaid" or "Travel covered"
- audienceSize: Estimated audience size
- requirements: What they're looking for in speakers
- contactEmail: A realistic contact email
- url: A realistic URL for the opportunity
- source: Where this was found (e.g., "SpeakerHub", "Conference Alerts", "Podcast Booking")

Make the opportunities diverse (mix of conferences, podcasts, summits, etc.) and realistic for the speaker's niche.`
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      const opportunities = Array.isArray(parsed) ? parsed : (parsed.opportunities || parsed.results || []);
      res.json({ opportunities });
    } catch (error) {
      console.error("Error searching opportunities:", error);
      res.status(500).json({ error: "Failed to search opportunities" });
    }
  });

  // AI-powered application auto-fill
  app.post("/api/speaker-opportunities/auto-fill", async (req, res) => {
    try {
      const { opportunityId, speakerKitId } = req.body;
      if (!speakerKitId) return res.status(400).json({ error: "Speaker kit ID is required" });

      const kit = await storage.getSpeakerKit(speakerKitId);
      if (!kit) return res.status(404).json({ error: "Speaker kit not found" });

      let oppContext = "";
      if (opportunityId) {
        const opp = await storage.getSpeakerOpportunity(opportunityId);
        if (opp) {
          oppContext = `\nOpportunity Details:\n- Event: ${opp.title}\n- Organization: ${opp.organization}\n- Type: ${opp.type}\n- Description: ${opp.description}\n- Requirements: ${opp.requirements}`;
        }
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a speaker application assistant. Using the speaker's profile, generate a compelling application for a speaking opportunity. Create professional, personalized responses.

Speaker Profile:
- Name: ${kit.name}
- Title: ${kit.title || ""}
- Bio: ${kit.bio || ""}
- Topics: ${(kit.topics || []).join(", ")}
- Programs: ${(kit.programs || []).map((p: any) => `${p.title}: ${p.bio}`).join("\n  ")}
- Testimonials: ${(kit.testimonials || []).map((t: any) => `"${t.quote}" - ${t.author}`).join("\n  ")}
${oppContext}

Return a JSON object with these application fields:
- speakerBio: A tailored 150-word bio for this opportunity
- proposedTopics: Array of 2-3 topic titles relevant to this event
- talkAbstract: A compelling 200-word talk abstract
- whyMe: A persuasive paragraph on why this speaker is perfect for this event
- audienceValue: What the audience will gain
- previousExperience: Highlight relevant past speaking experience
- techRequirements: Standard technical requirements
- socialProof: Key testimonials and achievements to include`
          },
          { role: "user", content: `Generate an application for this speaking opportunity.${oppContext}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const applicationData = JSON.parse(content);
      res.json({ applicationData });
    } catch (error) {
      console.error("Error generating application:", error);
      res.status(500).json({ error: "Failed to generate application" });
    }
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/speaker-kits/parse-document", upload.single("document"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      let extractedText = "";

      if (file.mimetype === "application/pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text;
      } else if (
        file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.mimetype === "application/msword"
      ) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        extractedText = result.value;
      } else if (file.mimetype === "text/plain") {
        extractedText = file.buffer.toString("utf-8");
      } else {
        return res.status(400).json({ error: "Unsupported file type. Please upload a PDF, Word document (.docx), or text file." });
      }

      if (!extractedText.trim()) {
        return res.status(400).json({ error: "Could not extract any text from the document." });
      }

      const truncated = extractedText.substring(0, 8000);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an assistant that extracts speaker profile information from documents. 
Given the text from a speaker kit, bio, resume, or similar document, extract as much relevant information as possible and return it as JSON.

Return a JSON object with these fields (leave empty string or empty array if not found):
{
  "name": "speaker's full name",
  "title": "professional title or tagline",
  "bio": "speaker bio / about section",
  "email": "email address",
  "phone": "phone number",
  "website": "website URL",
  "socialLinks": {
    "linkedin": "linkedin URL",
    "twitter": "twitter/X URL",
    "instagram": "instagram URL",
    "facebook": "facebook URL",
    "youtube": "youtube URL"
  },
  "programs": [
    {
      "title": "program/talk title",
      "format": "Keynote or Workshop or Virtual Presentation or Panel",
      "bio": "description of this program",
      "takeaways": ["takeaway 1", "takeaway 2"]
    }
  ],
  "topics": ["topic 1", "topic 2"],
  "testimonials": [
    {
      "quote": "testimonial text",
      "author": "person's name",
      "role": "their title/company"
    }
  ],
  "featuredPodcasts": [
    {
      "name": "podcast name",
      "url": "url if available"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Extract speaker profile information from this document:\n\n${truncated}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {};
      }
      res.json({ extracted: parsed, rawTextPreview: truncated.substring(0, 500) });
    } catch (error) {
      console.error("Error parsing document:", error);
      res.status(500).json({ error: "Failed to parse document. Please try again." });
    }
  });

  // AI Thumbnail Scoring - analyzes thumbnail image and returns score + suggestions
  app.post("/api/thumbnail/score", async (req, res) => {
    try {
      const { imageDataUrl } = req.body;
      if (!imageDataUrl || typeof imageDataUrl !== "string") {
        return res.status(400).json({ error: "imageDataUrl is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are an expert YouTube thumbnail analyst. You evaluate thumbnails based on professional criteria that drive high click-through rates. You must return ONLY valid JSON with no additional text.

Score the thumbnail from 0-100 based on these categories (each scored 0-100):
1. "contrast" - Color contrast and visual pop. Do elements stand out? Is there sufficient contrast between text and background?
2. "textReadability" - Can text be read at small sizes (mobile)? Is font size large enough? Is there text shadow/outline for visibility?
3. "composition" - Rule of thirds, visual hierarchy, focal point placement, use of negative space
4. "colorPsychology" - Emotional impact of colors. Do colors match the content topic? Are colors attention-grabbing?
5. "facesAndEmotions" - Are human faces/emotions visible and expressive? Faces with strong emotions drive 30%+ more clicks
6. "thumbnailClarity" - Will it be clear and recognizable as a small 120x90 thumbnail on mobile?
7. "brandConsistency" - Does it have consistent branding elements (colors, style, logo)?
8. "clickBait" - Curiosity gap - does it make viewers NEED to click? Intrigue without being misleading

Return JSON format:
{
  "overallScore": number,
  "categories": {
    "contrast": { "score": number, "feedback": "string" },
    "textReadability": { "score": number, "feedback": "string" },
    "composition": { "score": number, "feedback": "string" },
    "colorPsychology": { "score": number, "feedback": "string" },
    "facesAndEmotions": { "score": number, "feedback": "string" },
    "thumbnailClarity": { "score": number, "feedback": "string" },
    "brandConsistency": { "score": number, "feedback": "string" },
    "clickBait": { "score": number, "feedback": "string" }
  },
  "topImprovements": [
    { "priority": 1, "category": "string", "action": "specific actionable improvement" },
    { "priority": 2, "category": "string", "action": "specific actionable improvement" },
    { "priority": 3, "category": "string", "action": "specific actionable improvement" }
  ],
  "optimizationSuggestions": {
    "textColor": "suggested hex color or null",
    "textSize": "increase/decrease/keep or null",
    "backgroundColor": "suggested hex color or gradient or null",
    "addTextShadow": true/false,
    "addTextOutline": true/false,
    "increaseContrast": true/false,
    "suggestedTextOutlineColor": "hex color or null",
    "suggestedOverlayOpacity": number or null
  }
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this YouTube thumbnail and score it. Be critical but fair. Focus on what would actually improve click-through rates."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl
                }
              }
            ]
          }
        ],
        max_completion_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }
      const parsed = JSON.parse(jsonMatch[0]);
      res.json(parsed);
    } catch (error: any) {
      console.error("Error scoring thumbnail:", error);
      res.status(500).json({ error: "Failed to score thumbnail. Please try again." });
    }
  });

  // AI Thumbnail Auto-Optimize - returns optimized config suggestions
  app.post("/api/thumbnail/optimize", async (req, res) => {
    try {
      const { imageDataUrl, currentConfig, scoreData } = req.body;
      if (!imageDataUrl || !currentConfig) {
        return res.status(400).json({ error: "imageDataUrl and currentConfig are required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: `You are an expert YouTube thumbnail optimizer. Given a thumbnail image, its current configuration, and its score analysis, suggest SPECIFIC config changes to maximize the score. You must return ONLY valid JSON.

The thumbnail config has these modifiable properties:
- overlays: array of text overlays with { fontSize, fontColor, fontWeight, textShadow, strokeColor, strokeWidth } (do NOT change text content)
- backgroundColor: hex color or CSS gradient string
- backgroundOpacity: 0-100
- accentColor: must be one of "orange", "blue", or "purple" only

Return JSON with ONLY the fields that should change:
{
  "changes": {
    "overlays": [{ "id": "existing-id", "fontColor": "#FFFFFF", "fontSize": 72, "strokeColor": "#000000", "strokeWidth": 3, "textShadow": "2px 2px 4px rgba(0,0,0,0.8)" }],
    "backgroundColor": "#1a1a2e",
    "backgroundOpacity": 40,
    "accentColor": "#FF6600"
  },
  "explanation": "Brief explanation of what was changed and why",
  "expectedScoreImprovement": number
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Optimize this thumbnail to maximize its score. Current score data: ${JSON.stringify(scoreData || {})}. Current config: ${JSON.stringify({
                  overlays: currentConfig.overlays?.map((o: any) => ({ id: o.id, text: o.text, fontSize: o.fontSize, fontColor: o.fontColor, x: o.x, y: o.y, fontWeight: o.fontWeight, strokeColor: o.strokeColor, strokeWidth: o.strokeWidth, textShadow: o.textShadow })),
                  backgroundColor: currentConfig.backgroundColor,
                  backgroundOpacity: currentConfig.backgroundOpacity,
                  accentColor: currentConfig.accentColor,
                })}`
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl }
              }
            ]
          }
        ],
        max_completion_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "Failed to parse AI optimization response" });
      }
      const parsed = JSON.parse(jsonMatch[0]);
      res.json(parsed);
    } catch (error: any) {
      console.error("Error optimizing thumbnail:", error);
      res.status(500).json({ error: "Failed to optimize thumbnail. Please try again." });
    }
  });

  // Website Copy & SEO Evaluator - analyzes website against 15 P's, SEO, graphics, performance, security, mobile, content
  app.post("/api/site-evaluator/evaluate", async (req, res) => {
    try {
      const { url, rawContent, userId, email } = req.body;

      if (!url && !rawContent) {
        return res.status(400).json({ error: "Provide a URL or paste content to evaluate." });
      }

      let pageContent = rawContent || "";
      let pageUrl = url || "pasted content";

      if (url && !rawContent) {
        try {
          const parsedUrl = new URL(url);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return res.status(400).json({ error: "Only http and https URLs are allowed." });
          }
          const hostname = parsedUrl.hostname.toLowerCase();
          const blockedPatterns = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.", "192.168.", "169.254.", "metadata.google"];
          if (blockedPatterns.some((p) => hostname.startsWith(p) || hostname === p)) {
            return res.status(400).json({ error: "Internal or private URLs are not allowed." });
          }
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; SiteEvaluator/1.0)" },
            signal: controller.signal,
            redirect: "follow",
          });
          clearTimeout(timeout);
          pageContent = await response.text();
        } catch (fetchError: any) {
          return res.status(400).json({ error: `Could not fetch the website: ${fetchError.message}. Try pasting the content instead.` });
        }
      }

      const proofId = randomBytes(8).toString("hex");

      const reviewRecord = await storage.createSiteReview({
        url: pageUrl,
        status: "analyzing",
        proofId,
        userId: userId || null,
        email: email || null,
      });

      const truncatedContent = pageContent.substring(0, 30000);

      const evaluationPrompt = `You are an expert website evaluator specializing in copywriting (using the 15 P's of Compelling Copy framework by Brand Builders Group), SEO analysis, graphic/design evaluation, performance analysis, security assessment, mobile optimization, and content quality.

Analyze the following website content and return a comprehensive JSON evaluation.

The 15 P's of Compelling Copy are:
1. Problem - Does the copy clearly identify the audience's pain point or problem?
2. Promise - Is there a clear promise of what the reader/customer will gain?
3. Picture - Does the copy paint a vivid picture of the desired outcome or transformation?
4. Proof - Is there social proof, testimonials, case studies, or evidence of results?
5. Proposition - Is the unique value proposition clear and differentiated?
6. Price - Is pricing presented in a way that anchors value and justifies the investment?
7. Push - Is there urgency, scarcity, or a compelling reason to act now?
8. Pull-Back - Is there risk reversal (guarantees, free trials, money-back offers)?
9. Purpose - Does the brand communicate a higher purpose, mission, or "why"?
10. Personality - Does authentic brand voice and personality come through?
11. Proximity - Does the copy create closeness and make the reader feel understood?
12. Positioning - Is the brand clearly positioned and differentiated from alternatives?
13. Platform - Is the copy optimized for the medium/platform it appears on?
14. Progression - Does the copy guide the reader through a logical, compelling journey?
15. Prestige - Does the copy build authority, credibility, and aspirational status?

Return ONLY valid JSON in this exact structure:
{
  "url": "${pageUrl}",
  "copyScore": <0-100 overall copy score>,
  "seoScore": <0-100 overall SEO score>,
  "graphicsScore": <0-100 overall graphics/design score>,
  "performanceScore": <0-100 overall performance score>,
  "securityScore": <0-100 overall security score>,
  "mobileScore": <0-100 overall mobile optimization score>,
  "contentScore": <0-100 overall content quality score>,
  "overallScore": <0-100 weighted average of all 7 categories>,
  "copySummary": "<2-3 sentence summary of the copy quality>",
  "topPriorities": ["<priority 1>", "<priority 2>", "<priority 3>", "<priority 4>", "<priority 5>"],
  "fifteenPs": [
    {"key": "problem", "score": <0-100>, "analysis": "<2-3 sentences>", "suggestions": ["<suggestion 1>", "<suggestion 2>"]},
    {"key": "promise", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "picture", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "proof", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "proposition", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "price", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "push", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "pullback", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "purpose", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "personality", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "proximity", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "positioning", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "platform", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "progression", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]},
    {"key": "prestige", "score": <0-100>, "analysis": "<analysis>", "suggestions": ["<suggestion>"]}
  ],
  "seo": {
    "score": <0-100>,
    "title": {"present": <true/false>, "optimized": <true/false>, "text": "<title tag text>", "suggestion": "<suggestion>"},
    "metaDescription": {"present": <true/false>, "optimized": <true/false>, "text": "<meta description>", "suggestion": "<suggestion>"},
    "headings": {"h1Count": <number>, "h2Count": <number>, "structure": "<assessment>", "suggestion": "<suggestion>"},
    "images": {"total": <number>, "withAlt": <number>, "suggestion": "<suggestion>"},
    "links": {"internal": <number>, "external": <number>, "suggestion": "<suggestion>"},
    "mobile": {"responsive": <true/false>, "suggestion": "<suggestion>"},
    "speed": {"suggestion": "<suggestion>"},
    "schema": {"present": <true/false>, "suggestion": "<suggestion>"},
    "keywords": {"found": ["<keyword1>", "<keyword2>", "<keyword3>"], "suggestion": "<suggestion>"},
    "overallSuggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
  },
  "graphics": {
    "score": <0-100>,
    "visualHierarchy": {"score": <0-100>, "analysis": "<assessment>", "suggestion": "<suggestion>"},
    "colorScheme": {"score": <0-100>, "analysis": "<assessment>", "suggestion": "<suggestion>"},
    "typography": {"score": <0-100>, "analysis": "<assessment>", "suggestion": "<suggestion>"},
    "imagery": {"score": <0-100>, "analysis": "<assessment>", "suggestion": "<suggestion>"},
    "whitespace": {"score": <0-100>, "analysis": "<assessment>", "suggestion": "<suggestion>"},
    "consistency": {"score": <0-100>, "analysis": "<assessment>", "suggestion": "<suggestion>"},
    "callToAction": {"score": <0-100>, "analysis": "<assessment>", "suggestion": "<suggestion>"},
    "overallSuggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
  },
  "performance": {
    "score": <0-100>,
    "loadSpeed": {"score": <0-100>, "analysis": "<assessment of page load indicators, script sizes, render-blocking resources>", "suggestion": "<suggestion>"},
    "cdn": {"score": <0-100>, "analysis": "<assessment of CDN usage, external resource hosting>", "suggestion": "<suggestion>"},
    "caching": {"score": <0-100>, "analysis": "<assessment of caching headers, service worker usage>", "suggestion": "<suggestion>"},
    "codeOptimization": {"score": <0-100>, "analysis": "<assessment of minification, dead code, bundle size indicators>", "suggestion": "<suggestion>"},
    "bundleSize": {"score": <0-100>, "analysis": "<assessment of script/css file sizes and count>", "suggestion": "<suggestion>"},
    "overallSuggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
  },
  "security": {
    "score": <0-100>,
    "https": {"score": <0-100>, "analysis": "<assessment of HTTPS usage, mixed content>", "suggestion": "<suggestion>"},
    "authPatterns": {"score": <0-100>, "analysis": "<assessment of authentication patterns, login forms, token handling>", "suggestion": "<suggestion>"},
    "headers": {"score": <0-100>, "analysis": "<assessment of security headers like CSP, X-Frame-Options, HSTS indicators>", "suggestion": "<suggestion>"},
    "dataProtection": {"score": <0-100>, "analysis": "<assessment of form handling, data exposure, privacy practices>", "suggestion": "<suggestion>"},
    "compliance": {"score": <0-100>, "analysis": "<assessment of GDPR, cookie consent, privacy policy, terms presence>", "suggestion": "<suggestion>"},
    "overallSuggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
  },
  "mobile": {
    "score": <0-100>,
    "responsiveDesign": {"score": <0-100>, "analysis": "<assessment of responsive design patterns, media queries, flexible layouts>", "suggestion": "<suggestion>"},
    "touchTargets": {"score": <0-100>, "analysis": "<assessment of button sizes, tap targets, spacing for touch>", "suggestion": "<suggestion>"},
    "viewport": {"score": <0-100>, "analysis": "<assessment of viewport meta tag, initial scale, width settings>", "suggestion": "<suggestion>"},
    "pwaIndicators": {"score": <0-100>, "analysis": "<assessment of manifest.json, service worker, app-like features>", "suggestion": "<suggestion>"},
    "mobileFirst": {"score": <0-100>, "analysis": "<assessment of mobile-first approach, progressive enhancement>", "suggestion": "<suggestion>"},
    "overallSuggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
  },
  "content": {
    "score": <0-100>,
    "readability": {"score": <0-100>, "analysis": "<assessment of reading level, sentence length, clarity>", "suggestion": "<suggestion>"},
    "structure": {"score": <0-100>, "analysis": "<assessment of content organization, sections, flow>", "suggestion": "<suggestion>"},
    "freshness": {"score": <0-100>, "analysis": "<assessment of content dates, update indicators, relevance>", "suggestion": "<suggestion>"},
    "documentationQuality": {"score": <0-100>, "analysis": "<assessment of help text, tooltips, documentation links>", "suggestion": "<suggestion>"},
    "writingClarity": {"score": <0-100>, "analysis": "<assessment of grammar, spelling, professional tone>", "suggestion": "<suggestion>"},
    "overallSuggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
  },
  "actionPlan": [
    {"priority": "high", "category": "<category name>", "action": "<specific action to take>", "impact": "<expected impact>", "effort": "small|medium|large"},
    {"priority": "high", "category": "<category>", "action": "<action>", "impact": "<impact>", "effort": "<effort>"},
    {"priority": "medium", "category": "<category>", "action": "<action>", "impact": "<impact>", "effort": "<effort>"},
    {"priority": "medium", "category": "<category>", "action": "<action>", "impact": "<impact>", "effort": "<effort>"},
    {"priority": "low", "category": "<category>", "action": "<action>", "impact": "<impact>", "effort": "<effort>"}
  ],
  "executiveSummary": {
    "summary": "<3-5 sentence executive summary of the website evaluation>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
    "immediateActions": ["<immediate action 1>", "<immediate action 2>", "<immediate action 3>"],
    "longTermStrategy": "<2-3 sentence long-term improvement strategy>",
    "nextSteps": "<2-3 sentence recommended next steps>"
  }
}

Generate at least 5-10 action plan items across all categories with a mix of priorities. Be thorough and specific.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: evaluationPrompt },
          { role: "user", content: `Evaluate this website content:\n\n${truncatedContent}` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 8192,
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        await storage.updateSiteReview(reviewRecord.id, { status: "failed" } as any);
        return res.status(500).json({ error: "Failed to parse AI evaluation response." });
      }

      if (!parsed.fifteenPs || !Array.isArray(parsed.fifteenPs)) {
        await storage.updateSiteReview(reviewRecord.id, { status: "failed" } as any);
        return res.status(500).json({ error: "AI returned invalid evaluation format." });
      }

      parsed.proofId = proofId;
      parsed.reviewId = reviewRecord.id;

      await storage.updateSiteReview(reviewRecord.id, {
        status: "complete",
        scores: {
          overallScore: parsed.overallScore || 0,
          copyScore: parsed.copyScore || 0,
          seoScore: parsed.seoScore || 0,
          graphicsScore: parsed.graphicsScore || 0,
          performanceScore: parsed.performanceScore || 0,
          securityScore: parsed.securityScore || 0,
          mobileScore: parsed.mobileScore || 0,
          contentScore: parsed.contentScore || 0,
        },
        result: parsed,
        completedAt: new Date(),
      } as any);

      res.json(parsed);
    } catch (error: any) {
      console.error("Error evaluating website:", error);
      res.status(500).json({ error: "Failed to evaluate the website. Please try again." });
    }
  });

  // Get all site reviews (history)
  app.get("/api/site-evaluator/reviews", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const reviews = await storage.getAllSiteReviews(userId);
      res.json(reviews);
    } catch (error: any) {
      console.error("Error fetching site reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Get single review by id
  app.get("/api/site-evaluator/review/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid review ID" });
      }
      const review = await storage.getSiteReview(id);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error: any) {
      console.error("Error fetching site review:", error);
      res.status(500).json({ error: "Failed to fetch review" });
    }
  });

  // Get review by proof ID (public)
  app.get("/api/site-evaluator/proof/:proofId", async (req, res) => {
    try {
      const review = await storage.getSiteReviewByProofId(req.params.proofId);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error: any) {
      console.error("Error fetching site review by proof:", error);
      res.status(500).json({ error: "Failed to fetch review" });
    }
  });

  // Download markdown report
  app.get("/api/site-evaluator/review/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid review ID" });
      }
      const review = await storage.getSiteReview(id);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      const result = review.result as any;
      if (!result) {
        return res.status(400).json({ error: "Review has no results yet" });
      }

      let md = `# Website Evaluation Report\n\n`;
      md += `**URL:** ${review.url}\n`;
      md += `**Date:** ${review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "N/A"}\n`;
      md += `**Proof ID:** ${review.proofId || "N/A"}\n\n`;

      md += `## Overall Score: ${result.overallScore || 0}/100\n\n`;
      md += `| Category | Score |\n|----------|-------|\n`;
      md += `| Copy | ${result.copyScore || 0}/100 |\n`;
      md += `| SEO | ${result.seoScore || 0}/100 |\n`;
      md += `| Graphics | ${result.graphicsScore || 0}/100 |\n`;
      md += `| Performance | ${result.performanceScore || 0}/100 |\n`;
      md += `| Security | ${result.securityScore || 0}/100 |\n`;
      md += `| Mobile | ${result.mobileScore || 0}/100 |\n`;
      md += `| Content | ${result.contentScore || 0}/100 |\n\n`;

      if (result.executiveSummary) {
        md += `## Executive Summary\n\n`;
        md += `${result.executiveSummary.summary || ""}\n\n`;
        if (result.executiveSummary.strengths?.length) {
          md += `### Strengths\n`;
          result.executiveSummary.strengths.forEach((s: string) => { md += `- ${s}\n`; });
          md += `\n`;
        }
        if (result.executiveSummary.weaknesses?.length) {
          md += `### Weaknesses\n`;
          result.executiveSummary.weaknesses.forEach((w: string) => { md += `- ${w}\n`; });
          md += `\n`;
        }
        if (result.executiveSummary.immediateActions?.length) {
          md += `### Immediate Actions\n`;
          result.executiveSummary.immediateActions.forEach((a: string) => { md += `- ${a}\n`; });
          md += `\n`;
        }
        md += `### Long-Term Strategy\n${result.executiveSummary.longTermStrategy || ""}\n\n`;
        md += `### Next Steps\n${result.executiveSummary.nextSteps || ""}\n\n`;
      }

      if (result.fifteenPs?.length) {
        md += `## Copy Analysis (15 P's)\n\n`;
        md += `${result.copySummary || ""}\n\n`;
        result.fifteenPs.forEach((p: any) => {
          md += `### ${p.key?.charAt(0).toUpperCase()}${p.key?.slice(1)} - ${p.score}/100\n`;
          md += `${p.analysis || ""}\n`;
          if (p.suggestions?.length) {
            p.suggestions.forEach((s: string) => { md += `- ${s}\n`; });
          }
          md += `\n`;
        });
      }

      const categories = [
        { key: "seo", title: "SEO Analysis" },
        { key: "graphics", title: "Graphics & Design" },
        { key: "performance", title: "Performance" },
        { key: "security", title: "Security" },
        { key: "mobile", title: "Mobile Optimization" },
        { key: "content", title: "Content Quality" },
      ];

      for (const cat of categories) {
        const data = result[cat.key];
        if (data) {
          md += `## ${cat.title} - ${data.score || 0}/100\n\n`;
          for (const [subKey, subVal] of Object.entries(data)) {
            if (subKey === "score" || subKey === "overallSuggestions") continue;
            const sub = subVal as any;
            if (sub && typeof sub === "object" && ("analysis" in sub || "suggestion" in sub)) {
              md += `### ${subKey.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase())}\n`;
              if (sub.score !== undefined) md += `**Score:** ${sub.score}/100\n`;
              if (sub.analysis) md += `${sub.analysis}\n`;
              if (sub.suggestion) md += `**Suggestion:** ${sub.suggestion}\n`;
              md += `\n`;
            }
          }
          if (data.overallSuggestions?.length) {
            md += `### Key Suggestions\n`;
            data.overallSuggestions.forEach((s: string) => { md += `- ${s}\n`; });
            md += `\n`;
          }
        }
      }

      if (result.actionPlan?.length) {
        md += `## Action Plan\n\n`;
        md += `| Priority | Category | Action | Impact | Effort |\n`;
        md += `|----------|----------|--------|--------|--------|\n`;
        result.actionPlan.forEach((item: any) => {
          md += `| ${item.priority} | ${item.category} | ${item.action} | ${item.impact} | ${item.effort} |\n`;
        });
        md += `\n`;
      }

      md += `---\n*Generated by Site Evaluator*\n`;

      res.setHeader("Content-Type", "text/markdown");
      res.setHeader("Content-Disposition", `attachment; filename="site-evaluation-${review.proofId || review.id}.md"`);
      res.send(md);
    } catch (error: any) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Email markdown report (simple approach - returns the markdown content for now)
  app.post("/api/site-evaluator/review/:id/email", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid review ID" });
      }
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }

      const review = await storage.getSiteReview(id);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      await storage.updateSiteReview(id, { email } as any);

      res.json({ success: true, message: `Report saved. Share link: /site-evaluator/proof/${review.proofId}` });
    } catch (error: any) {
      console.error("Error emailing report:", error);
      res.status(500).json({ error: "Failed to process email request" });
    }
  });

  // ==========================================
  // AI Content Team Routes
  // ==========================================

  // Get AI team stats
  app.get("/api/ai-team/stats", async (_req, res) => {
    try {
      const suggestions = await storage.getAllAiSuggestions();
      const actions = await storage.getAllAiActions(undefined, 100);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const pendingSuggestions = suggestions.filter(s => s.status === "pending").length;
      const acceptedToday = suggestions.filter(s => s.status === "accepted" && s.createdAt >= todayStart).length;
      const autoResponded = actions.filter(a => a.actionType === "auto_response" && a.createdAt >= todayStart).length;
      const actionsThisWeek = actions.filter(a => a.createdAt >= weekStart).length;

      res.json({ pendingSuggestions, acceptedToday, autoResponded, actionsThisWeek });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get AI team stats" });
    }
  });

  // Get all suggestions
  app.get("/api/ai-team/suggestions", async (_req, res) => {
    try {
      const suggestions = await storage.getAllAiSuggestions();
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  // Update suggestion status
  app.patch("/api/ai-team/suggestions/:id", async (req, res) => {
    try {
      const statusSchema = z.object({ status: z.enum(["pending", "accepted", "dismissed"]) });
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid status. Must be pending, accepted, or dismissed." });
      const id = parseInt(req.params.id);
      const updated = await storage.updateAiSuggestion(id, parsed.data);
      if (!updated) return res.status(404).json({ error: "Suggestion not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update suggestion" });
    }
  });

  // Run AI Review - generates optimization suggestions for content
  app.post("/api/ai-team/run-review", async (_req, res) => {
    try {
      const thumbnails = await storage.getAllThumbnails();
      if (thumbnails.length === 0) {
        return res.json({ suggestions: [], message: "No content found to review" });
      }

      const contentSummary = thumbnails.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI content optimization expert for a medical/health podcast and video content platform called "The Medicine & Money Show". Analyze the provided content titles and generate specific, actionable optimization suggestions. Return a JSON array of suggestions, each with: type (title|description|seo|engagement), targetId (the content id), targetTitle (current title), currentValue (what's there now), suggestedValue (your improvement), reasoning (why this change helps), impact (high|medium|low).`
          },
          {
            role: "user",
            content: `Review these content items and suggest optimizations:\n${JSON.stringify(contentSummary)}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { suggestions: [] };
      }

      const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      const created = [];
      for (const s of suggestions) {
        const suggestion = await storage.createAiSuggestion({
          type: s.type || "title",
          targetId: String(s.targetId || ""),
          targetTitle: s.targetTitle || "",
          currentValue: s.currentValue || "",
          suggestedValue: s.suggestedValue || "",
          reasoning: s.reasoning || "",
          impact: s.impact || "medium",
          status: "pending",
        });
        created.push(suggestion);
      }

      await storage.createAiAction({
        actionType: "ai_review",
        description: `AI Review generated ${created.length} suggestions`,
        toolUsed: "ai_review",
        input: { contentCount: contentSummary.length },
        output: { suggestionsGenerated: created.length },
        status: "completed",
      });

      res.json({ suggestions: created, message: `Generated ${created.length} optimization suggestions` });
    } catch (error: any) {
      console.error("Error running AI review:", error);
      res.status(500).json({ error: "Failed to run AI review" });
    }
  });

  // Optimize Title tool
  app.post("/api/ai-team/optimize-title", async (req, res) => {
    try {
      const { currentTitle, category } = req.body;
      if (!currentTitle) return res.status(400).json({ error: "Current title is required" });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at optimizing content titles for maximum search visibility and click-through rates in the medical, health, and finance space. Generate 5 optimized title variations. Return JSON: { "titles": [{ "title": "...", "reasoning": "...", "estimatedCTR": "high|medium" }] }`
          },
          {
            role: "user",
            content: `Optimize this title${category ? ` in the ${category} category` : ""}:\n"${currentTitle}"`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed;
      try { parsed = JSON.parse(content); } catch { parsed = { titles: [] }; }

      await storage.createAiAction({
        actionType: "optimize_title",
        description: `Optimized title: "${currentTitle}"`,
        toolUsed: "optimize_title",
        input: { currentTitle, category },
        output: parsed,
        status: "completed",
      });

      res.json(parsed);
    } catch (error: any) {
      console.error("Error optimizing title:", error);
      res.status(500).json({ error: "Failed to optimize title" });
    }
  });

  // Generate Description tool
  app.post("/api/ai-team/generate-description", async (req, res) => {
    try {
      const { productTitle, currentDescription, condition, category } = req.body;
      if (!productTitle) return res.status(400).json({ error: "Product title is required" });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert content writer specializing in compelling descriptions for medical, health, and finance content. Generate an optimized description that's engaging, SEO-friendly, and conversion-focused. Return JSON: { "description": "...", "highlights": ["..."], "seoKeywords": ["..."] }`
          },
          {
            role: "user",
            content: `Generate a compelling description for:\nTitle: ${productTitle}${currentDescription ? `\nCurrent Description: ${currentDescription}` : ""}${condition ? `\nCondition/Context: ${condition}` : ""}${category ? `\nCategory: ${category}` : ""}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed;
      try { parsed = JSON.parse(content); } catch { parsed = { description: "", highlights: [], seoKeywords: [] }; }

      await storage.createAiAction({
        actionType: "generate_description",
        description: `Generated description for: "${productTitle}"`,
        toolUsed: "generate_description",
        input: { productTitle, category },
        output: parsed,
        status: "completed",
      });

      res.json(parsed);
    } catch (error: any) {
      console.error("Error generating description:", error);
      res.status(500).json({ error: "Failed to generate description" });
    }
  });

  // Performance Analysis tool
  app.post("/api/ai-team/performance-analysis", async (req, res) => {
    try {
      const { contentId, contentTitle } = req.body;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a content performance analyst for medical/health podcast content. Provide detailed performance analysis with actionable recommendations. Return JSON: { "score": 0-100, "strengths": ["..."], "weaknesses": ["..."], "recommendations": [{ "action": "...", "impact": "high|medium|low", "effort": "easy|medium|hard" }], "competitorInsights": "...", "trendAlignment": "..." }`
          },
          {
            role: "user",
            content: `Analyze the performance potential of this content:\n${contentTitle || contentId || "General content review"}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed;
      try { parsed = JSON.parse(content); } catch { parsed = { score: 0, strengths: [], weaknesses: [], recommendations: [] }; }

      await storage.createAiAction({
        actionType: "performance_analysis",
        description: `Performance analysis for: "${contentTitle || contentId}"`,
        toolUsed: "performance_analysis",
        input: { contentId, contentTitle },
        output: parsed,
        status: "completed",
      });

      res.json(parsed);
    } catch (error: any) {
      console.error("Error analyzing performance:", error);
      res.status(500).json({ error: "Failed to analyze performance" });
    }
  });

  // Engagement Strategy tool
  app.post("/api/ai-team/engagement-strategy", async (req, res) => {
    try {
      const { contentId, contentTitle } = req.body;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an engagement strategist for medical/health content creators. Provide smart strategies to boost audience engagement, retention, and growth. Return JSON: { "overallStrategy": "...", "hooks": [{ "type": "...", "example": "...", "placement": "..." }], "ctaRecommendations": ["..."], "communityTactics": ["..."], "crossPromotionIdeas": ["..."], "estimatedEngagementBoost": "..." }`
          },
          {
            role: "user",
            content: `Create an engagement strategy for this content:\n${contentTitle || contentId || "General content engagement"}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed;
      try { parsed = JSON.parse(content); } catch { parsed = { overallStrategy: "", hooks: [], ctaRecommendations: [], communityTactics: [] }; }

      await storage.createAiAction({
        actionType: "engagement_strategy",
        description: `Engagement strategy for: "${contentTitle || contentId}"`,
        toolUsed: "engagement_strategy",
        input: { contentId, contentTitle },
        output: parsed,
        status: "completed",
      });

      res.json(parsed);
    } catch (error: any) {
      console.error("Error generating engagement strategy:", error);
      res.status(500).json({ error: "Failed to generate engagement strategy" });
    }
  });

  // Get all actions/activity
  app.get("/api/ai-team/actions", async (_req, res) => {
    try {
      const actions = await storage.getAllAiActions(undefined, 50);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get actions" });
    }
  });

  // Get all automations
  app.get("/api/ai-team/automations", async (_req, res) => {
    try {
      const automations = await storage.getAllAiAutomations();
      res.json(automations);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get automations" });
    }
  });

  // Create automation
  app.post("/api/ai-team/automations", async (req, res) => {
    try {
      const createSchema = z.object({
        name: z.string().min(1),
        trigger: z.string().min(1),
        action: z.string().min(1),
        enabled: z.boolean().optional(),
        config: z.record(z.any()).optional(),
      });
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid automation data", details: parsed.error.issues });
      const automation = await storage.createAiAutomation(parsed.data);
      res.json(automation);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create automation" });
    }
  });

  // Update automation
  app.patch("/api/ai-team/automations/:id", async (req, res) => {
    try {
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        trigger: z.string().min(1).optional(),
        action: z.string().min(1).optional(),
        enabled: z.boolean().optional(),
        config: z.record(z.any()).optional(),
      });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid update data", details: parsed.error.issues });
      const id = parseInt(req.params.id);
      const updated = await storage.updateAiAutomation(id, parsed.data);
      if (!updated) return res.status(404).json({ error: "Automation not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update automation" });
    }
  });

  // Delete automation
  app.delete("/api/ai-team/automations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAiAutomation(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete automation" });
    }
  });

  // ============================================
  // INSTAGRAM CONTENT PLANNER
  // ============================================

  app.post("/api/instagram/hashtags", async (req, res) => {
    try {
      const { topic, niche } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an Instagram hashtag research expert. Return JSON only.` },
          { role: "user", content: `Research Instagram hashtags for: "${topic}" in the ${niche || "general"} niche.

Return JSON with:
{
  "primaryHashtags": ["array of 10 high-volume hashtags (100K+ posts)"],
  "nicheHashtags": ["array of 10 medium-volume niche-specific hashtags (10K-100K posts)"],
  "lowCompetition": ["array of 10 low-competition hashtags (<10K posts) for growth"],
  "branded": ["array of 5 suggested branded hashtags"],
  "hashtagSets": [
    { "name": "Set 1 - Broad Reach", "tags": ["array of 30 mixed hashtags optimized for reach"] },
    { "name": "Set 2 - Niche Focus", "tags": ["array of 30 hashtags optimized for niche engagement"] },
    { "name": "Set 3 - Growth", "tags": ["array of 30 hashtags optimized for follower growth"] }
  ],
  "tips": ["array of 5 hashtag strategy tips"],
  "bannedWarnings": ["array of any commonly banned hashtags to avoid in this niche"]
}` }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Instagram hashtag error:", error);
      res.status(500).json({ error: "Failed to research hashtags" });
    }
  });

  app.post("/api/instagram/caption", async (req, res) => {
    try {
      const { topic, tone, type, includeEmojis, includeCTA } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an Instagram caption writing expert who creates viral, engaging captions. Return JSON only.` },
          { role: "user", content: `Write 5 Instagram caption variations for: "${topic}"
Tone: ${tone || "professional"}
Post type: ${type || "feed post"}
Include emojis: ${includeEmojis !== false ? "yes" : "no"}
Include CTA: ${includeCTA !== false ? "yes" : "no"}

Return JSON:
{
  "captions": [
    {
      "style": "style name (e.g., Story-driven, Educational, Controversial, Inspirational, Listicle)",
      "caption": "full caption text with line breaks",
      "hook": "the opening line/hook",
      "hashtags": ["10 relevant hashtags"],
      "estimatedEngagement": "high/medium/low"
    }
  ],
  "tips": ["3 caption optimization tips for this topic"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Instagram caption error:", error);
      res.status(500).json({ error: "Failed to generate captions" });
    }
  });

  app.post("/api/instagram/best-time", async (req, res) => {
    try {
      const { niche, timezone, audience } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a social media analytics expert specializing in Instagram posting optimization. Return JSON only.` },
          { role: "user", content: `Recommend the best times to post on Instagram for:
Niche: ${niche || "general"}
Timezone: ${timezone || "EST"}
Target audience: ${audience || "general"}

Return JSON:
{
  "bestTimes": [
    { "day": "Monday", "times": ["9:00 AM", "12:00 PM", "7:00 PM"], "engagement": "high/medium" }
  ],
  "peakDays": ["top 3 days ranked"],
  "avoidTimes": ["times to avoid posting"],
  "reelsbestTimes": [
    { "day": "day", "times": ["best times for Reels specifically"] }
  ],
  "storiesBestTimes": ["best times for Stories"],
  "weeklySchedule": {
    "Monday": { "feed": "time", "reels": "time", "stories": "time" },
    "Tuesday": { "feed": "time", "reels": "time", "stories": "time" },
    "Wednesday": { "feed": "time", "reels": "time", "stories": "time" },
    "Thursday": { "feed": "time", "reels": "time", "stories": "time" },
    "Friday": { "feed": "time", "reels": "time", "stories": "time" },
    "Saturday": { "feed": "time", "reels": "time", "stories": "time" },
    "Sunday": { "feed": "time", "reels": "time", "stories": "time" }
  },
  "insights": ["5 timing strategy insights"]
}` }
        ],
        max_tokens: 1500,
        temperature: 0.6,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Instagram best time error:", error);
      res.status(500).json({ error: "Failed to analyze best times" });
    }
  });

  app.post("/api/instagram/content-calendar", async (req, res) => {
    try {
      const { niche, weeks, themes } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an Instagram content strategist. Create detailed content calendars. Return JSON only.` },
          { role: "user", content: `Create a ${weeks || 2}-week Instagram content calendar for the "${niche || "business"}" niche.
Content themes to include: ${themes || "educational, behind-the-scenes, promotional, engagement"}

Return JSON:
{
  "calendar": [
    {
      "week": 1,
      "days": [
        {
          "day": "Monday",
          "contentType": "Carousel/Reel/Single Post/Story",
          "topic": "specific topic",
          "caption": "short caption preview (first 2 lines)",
          "hashtags": ["5 key hashtags"],
          "contentPillar": "educational/entertaining/inspirational/promotional",
          "visualNotes": "brief description of what the visual should be"
        }
      ]
    }
  ],
  "contentMix": { "educational": "40%", "entertaining": "20%", "inspirational": "20%", "promotional": "20%" },
  "monthlyThemes": ["overarching themes for the month"],
  "tips": ["3 content calendar execution tips"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Instagram calendar error:", error);
      res.status(500).json({ error: "Failed to generate calendar" });
    }
  });

  // ============================================
  // TIKTOK CONTENT OPTIMIZER
  // ============================================

  app.post("/api/tiktok/hooks", async (req, res) => {
    try {
      const { topic, style } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a TikTok content expert who specializes in creating viral hooks that stop the scroll. Return JSON only.` },
          { role: "user", content: `Generate viral TikTok hooks for: "${topic}"
Style: ${style || "educational"}

Return JSON:
{
  "hooks": [
    {
      "hook": "the opening hook text (first 3 seconds)",
      "style": "controversial/curiosity/shock/relatable/educational",
      "script": "full 30-60 second script following the hook",
      "visualCues": "what should be shown on screen",
      "estimatedViralPotential": "high/medium/low",
      "bestFor": "what audience this hook works best for"
    }
  ],
  "hookFormulas": [
    { "formula": "hook formula template", "example": "filled in example", "why": "why this works" }
  ],
  "trendingFormats": ["5 trending TikTok formats that work for this topic"],
  "tips": ["5 TikTok hook optimization tips"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("TikTok hooks error:", error);
      res.status(500).json({ error: "Failed to generate hooks" });
    }
  });

  app.post("/api/tiktok/trending", async (req, res) => {
    try {
      const { niche } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a TikTok trend analyst. Identify current trending topics, sounds, and content formats. Return JSON only.` },
          { role: "user", content: `Analyze current TikTok trends for the "${niche || "general"}" niche.

Return JSON:
{
  "trendingTopics": [
    { "topic": "trending topic", "description": "why it's trending", "difficulty": "easy/medium/hard to create", "estimatedLifespan": "days/weeks", "contentIdea": "how to use this trend" }
  ],
  "trendingSounds": [
    { "sound": "sound/audio name", "usage": "how it's being used", "adaptationIdea": "how to adapt for your niche" }
  ],
  "trendingFormats": [
    { "format": "format name", "description": "how it works", "example": "example script", "tips": "tips for execution" }
  ],
  "hashtagTrends": ["10 trending hashtags in this niche"],
  "emergingTrends": ["5 emerging trends to jump on early"],
  "contentIdeas": [
    { "idea": "content idea", "format": "suggested format", "hook": "opening hook", "estimatedReach": "high/medium/low" }
  ]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("TikTok trending error:", error);
      res.status(500).json({ error: "Failed to research trends" });
    }
  });

  app.post("/api/tiktok/caption", async (req, res) => {
    try {
      const { topic, hook } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a TikTok caption expert. Write captions that boost engagement and reach. Return JSON only.` },
          { role: "user", content: `Write TikTok captions for video about: "${topic}"
Video hook: ${hook || "not specified"}

Return JSON:
{
  "captions": [
    {
      "style": "style name",
      "caption": "caption text (keep under 150 chars for best visibility)",
      "hashtags": ["8-10 relevant hashtags"],
      "cta": "call to action text",
      "estimatedBoost": "how this caption style helps"
    }
  ],
  "tips": ["5 TikTok caption tips"],
  "avoidList": ["things to avoid in TikTok captions"]
}` }
        ],
        max_tokens: 1500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("TikTok caption error:", error);
      res.status(500).json({ error: "Failed to generate captions" });
    }
  });

  app.post("/api/tiktok/script", async (req, res) => {
    try {
      const { topic, duration, style } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a TikTok video scriptwriter who creates viral, engaging scripts. Return JSON only.` },
          { role: "user", content: `Write a TikTok video script about: "${topic}"
Duration: ${duration || "60 seconds"}
Style: ${style || "educational"}

Return JSON:
{
  "scripts": [
    {
      "title": "script title",
      "duration": "estimated duration",
      "hook": "opening hook (first 3 seconds)",
      "script": [
        { "timestamp": "0:00-0:03", "dialogue": "what to say", "visual": "what's on screen", "text_overlay": "text to display" }
      ],
      "cta": "closing call to action",
      "sound": "suggested sound/music type",
      "tips": ["production tips"]
    }
  ],
  "generalTips": ["5 TikTok scriptwriting tips"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("TikTok script error:", error);
      res.status(500).json({ error: "Failed to generate scripts" });
    }
  });

  app.post("/api/tiktok/hashtags", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a TikTok hashtag strategist. Return JSON only.` },
          { role: "user", content: `Research TikTok hashtags for: "${topic}"

Return JSON:
{
  "viral": ["10 viral/high-volume hashtags"],
  "niche": ["10 niche-specific hashtags"],
  "trending": ["10 currently trending relevant hashtags"],
  "fyp": ["5 FYP-boosting hashtags"],
  "sets": [
    { "name": "Maximum Reach", "tags": ["15 hashtags"] },
    { "name": "Niche Authority", "tags": ["15 hashtags"] },
    { "name": "Trending Mix", "tags": ["15 hashtags"] }
  ],
  "strategy": ["5 TikTok hashtag strategy tips"],
  "avoid": ["hashtags to avoid"]
}` }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("TikTok hashtags error:", error);
      res.status(500).json({ error: "Failed to research hashtags" });
    }
  });

  // ============================================
  // LINKEDIN CONTENT SUITE
  // ============================================

  app.post("/api/linkedin/post", async (req, res) => {
    try {
      const { topic, tone, type, audience } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a LinkedIn content expert who creates posts that drive engagement and establish thought leadership. Return JSON only.` },
          { role: "user", content: `Write LinkedIn posts about: "${topic}"
Tone: ${tone || "professional"}
Post type: ${type || "thought leadership"}
Target audience: ${audience || "professionals"}

Return JSON:
{
  "posts": [
    {
      "style": "style name (Story, Hot Take, Framework, Listicle, Personal Reflection)",
      "post": "full post text with line breaks (use \\n). Include hook, body, CTA",
      "hook": "the opening line that stops the scroll",
      "hashtags": ["5-8 relevant hashtags"],
      "estimatedReach": "high/medium/low",
      "bestTimeToPost": "suggested posting time",
      "engagementTip": "tip to boost this post's engagement"
    }
  ],
  "formattingTips": ["5 LinkedIn formatting best practices"],
  "contentStrategy": ["3 LinkedIn content strategy insights for this topic"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("LinkedIn post error:", error);
      res.status(500).json({ error: "Failed to generate posts" });
    }
  });

  app.post("/api/linkedin/carousel", async (req, res) => {
    try {
      const { topic, slides } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a LinkedIn carousel content expert. Create slide-by-slide carousel content. Return JSON only.` },
          { role: "user", content: `Create a LinkedIn carousel about: "${topic}"
Number of slides: ${slides || 10}

Return JSON:
{
  "title": "carousel title",
  "slides": [
    {
      "slideNumber": 1,
      "headline": "slide headline (keep short)",
      "body": "slide body text (2-3 lines max)",
      "designNote": "visual suggestion for this slide",
      "type": "cover/content/stat/quote/cta"
    }
  ],
  "caption": "LinkedIn post caption to accompany the carousel",
  "hashtags": ["8 relevant hashtags"],
  "designTips": ["3 carousel design tips"],
  "alternativeTitles": ["3 alternative carousel titles"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("LinkedIn carousel error:", error);
      res.status(500).json({ error: "Failed to generate carousel" });
    }
  });

  app.post("/api/linkedin/article", async (req, res) => {
    try {
      const { topic, length, audience } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a LinkedIn article optimization expert. Create well-structured, SEO-optimized articles. Return JSON only.` },
          { role: "user", content: `Create a LinkedIn article about: "${topic}"
Length: ${length || "medium (800-1200 words)"}
Target audience: ${audience || "professionals"}

Return JSON:
{
  "title": "article title",
  "subtitle": "article subtitle",
  "outline": [
    { "section": "section title", "keyPoints": ["key points to cover"] }
  ],
  "article": "full article text with markdown formatting (## for headings, **bold**, etc.)",
  "seoKeywords": ["10 SEO keywords"],
  "metaDescription": "article meta description",
  "promotionPost": "LinkedIn post to promote this article",
  "hashtags": ["8 relevant hashtags"],
  "tips": ["3 LinkedIn article optimization tips"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("LinkedIn article error:", error);
      res.status(500).json({ error: "Failed to generate article" });
    }
  });

  app.post("/api/linkedin/hashtags", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a LinkedIn hashtag and engagement strategist. Return JSON only.` },
          { role: "user", content: `Research LinkedIn hashtags and engagement strategies for: "${topic}"

Return JSON:
{
  "topHashtags": ["15 most effective LinkedIn hashtags for this topic"],
  "nicheHashtags": ["10 niche-specific hashtags"],
  "trendingHashtags": ["10 currently trending LinkedIn hashtags"],
  "hashtagSets": [
    { "name": "Thought Leadership", "tags": ["5-8 hashtags"] },
    { "name": "Industry Focus", "tags": ["5-8 hashtags"] },
    { "name": "Growth & Reach", "tags": ["5-8 hashtags"] }
  ],
  "engagementTips": [
    { "tip": "engagement tip", "impact": "high/medium/low", "effort": "easy/medium/hard" }
  ],
  "bestPractices": ["5 LinkedIn engagement best practices"],
  "algorithmInsights": ["3 LinkedIn algorithm insights"]
}` }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("LinkedIn hashtags error:", error);
      res.status(500).json({ error: "Failed to research hashtags" });
    }
  });

  // ============================================
  // PODCAST SHOW NOTES GENERATOR
  // ============================================

  app.post("/api/podcast/show-notes", async (req, res) => {
    try {
      const { transcript, topic, guestName } = req.body;
      if (!transcript && !topic) return res.status(400).json({ error: "Transcript or topic is required" });
      const input = transcript ? transcript.substring(0, 5000) : topic;
      const inputType = transcript ? "transcript" : "topic";
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a professional podcast producer who creates comprehensive show notes. Return JSON only.` },
          { role: "user", content: `Generate podcast show notes from this ${inputType}: "${input}"
${guestName ? `Guest: ${guestName}` : ""}

Return JSON:
{
  "title": "episode title",
  "summary": "2-3 sentence episode summary",
  "description": "full episode description (200-300 words)",
  "keyTakeaways": ["5-7 key takeaways from the episode"],
  "timestamps": [
    { "time": "0:00", "topic": "Introduction" },
    { "time": "estimated time", "topic": "topic discussed" }
  ],
  "quotes": ["3-5 memorable quotes or key statements"],
  "resources": ["5-8 resources/links to mention"],
  "guestBio": "brief guest bio if applicable",
  "keywords": ["10-15 SEO keywords"],
  "callToAction": "suggested CTA for listeners"
}` }
        ],
        max_tokens: 2500,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Show notes error:", error);
      res.status(500).json({ error: "Failed to generate show notes" });
    }
  });

  app.post("/api/podcast/blog-post", async (req, res) => {
    try {
      const { transcript, topic, showNotes } = req.body;
      if (!transcript && !topic) return res.status(400).json({ error: "Transcript or topic is required" });
      const input = transcript ? transcript.substring(0, 5000) : topic;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a content repurposing expert who turns podcast content into SEO-optimized blog posts. Return JSON only.` },
          { role: "user", content: `Turn this podcast content into a blog post: "${input}"
${showNotes ? `Show notes for reference: ${JSON.stringify(showNotes)}` : ""}

Return JSON:
{
  "title": "SEO-optimized blog title",
  "metaDescription": "meta description for SEO",
  "blogPost": "full blog post in markdown format (1000-1500 words) with ## headings, **bold**, bullet points, etc.",
  "seoKeywords": ["10 target keywords"],
  "internalLinkSuggestions": ["5 topics to link to internally"],
  "socialSnippets": {
    "twitter": "tweet-length snippet to promote the post",
    "linkedin": "LinkedIn post to promote the blog",
    "instagram": "Instagram caption to promote the blog"
  },
  "featuredImagePrompt": "AI image generation prompt for the featured image"
}` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Blog post error:", error);
      res.status(500).json({ error: "Failed to generate blog post" });
    }
  });

  app.post("/api/podcast/social-clips", async (req, res) => {
    try {
      const { transcript, topic } = req.body;
      if (!transcript && !topic) return res.status(400).json({ error: "Transcript or topic is required" });
      const input = transcript ? transcript.substring(0, 5000) : topic;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a social media content strategist who identifies the best clip-worthy moments from podcasts. Return JSON only.` },
          { role: "user", content: `Identify the best social media clip moments from: "${input}"

Return JSON:
{
  "clips": [
    {
      "title": "clip title",
      "quote": "the key quote or moment",
      "platform": "best platform for this clip (TikTok/Instagram Reels/YouTube Shorts/LinkedIn)",
      "caption": "social media caption",
      "hashtags": ["5-8 relevant hashtags"],
      "hook": "text overlay hook for the video",
      "estimatedLength": "15s/30s/60s",
      "viralPotential": "high/medium/low",
      "why": "why this moment would perform well"
    }
  ],
  "audiogramIdeas": [
    { "quote": "pullout quote for audiogram", "background": "suggested visual background", "platform": "best platform" }
  ],
  "repurposingStrategy": ["5 ways to repurpose this episode across platforms"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Social clips error:", error);
      res.status(500).json({ error: "Failed to generate social clips" });
    }
  });

  app.post("/api/podcast/newsletter", async (req, res) => {
    try {
      const { transcript, topic, showNotes, audienceName } = req.body;
      if (!transcript && !topic) return res.status(400).json({ error: "Transcript or topic is required" });
      const input = transcript ? transcript.substring(0, 5000) : topic;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an email marketing expert who creates compelling newsletters from podcast content. Return JSON only.` },
          { role: "user", content: `Create an email newsletter from this podcast content: "${input}"
${showNotes ? `Show notes: ${JSON.stringify(showNotes)}` : ""}
Audience name: ${audienceName || "subscribers"}

Return JSON:
{
  "subjectLines": ["5 subject line options (A/B test ready)"],
  "previewText": "email preview text",
  "newsletter": "full newsletter in HTML-ready format with sections, bold text, bullet points, etc.",
  "sections": [
    { "title": "section title", "content": "section content", "type": "intro/highlight/takeaway/cta" }
  ],
  "cta": { "primary": "primary CTA text", "link": "suggested link text", "secondary": "secondary CTA" },
  "sendTimeSuggestion": "best day/time to send",
  "tips": ["3 email optimization tips"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Newsletter error:", error);
      res.status(500).json({ error: "Failed to generate newsletter" });
    }
  });

  // ============================================
  // SOCIAL MEDIA COMMAND CENTER
  // ============================================

  app.post("/api/social/generate-all", async (req, res) => {
    try {
      const { topic, platforms, tone } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const targetPlatforms = platforms || ["youtube", "instagram", "tiktok", "linkedin", "twitter"];
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a cross-platform social media strategist. Create optimized content for each platform from a single topic. Return JSON only.` },
          { role: "user", content: `Create platform-optimized content for ALL of these platforms: ${targetPlatforms.join(", ")}
Topic: "${topic}"
Tone: ${tone || "professional yet engaging"}

Return JSON:
{
  "topic": "${topic}",
  "platforms": {
    ${targetPlatforms.includes("youtube") ? `"youtube": {
      "title": "YouTube video title (50-70 chars)",
      "description": "YouTube description (first 200 words)",
      "tags": ["15 tags"],
      "thumbnailText": "text for thumbnail (3-4 words)",
      "contentOutline": ["5-7 video sections"]
    },` : ""}
    ${targetPlatforms.includes("instagram") ? `"instagram": {
      "caption": "Instagram caption with emojis and line breaks",
      "hashtags": ["30 hashtags"],
      "storyIdeas": ["3 story ideas to promote"],
      "reelHook": "Reel opening hook",
      "contentType": "recommended content type (carousel/reel/single)"
    },` : ""}
    ${targetPlatforms.includes("tiktok") ? `"tiktok": {
      "hook": "opening hook (3 seconds)",
      "script": "60-second script",
      "caption": "TikTok caption",
      "hashtags": ["15 hashtags"],
      "sound": "suggested sound type"
    },` : ""}
    ${targetPlatforms.includes("linkedin") ? `"linkedin": {
      "post": "LinkedIn post with formatting",
      "hashtags": ["8 hashtags"],
      "articleIdea": "LinkedIn article title and outline",
      "engagementQuestion": "question to drive comments"
    },` : ""}
    ${targetPlatforms.includes("twitter") ? `"twitter": {
      "tweets": ["3 tweet variations (under 280 chars each)"],
      "thread": ["5-tweet thread"],
      "hashtags": ["5 hashtags"]
    }` : ""}
  },
  "crossPlatformStrategy": {
    "postingOrder": ["recommended order to post across platforms"],
    "timingGap": "recommended time between cross-posts",
    "adaptationNotes": ["how content was adapted for each platform"]
  },
  "contentCalendarSuggestion": "when to post and repurpose this content over the next week"
}` }
        ],
        max_tokens: 4000,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Social generate-all error:", error);
      res.status(500).json({ error: "Failed to generate cross-platform content" });
    }
  });

  app.post("/api/social/content-calendar", async (req, res) => {
    try {
      const { niche, weeks, platforms } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a social media strategist creating cross-platform content calendars. Return JSON only.` },
          { role: "user", content: `Create a ${weeks || 1}-week cross-platform content calendar.
Niche: ${niche || "business"}
Platforms: ${(platforms || ["YouTube", "Instagram", "TikTok", "LinkedIn", "Twitter"]).join(", ")}

Return JSON:
{
  "calendar": [
    {
      "day": "Monday",
      "posts": [
        {
          "platform": "platform name",
          "time": "posting time",
          "contentType": "type of content",
          "topic": "content topic",
          "caption": "brief caption preview",
          "hashtags": ["3-5 key hashtags"],
          "notes": "any production notes"
        }
      ]
    }
  ],
  "weeklyTheme": "overarching weekly theme",
  "contentPillars": ["4 content pillars used"],
  "strategy": ["5 cross-platform strategy tips"],
  "kpis": ["key metrics to track"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Social calendar error:", error);
      res.status(500).json({ error: "Failed to generate content calendar" });
    }
  });

  // ============================================
  // X/TWITTER GROWTH SUITE
  // ============================================

  app.post("/api/twitter/thread", async (req, res) => {
    try {
      const { topic, tweetCount, style } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a Twitter/X thread writing expert who creates viral threads. Return JSON only.` },
          { role: "user", content: `Write a viral X/Twitter thread about: "${topic}"
Number of tweets: ${tweetCount || 7}
Style: ${style || "educational"}

Return JSON:
{
  "hookTweet": "the opening tweet that stops the scroll (under 280 chars)",
  "thread": [
    { "number": 1, "tweet": "tweet text (under 280 chars)", "mediaNote": "suggested media if any" }
  ],
  "closingCTA": "final tweet with CTA (under 280 chars)",
  "hashtags": ["5 relevant hashtags"],
  "alternativeHooks": ["3 alternative opening tweets"],
  "tips": ["5 thread optimization tips"],
  "bestTimeToPost": "suggested posting time"
}` }
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Twitter thread error:", error);
      res.status(500).json({ error: "Failed to generate thread" });
    }
  });

  app.post("/api/twitter/viral-tweets", async (req, res) => {
    try {
      const { topic, count, style } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a viral tweet expert. Create tweets optimized for maximum engagement. Return JSON only.` },
          { role: "user", content: `Generate ${count || 10} viral tweet variations about: "${topic}"
Style: ${style || "mixed"}

Return JSON:
{
  "tweets": [
    {
      "tweet": "tweet text (under 280 chars)",
      "style": "hot take/controversial/educational/humorous/inspirational/story/stat",
      "estimatedEngagement": "high/medium/low",
      "replyBait": "why people will reply to this",
      "bestFormat": "text only/with image/with poll/with video"
    }
  ],
  "tweetFormulas": [
    { "formula": "tweet formula template", "example": "filled example", "whyItWorks": "explanation" }
  ],
  "engagementTips": ["5 tips to boost tweet engagement"],
  "avoidList": ["things to avoid for algorithm reach"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Twitter viral tweets error:", error);
      res.status(500).json({ error: "Failed to generate tweets" });
    }
  });

  app.post("/api/twitter/engagement", async (req, res) => {
    try {
      const { niche, goals } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an X/Twitter growth strategist. Return JSON only.` },
          { role: "user", content: `Create a comprehensive X/Twitter engagement and growth strategy for:
Niche: ${niche || "general"}
Goals: ${goals || "grow followers and engagement"}

Return JSON:
{
  "dailyRoutine": [
    { "time": "time of day", "action": "what to do", "duration": "how long", "impact": "high/medium/low" }
  ],
  "contentMix": {
    "threads": "percentage and frequency",
    "singleTweets": "percentage and frequency",
    "replies": "percentage and frequency",
    "quotes": "percentage and frequency"
  },
  "growthTactics": [
    { "tactic": "growth tactic", "description": "how to execute", "expectedResult": "what to expect", "effort": "easy/medium/hard" }
  ],
  "engagementBoosters": ["10 specific engagement tactics"],
  "hashtagStrategy": ["best hashtags and how to use them"],
  "profileOptimization": {
    "bio": "suggested bio text",
    "pinnedTweet": "suggested pinned tweet idea",
    "headerIdea": "suggested header image concept"
  },
  "weeklySchedule": [
    { "day": "Monday", "content": "what to post", "engagement": "engagement activities" }
  ],
  "metricsToTrack": ["key metrics and benchmarks"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Twitter engagement error:", error);
      res.status(500).json({ error: "Failed to generate strategy" });
    }
  });

  app.post("/api/twitter/trending-hijack", async (req, res) => {
    try {
      const { niche, trendTopic } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a Twitter trend-jacking expert who helps creators ride trending topics for visibility. Return JSON only.` },
          { role: "user", content: `${trendTopic ? `Create tweets to hijack/ride this trending topic: "${trendTopic}"` : `Identify trending topics to hijack`} for the ${niche || "general"} niche.

Return JSON:
{
  "trendingTopics": [
    { "topic": "trending topic or hashtag", "relevance": "how it connects to your niche", "urgency": "post now/today/this week" }
  ],
  "hijackTweets": [
    {
      "trend": "the trend being hijacked",
      "tweet": "tweet text riding the trend (under 280 chars)",
      "angle": "how it connects to your brand/niche",
      "viralPotential": "high/medium/low",
      "hashtags": ["relevant hashtags"]
    }
  ],
  "tips": ["5 trend-jacking best practices"],
  "warnings": ["things to avoid when trend-jacking"]
}` }
        ],
        max_tokens: 2000,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Twitter trending error:", error);
      res.status(500).json({ error: "Failed to generate trend-jacking content" });
    }
  });

  // ============================================
  // CONTENT REPURPOSING ENGINE
  // ============================================

  app.post("/api/repurpose/generate", async (req, res) => {
    try {
      const { content, contentType, platforms } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });
      const truncated = content.substring(0, 5000);
      const targetPlatforms = platforms || ["twitter", "linkedin", "instagram", "tiktok", "email", "blog"];
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a content repurposing expert who transforms one piece of content into 20+ pieces across platforms. Return JSON only.` },
          { role: "user", content: `Repurpose this ${contentType || "content"} into multiple formats for these platforms: ${targetPlatforms.join(", ")}

Original content:
"${truncated}"

Return JSON:
{
  "summary": "brief summary of the original content",
  "pieces": {
    ${targetPlatforms.includes("twitter") ? `"twitter": {
      "tweets": ["5 standalone tweets (under 280 chars each)"],
      "thread": ["7-tweet thread"],
      "quoteCards": ["3 quotable one-liners for graphics"]
    },` : ""}
    ${targetPlatforms.includes("linkedin") ? `"linkedin": {
      "post": "full LinkedIn post with formatting",
      "carouselSlides": [
        { "headline": "slide headline", "body": "slide body" }
      ],
      "articleOutline": { "title": "article title", "sections": ["section titles"] }
    },` : ""}
    ${targetPlatforms.includes("instagram") ? `"instagram": {
      "caption": "Instagram caption with emojis",
      "carouselSlides": [{ "headline": "slide text", "body": "supporting text" }],
      "reelScript": "30-second Reel script",
      "storySlides": ["5 story slide texts"],
      "hashtags": ["30 hashtags"]
    },` : ""}
    ${targetPlatforms.includes("tiktok") ? `"tiktok": {
      "script60s": "60-second TikTok script",
      "script15s": "15-second TikTok script",
      "hooks": ["3 different hooks for the same content"],
      "caption": "TikTok caption",
      "hashtags": ["15 hashtags"]
    },` : ""}
    ${targetPlatforms.includes("email") ? `"email": {
      "subjectLine": "email subject line",
      "newsletter": "full newsletter text",
      "previewText": "email preview text"
    },` : ""}
    ${targetPlatforms.includes("blog") ? `"blog": {
      "title": "blog post title",
      "outline": ["blog post sections"],
      "intro": "blog post introduction paragraph",
      "conclusion": "blog post conclusion"
    }` : ""}
  },
  "bonusContent": {
    "podcastEpisodeIdea": "podcast episode title and talking points",
    "youtubeVideoIdea": "YouTube video title and outline",
    "quoteGraphics": ["5 one-liner quotes for shareable graphics"],
    "pollIdeas": ["3 poll questions derived from the content"]
  },
  "repurposingSchedule": "suggested schedule for posting all pieces over 2 weeks"
}` }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
      const content2 = response.choices[0]?.message?.content || "";
      const jsonMatch = content2.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Repurpose error:", error);
      res.status(500).json({ error: "Failed to repurpose content" });
    }
  });

  // ============================================
  // AI THUMBNAIL & HOOK A/B TESTER
  // ============================================

  app.post("/api/ab-test/thumbnails", async (req, res) => {
    try {
      const { topic, currentTitle, currentDescription } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a YouTube CTR optimization expert who specializes in thumbnails and titles. Score and compare variations. Return JSON only.` },
          { role: "user", content: `Generate and score thumbnail/title/hook A/B test variations for: "${topic}"
${currentTitle ? `Current title: "${currentTitle}"` : ""}
${currentDescription ? `Current description: "${currentDescription}"` : ""}

Return JSON:
{
  "variations": [
    {
      "label": "Variation A/B/C/D/E",
      "title": "video title variation",
      "thumbnailText": "text for thumbnail (3-4 words, ALL CAPS)",
      "thumbnailConcept": "visual concept description for the thumbnail",
      "hookLine": "first line of the video (opening hook)",
      "scores": {
        "curiosityGap": 8,
        "emotionalTrigger": 7,
        "clarityOfValue": 9,
        "urgency": 6,
        "clickPotential": 8,
        "overall": 7.6
      },
      "strengths": ["what works well"],
      "weaknesses": ["what could be better"],
      "targetAudience": "who this appeals to most"
    }
  ],
  "winner": {
    "label": "which variation wins",
    "reason": "why this variation is predicted to perform best"
  },
  "ctrPredictions": {
    "bestCase": "estimated CTR range for the winner",
    "worstCase": "estimated CTR for the weakest variation"
  },
  "optimizationTips": ["5 thumbnail/title optimization tips"],
  "psychologyInsights": ["3 psychology principles being applied"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("AB test error:", error);
      res.status(500).json({ error: "Failed to generate A/B test" });
    }
  });

  app.post("/api/ab-test/hooks", async (req, res) => {
    try {
      const { topic, platform } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a content hook optimization expert. Generate and score hooks for maximum retention. Return JSON only.` },
          { role: "user", content: `Generate and A/B test hook variations for: "${topic}"
Platform: ${platform || "YouTube"}

Return JSON:
{
  "hooks": [
    {
      "label": "Hook A/B/C/D/E",
      "hookText": "the opening hook line",
      "hookType": "question/bold claim/story/statistic/controversy/fear/curiosity",
      "script": "first 15 seconds of script following the hook",
      "scores": {
        "attentionGrab": 8,
        "curiosityFactor": 7,
        "relatability": 9,
        "retentionPotential": 8,
        "overall": 8.0
      },
      "whyItWorks": "psychology behind this hook",
      "bestFor": "what type of content/audience this works best for"
    }
  ],
  "winner": { "label": "winning hook", "reason": "why it wins" },
  "retentionTips": ["5 tips to keep viewers after the hook"],
  "hookFormulas": [
    { "formula": "template", "example": "filled in example" }
  ]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("AB hooks error:", error);
      res.status(500).json({ error: "Failed to generate hook tests" });
    }
  });

  // ============================================
  // INFLUENCER COLLABORATION FINDER
  // ============================================

  app.post("/api/collab/find", async (req, res) => {
    try {
      const { niche, platform, audienceSize, goals } = req.body;
      if (!niche) return res.status(400).json({ error: "Niche is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an influencer marketing and collaboration expert. Help creators find and approach collaboration partners. Return JSON only.` },
          { role: "user", content: `Find ideal collaboration partners and create outreach strategy for:
Niche: ${niche}
Platform: ${platform || "all platforms"}
Audience size range: ${audienceSize || "any"}
Collab goals: ${goals || "grow audience and cross-promote"}

Return JSON:
{
  "idealPartnerProfile": {
    "niches": ["complementary niches to look for"],
    "audienceSizeRange": "recommended partner audience size",
    "engagementRate": "minimum engagement rate to look for",
    "contentStyle": "compatible content styles",
    "redFlags": ["red flags to avoid in potential partners"]
  },
  "collabIdeas": [
    {
      "type": "collab type (guest appearance/challenge/series/giveaway/takeover/etc.)",
      "description": "detailed description",
      "platforms": ["best platforms for this collab"],
      "expectedReach": "expected audience reach",
      "effort": "easy/medium/hard",
      "contentPlan": "brief content plan for the collab"
    }
  ],
  "outreachTemplates": {
    "dm": {
      "cold": "cold DM template for someone you don't know",
      "warm": "warm DM template for someone you've engaged with",
      "followUp": "follow-up DM if no response"
    },
    "email": {
      "initial": "professional email outreach template",
      "followUp": "follow-up email template",
      "proposal": "formal collaboration proposal template"
    }
  },
  "searchStrategy": {
    "whereToFind": ["5 specific places to find collab partners"],
    "howToVet": ["5 criteria for vetting potential partners"],
    "howToApproach": ["5 tips for successful outreach"]
  },
  "negotiationTips": ["5 tips for negotiating collab terms"],
  "trackingMetrics": ["metrics to track collab success"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Collab finder error:", error);
      res.status(500).json({ error: "Failed to find collaboration opportunities" });
    }
  });

  app.post("/api/collab/outreach", async (req, res) => {
    try {
      const { creatorName, platform, yourNiche, collabType, tone } = req.body;
      if (!creatorName) return res.status(400).json({ error: "Creator name is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an expert at crafting personalized influencer outreach messages that get responses. Return JSON only.` },
          { role: "user", content: `Write personalized outreach messages to collaborate with: "${creatorName}"
Platform: ${platform || "Instagram"}
Your niche: ${yourNiche || "not specified"}
Collaboration type: ${collabType || "content collaboration"}
Tone: ${tone || "professional but friendly"}

Return JSON:
{
  "messages": [
    {
      "type": "DM/Email/Comment",
      "subject": "subject line if email",
      "message": "full message text",
      "tone": "tone description",
      "personalizationTips": "how to personalize further"
    }
  ],
  "followUpSequence": [
    { "day": "Day 3/7/14", "message": "follow up message", "channel": "DM/Email" }
  ],
  "tips": ["5 outreach tips for higher response rates"]
}` }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Collab outreach error:", error);
      res.status(500).json({ error: "Failed to generate outreach messages" });
    }
  });

  // ============================================
  // VIRAL CONTENT ANALYZER
  // ============================================

  app.post("/api/viral-analyzer/analyze", async (req, res) => {
    try {
      const { content, contentType, platform } = req.body;
      if (!content) return res.status(400).json({ error: "Content is required" });
      const truncated = content.substring(0, 3000);
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a viral content analysis expert who can break down exactly why content goes viral. Analyze patterns, psychology, and structure. Return JSON only.` },
          { role: "user", content: `Analyze this ${contentType || "content"} from ${platform || "social media"} and explain exactly why it went viral (or has viral potential):

"${truncated}"

Return JSON:
{
  "viralScore": 85,
  "breakdown": {
    "hookStrength": { "score": 9, "analysis": "why the hook works or doesn't" },
    "emotionalTriggers": { "score": 8, "triggers": ["specific emotions triggered"], "analysis": "how emotions drive sharing" },
    "curiosityGap": { "score": 7, "analysis": "how curiosity is created" },
    "relatability": { "score": 8, "analysis": "why people relate to this" },
    "shareability": { "score": 9, "analysis": "why people share this" },
    "timing": { "score": 7, "analysis": "timing relevance" },
    "format": { "score": 8, "analysis": "how the format contributes" },
    "controversy": { "score": 6, "analysis": "controversy/debate element" }
  },
  "whyItWentViral": ["5 specific reasons this content performs well"],
  "psychologyPrinciples": [
    { "principle": "psychology principle used", "howItsApplied": "how it's applied in this content" }
  ],
  "contentStructure": {
    "hook": "the hook used",
    "body": "how the body maintains attention",
    "cta": "the call to action or payoff",
    "pacing": "how pacing contributes to engagement"
  },
  "replicateIdeas": [
    {
      "idea": "content idea inspired by this viral piece",
      "title": "suggested title",
      "hook": "opening hook",
      "angle": "your unique angle",
      "platform": "best platform for this"
    }
  ],
  "mistakes": ["what could have been done better"],
  "lessonsLearned": ["5 key takeaways for your own content"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content2 = response.choices[0]?.message?.content || "";
      const jsonMatch = content2.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Viral analyzer error:", error);
      res.status(500).json({ error: "Failed to analyze content" });
    }
  });

  app.post("/api/viral-analyzer/formula", async (req, res) => {
    try {
      const { niche, platform } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a viral content formula expert. Identify proven viral content formulas and patterns. Return JSON only.` },
          { role: "user", content: `Provide proven viral content formulas for:
Niche: ${niche || "general"}
Platform: ${platform || "all platforms"}

Return JSON:
{
  "formulas": [
    {
      "name": "formula name",
      "template": "the formula template/structure",
      "example": "filled-in example",
      "whyItWorks": "psychology behind it",
      "bestPlatform": "best platform for this formula",
      "difficulty": "easy/medium/hard",
      "viralPotential": "high/medium"
    }
  ],
  "universalPrinciples": [
    { "principle": "viral principle", "explanation": "how to apply it", "example": "real-world example" }
  ],
  "contentFrameworks": [
    { "framework": "framework name", "steps": ["step-by-step process"], "example": "example application" }
  ],
  "mistakesToAvoid": ["10 common mistakes that kill virality"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Viral formula error:", error);
      res.status(500).json({ error: "Failed to generate viral formulas" });
    }
  });

  // ============================================
  // EMAIL LIST & FUNNEL BUILDER
  // ============================================

  app.post("/api/funnel/landing-page", async (req, res) => {
    try {
      const { product, audience, goal } = req.body;
      if (!product) return res.status(400).json({ error: "Product/offer is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a conversion copywriting expert who creates high-converting landing page copy. Return JSON only.` },
          { role: "user", content: `Create landing page copy for:
Product/Offer: ${product}
Target audience: ${audience || "general"}
Goal: ${goal || "email signups"}

Return JSON:
{
  "headline": "main headline (attention-grabbing)",
  "subheadline": "supporting subheadline",
  "heroSection": {
    "headline": "hero headline",
    "subtext": "hero supporting text",
    "ctaButton": "CTA button text",
    "socialProof": "social proof line (e.g., 'Join 10,000+ subscribers')"
  },
  "painPoints": [
    { "pain": "pain point", "agitation": "why it's urgent", "solution": "how you solve it" }
  ],
  "benefits": [
    { "benefit": "key benefit", "description": "supporting description", "icon": "suggested icon" }
  ],
  "testimonials": [
    { "quote": "testimonial text", "name": "fictional name", "title": "their title/role" }
  ],
  "faq": [
    { "question": "common question", "answer": "answer" }
  ],
  "ctaSections": [
    { "headline": "CTA section headline", "body": "supporting text", "buttonText": "button text" }
  ],
  "urgencyElement": "urgency/scarcity element",
  "seoMeta": { "title": "page title", "description": "meta description" },
  "tips": ["5 landing page optimization tips"]
}` }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Landing page error:", error);
      res.status(500).json({ error: "Failed to generate landing page copy" });
    }
  });

  app.post("/api/funnel/lead-magnet", async (req, res) => {
    try {
      const { niche, audience } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a lead generation expert who creates irresistible lead magnets. Return JSON only.` },
          { role: "user", content: `Generate lead magnet ideas for:
Niche: ${niche || "business"}
Target audience: ${audience || "professionals"}

Return JSON:
{
  "leadMagnets": [
    {
      "type": "ebook/checklist/template/toolkit/quiz/webinar/cheatsheet/swipefile/calculator",
      "title": "lead magnet title",
      "description": "what it contains",
      "outline": ["content outline/sections"],
      "landingPageHeadline": "headline to promote this lead magnet",
      "ctaText": "download button text",
      "expectedConversionRate": "estimated opt-in rate",
      "effort": "easy/medium/hard to create"
    }
  ],
  "optInFormCopy": [
    {
      "headline": "form headline",
      "subtext": "supporting text",
      "buttonText": "submit button text",
      "privacyText": "privacy assurance text"
    }
  ],
  "deliverySequence": {
    "immediate": "what to send immediately after signup",
    "day1": "follow-up email day 1",
    "day3": "follow-up email day 3",
    "day7": "follow-up email day 7"
  },
  "tips": ["5 lead magnet optimization tips"]
}` }
        ],
        max_tokens: 2500,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Lead magnet error:", error);
      res.status(500).json({ error: "Failed to generate lead magnet ideas" });
    }
  });

  app.post("/api/funnel/email-sequence", async (req, res) => {
    try {
      const { product, audience, sequenceType, emails } = req.body;
      if (!product) return res.status(400).json({ error: "Product/offer is required" });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are an email marketing expert who writes high-converting email sequences. Return JSON only.` },
          { role: "user", content: `Create a ${sequenceType || "welcome"} email sequence for:
Product/Offer: ${product}
Target audience: ${audience || "new subscribers"}
Number of emails: ${emails || 7}

Return JSON:
{
  "sequenceName": "sequence name",
  "goal": "sequence goal",
  "emails": [
    {
      "day": "Day 0/1/2/3/etc.",
      "subjectLine": "email subject line",
      "previewText": "email preview text",
      "purpose": "email purpose (welcome/value/story/pitch/etc.)",
      "body": "full email body text",
      "cta": { "text": "CTA text", "action": "what the CTA does" },
      "tips": "tips for this specific email"
    }
  ],
  "sequenceStrategy": "overall strategy explanation",
  "abTestIdeas": [
    { "element": "what to test", "variationA": "option A", "variationB": "option B" }
  ],
  "metrics": ["key metrics to track for this sequence"],
  "tips": ["5 email sequence optimization tips"]
}` }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "Failed to parse response" });
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error: any) {
      console.error("Email sequence error:", error);
      res.status(500).json({ error: "Failed to generate email sequence" });
    }
  });

  return httpServer;
}