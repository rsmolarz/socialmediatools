import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertThumbnailSchema, insertViralContentSchema, insertSocialPostSchema, insertViralTopicSchema } from "@shared/schema";
import { z } from "zod";
import { generateImageBuffer } from "./replit_integrations/image";
import OpenAI, { toFile } from "openai";
import { Readable } from "stream";
import { viralAnalyzer } from "./lib/viral-analyzer";

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

          // Generate AI thumbnail for the post
          let thumbnailUrl: string | null = null;
          try {
            const thumbnailPrompt = content.thumbnailPrompt || 
              `Professional social media thumbnail for "${content.title}" - Medicine & Money Show branding, featuring a doctor in white coat overlooking a city skyline at sunset, bold text overlay "${topic.toUpperCase()}", photorealistic, high quality, 16:9 aspect ratio`;
            
            const imageBuffer = await generateImageBuffer(thumbnailPrompt, "1024x1024");
            thumbnailUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
          } catch (imgErr) {
            console.error("Error generating thumbnail:", imgErr);
          }

          // Also save to social_posts for the Manage queue
          const postData = insertSocialPostSchema.parse({
            viralContentId: savedViral.id,
            platform: content.platform,
            title: content.title,
            description: content.description,
            script: content.script || null,
            hashtags: content.hashtags,
            hooks: content.hooks,
            viralityScore: content.viralityScore,
            thumbnailUrl: thumbnailUrl,
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
        title: true,
        description: true,
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

  return httpServer;
}
