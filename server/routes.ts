import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertThumbnailSchema } from "@shared/schema";
import { z } from "zod";
import { generateImageBuffer } from "./replit_integrations/image";
import OpenAI, { toFile } from "openai";
import { Readable } from "stream";

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

      const systemPrompt = `You are an expert at analyzing podcast transcripts and creating compelling YouTube thumbnail backgrounds for "The Medicine & Money Show" - a podcast about physician finance, investing, and entrepreneurship.

Analyze the transcript and return a JSON object with:
1. "themes" - Array of 3-5 key themes/topics (short phrases, 2-4 words each)
2. "backgroundPrompt" - A vivid image generation prompt for a futuristic podcast thumbnail background. CRITICAL: Include REAL, TANGIBLE OBJECTS related to the topic - NOT abstract art or gradients. Examples:
   - For gut health: realistic 3D rendered intestines, gut microbiome visualization, anatomical digestive system
   - For investing: realistic gold bars, stock charts on screens, luxury watches, stacks of cash
   - For real estate: modern skyscrapers, luxury homes, property keys, building blueprints
   - For medicine: stethoscopes, medical equipment, pharmaceutical pills, brain MRI scans
   - For wealth: sports cars, private jets, diamond jewelry, luxury lifestyle items
   The background should be dark/black with dramatic lighting on the real objects. Futuristic, cinematic, hyper-realistic 3D style. NO text, NO people, NO abstract patterns.
3. "style" - One of: futuristic, cinematic, medical, finance, tech, dramatic
4. "mood" - One of: dramatic, professional, bold, mysterious, luxurious
5. "suggestedHeadline" - Array of exactly 3 strings for thumbnail text lines:
   - Line 1: Short hook/question (3-5 words, attention-grabbing)
   - Line 2: Key topic/benefit (4-6 words)
   - Line 3: Call-to-action or result (3-5 words)

Focus on finance, medicine, investing, entrepreneurship, and wealth-building themes. Make headlines punchy and clickable.

Return ONLY valid JSON, no markdown or explanation.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this podcast transcript:\n\n${truncatedTranscript}` }
        ],
        max_tokens: 1000,
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

  return httpServer;
}
