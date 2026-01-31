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
  brandKitsTable
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { generateImageBuffer } from "./replit_integrations/image";
import OpenAI, { toFile } from "openai";
import { Readable } from "stream";
import { viralAnalyzer } from "./lib/viral-analyzer";
import { randomBytes } from "crypto";
import archiver from "archiver";
import { checkYouTubeConnection, fetchYouTubeVideos, updateYouTubeVideo } from "./youtube";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
      const b64_json = response.data[0]?.b64_json;
      
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

      const prompt = `You are a YouTube SEO expert for "The Medicine & Money Show" podcast. Optimize the following video metadata for maximum discoverability and engagement.

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

  return httpServer;
}
