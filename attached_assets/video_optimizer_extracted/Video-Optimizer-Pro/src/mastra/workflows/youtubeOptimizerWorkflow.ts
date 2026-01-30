import { createStep, createWorkflow } from "../inngest";
import { z } from "zod";
import { youtubeOptimizerAgent } from "../agents/youtubeOptimizerAgent";
import { createOptimizationRecord, updateOptimizationRecord } from "../db/optimizationRecords";

/**
 * YouTube Video Optimizer Workflow
 *
 * This workflow automatically optimizes YouTube video descriptions and tags:
 * 1. Fetches recent/updated videos from the YouTube channel
 * 2. Uses AI to generate optimized descriptions and tags for each video
 * 3. Updates the videos with the optimized content
 */

// Schema for video data
const videoSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  publishedAt: z.string(),
  categoryId: z.string().optional(),
});

/**
 * Step 1: Fetch recent videos from YouTube channel
 * Returns an array of videos directly for use with foreach
 */
const fetchVideosStep = createStep({
  id: "get-new-or-updated-youtube-videos",
  description: "Retrieves new or recently updated videos from YouTube channel",

  inputSchema: z.object({}),

  // Output is an array of videos directly for foreach consumption
  outputSchema: z.array(videoSchema),

  execute: async ({ mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🎬 [Step 1] Fetching recent YouTube videos...");

    const prompt = `
      Use the fetchYouTubeVideosTool to get recent videos from my YouTube channel.
      Fetch up to 10 videos from the last 7 days.
      Return the list of videos you found.
    `;

    const response = await youtubeOptimizerAgent.generateLegacy(
      [{ role: "user", content: prompt }],
      { maxSteps: 3 },
    );

    // Extract videos from tool results
    let videos: z.infer<typeof videoSchema>[] = [];

    // Check steps for tool results (multi-step mode)
    // Tool IDs are "fetch-youtube-videos" and "update-youtube-video"
    if (response.steps) {
      for (const step of response.steps) {
        if (step.toolResults) {
          for (const result of step.toolResults) {
            // Check for tool ID (fetch-youtube-videos) or variable name
            if (
              (result.toolName === "fetch-youtube-videos" ||
                result.toolName === "fetchYouTubeVideosTool") &&
              result.result
            ) {
              const toolResult = result.result as {
                videos: z.infer<typeof videoSchema>[];
                totalFetched: number;
              };
              videos = toolResult.videos || [];
            }
          }
        }
      }
    }

    logger?.info(`✅ [Step 1] Fetched ${videos.length} videos`);
    
    if (videos.length === 0) {
      logger?.info("📭 [Step 1] No videos to optimize - foreach will receive empty array");
    } else {
      logger?.info(`🔄 [Step 1] Passing ${videos.length} videos to optimization step`);
      videos.forEach((v, i) => logger?.info(`  - Video ${i + 1}: ${v.title} (${v.videoId})`));
    }
    
    // Return the videos array directly for foreach
    return videos;
  },
});

/**
 * Step 2: Optimize video and update it in one combined step
 * This step handles both AI optimization and YouTube update for a single video
 */
const optimizeAndUpdateVideoStep = createStep({
  id: "optimize-video-description-and-tags-with-ai",
  description: "Optimizes video description and tags using AI and updates YouTube",

  inputSchema: videoSchema,

  outputSchema: z.object({
    videoId: z.string(),
    title: z.string(),
    success: z.boolean(),
    message: z.string(),
  }),

  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info(
      `🔧 [Step 2] Optimizing and updating video: ${inputData.title} (${inputData.videoId})`,
    );

    // Create database record for tracking
    let recordId: string | null = null;
    try {
      recordId = await createOptimizationRecord(
        {
          videoId: inputData.videoId,
          videoTitle: inputData.title,
          originalDescription: inputData.description,
          originalTags: inputData.tags,
        },
        logger as any
      );
    } catch (dbError) {
      logger?.warn(`⚠️ [Step 2] Could not create DB record: ${dbError}`);
    }

    // Variables for tracking optimization results
    let optimizedDescription = inputData.description;
    let optimizedTags = inputData.tags;
    let success = false;
    let message = "Update status unknown";
    let errorOccurred: Error | null = null;

    try {
      // Step 2a: Generate optimized content with AI
      const optimizePrompt = `
      Please optimize the following YouTube video for better SEO and discoverability:

      **Video Title:** ${inputData.title}
      
      **Current Description:**
      ${inputData.description || "(No description)"}
      
      **Current Tags:**
      ${inputData.tags.length > 0 ? inputData.tags.join(", ") : "(No tags)"}

      Please provide:
      1. An optimized description that:
         - Has a compelling hook in the first 2-3 lines
         - Includes relevant keywords naturally
         - Has clear formatting with line breaks
         - Includes a call-to-action
         - Preserves any existing links or important information

      2. A list of 15-25 optimized tags that:
         - Include broad and specific topic tags
         - Use relevant long-tail keywords
         - Cover variations and synonyms of key terms

      Format your response as JSON with this structure:
      {
        "optimizedDescription": "your optimized description here",
        "optimizedTags": ["tag1", "tag2", "tag3", ...]
      }
    `;

      const optimizeResponse = await youtubeOptimizerAgent.generateLegacy([
        { role: "user", content: optimizePrompt },
      ]);

      // Parse the AI response to extract optimized content
      try {
        // Try to extract JSON from the response
        const jsonMatch = optimizeResponse.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          optimizedDescription = parsed.optimizedDescription || inputData.description;
          optimizedTags = parsed.optimizedTags || inputData.tags;
        }
      } catch (parseError) {
        logger?.warn(
          `⚠️ [Step 2] Could not parse AI response as JSON, using original content`,
          { error: parseError },
        );
      }

      logger?.info(`📝 [Step 2] Generated optimized content, now updating YouTube...`);

      // Step 2b: Update the video on YouTube
      const updatePrompt = `
      Use the updateYouTubeVideoTool to update the following video:
      
      Video ID: ${inputData.videoId}
      Title: ${inputData.title}
      Category ID: ${inputData.categoryId || "22"}
      
      New Description:
      ${optimizedDescription}
      
      New Tags:
      ${JSON.stringify(optimizedTags)}
      
        Update the video now.
      `;

      const updateResponse = await youtubeOptimizerAgent.generateLegacy(
        [{ role: "user", content: updatePrompt }],
        { maxSteps: 3 },
      );

      // Check for tool ID (update-youtube-video) or variable name
      if (updateResponse.steps) {
        for (const step of updateResponse.steps) {
          if (step.toolResults) {
            for (const result of step.toolResults) {
              if (
                (result.toolName === "update-youtube-video" ||
                  result.toolName === "updateYouTubeVideoTool") &&
                result.result
              ) {
                const toolResult = result.result as {
                  success: boolean;
                  message: string;
                };
                success = toolResult.success || false;
                message = toolResult.message || "Update completed";
              }
            }
          }
        }
      }

      logger?.info(`✅ [Step 2] Video update result: ${success ? "Success" : "Failed"}`);

    } catch (error) {
      // Capture any error that occurred during optimization/update
      errorOccurred = error instanceof Error ? error : new Error(String(error));
      logger?.error(`❌ [Step 2] Error during optimization: ${errorOccurred.message}`);
      message = errorOccurred.message;
      success = false;
    } finally {
      // Always update database record with final status
      if (recordId) {
        try {
          await updateOptimizationRecord(
            recordId,
            {
              optimizedDescription,
              optimizedTags,
              status: success ? "completed" : "failed",
              errorMessage: success ? undefined : message,
            },
            logger as any
          );
        } catch (dbError) {
          logger?.warn(`⚠️ [Step 2] Could not update DB record: ${dbError}`);
        }
      }
    }

    // Re-throw error if one occurred so workflow can handle it
    if (errorOccurred) {
      throw errorOccurred;
    }

    return {
      videoId: inputData.videoId,
      title: inputData.title,
      success,
      message,
    };
  },
});

/**
 * Create the YouTube Optimizer Workflow
 */
// Define the output type for optimization results
const optimizationResultSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  success: z.boolean(),
  message: z.string(),
});

export const youtubeOptimizerWorkflow = createWorkflow({
  id: "youtube-optimizer-workflow",

  // Empty input schema for cron-triggered workflows
  inputSchema: z.object({}) as any,

  // Output schema matches the foreach array output directly
  outputSchema: z.array(optimizationResultSchema),
})
  .then(fetchVideosStep as any)
  // fetchVideosStep returns videos array directly, foreach processes each
  .foreach(optimizeAndUpdateVideoStep as any, { concurrency: 5 })
  .commit();
