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
  brandKitsTable,
  abTestsTable,
  thumbnailTagsTable,
  thumbnailFoldersTable,
  thumbnailAnalyticsTable,
  analyticsEventsTable,
  thumbnails,
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
import { checkYouTubeConnection, fetchYouTubeVideos, updateYouTubeVideo } from "./youtube";
import { setupOAuthRoutes, seedDemoAccount } from "./auth/oauth-routes";
import { publishToGHL, getGHLConnectionStatus } from "./ghl-service";

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

  // Get YouTube videos from channel
  app.get("/api/youtube/videos", async (req, res) => {
    try {
      const maxResults = parseInt(req.query.maxResults as string) || 20;
      const daysBack = parseInt(req.query.daysBack as string) || 365;
      
      const result = await fetchYouTubeVideos(maxResults, daysBack);
      res.json(result);
    } catch (error) {
      console.error("Error fetching YouTube videos:", error);
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

  // Get optimization status
  app.get("/api/youtube/optimization-status", async (_req, res) => {
    try {
      const { videos } = await fetchYouTubeVideos(50, 365);
      
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

  return httpServer;
}