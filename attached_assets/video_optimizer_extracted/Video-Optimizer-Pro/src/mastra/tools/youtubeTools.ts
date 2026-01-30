import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { google } from "googleapis";

// YouTube connection integration - connection:conn_youtube_01K6EATYGDWNCHJ8NCFAKKH63P
let connectionSettings: any;

async function getAccessToken() {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=youtube",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("YouTube not connected");
  }
  return accessToken;
}

async function getUncachableYouTubeClient() {
  const accessToken = await getAccessToken();
  
  // Create an OAuth2 client and set the access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.youtube({ version: "v3", auth: oauth2Client });
}

// Video schema for output
const videoSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  publishedAt: z.string(),
  categoryId: z.string().optional(),
});

export type YouTubeVideo = z.infer<typeof videoSchema>;

/**
 * Tool to fetch recent videos from the authenticated user's YouTube channel
 */
export const fetchYouTubeVideosTool = createTool({
  id: "fetch-youtube-videos",
  description:
    "Fetches recent videos from the authenticated YouTube channel. Returns videos uploaded in the last specified number of days.",

  inputSchema: z.object({
    maxResults: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of videos to fetch (default: 10, max: 50)"),
    daysBack: z
      .number()
      .optional()
      .default(7)
      .describe("Number of days to look back for videos (default: 7)"),
  }),

  outputSchema: z.object({
    videos: z.array(videoSchema),
    totalFetched: z.number(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("🎬 [fetchYouTubeVideosTool] Starting to fetch videos", {
      maxResults: context.maxResults,
      daysBack: context.daysBack,
    });

    try {
      const youtube = await getUncachableYouTubeClient();

      // Get the authenticated user's channel
      logger?.info("📺 [fetchYouTubeVideosTool] Getting channel info...");
      const channelResponse = await youtube.channels.list({
        part: ["contentDetails"],
        mine: true,
      });

      const uploadsPlaylistId =
        channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists
          ?.uploads;

      if (!uploadsPlaylistId) {
        logger?.error("❌ [fetchYouTubeVideosTool] No uploads playlist found");
        return { videos: [], totalFetched: 0 };
      }

      logger?.info("📋 [fetchYouTubeVideosTool] Found uploads playlist", {
        uploadsPlaylistId,
      });

      // Get playlist items (recent uploads)
      const playlistResponse = await youtube.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId: uploadsPlaylistId,
        maxResults: Math.min(context.maxResults || 10, 50),
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (context.daysBack || 7));

      const videoIds: string[] = [];
      for (const item of playlistResponse.data.items || []) {
        const publishedAt = item.snippet?.publishedAt;
        if (publishedAt && new Date(publishedAt) >= cutoffDate) {
          const videoId = item.contentDetails?.videoId;
          if (videoId) {
            videoIds.push(videoId);
          }
        }
      }

      if (videoIds.length === 0) {
        logger?.info(
          "📭 [fetchYouTubeVideosTool] No recent videos found within the specified timeframe",
        );
        return { videos: [], totalFetched: 0 };
      }

      logger?.info(
        `📹 [fetchYouTubeVideosTool] Found ${videoIds.length} recent videos`,
      );

      // Get full video details including tags
      const videosResponse = await youtube.videos.list({
        part: ["snippet"],
        id: videoIds,
      });

      const videos: YouTubeVideo[] = [];
      for (const video of videosResponse.data.items || []) {
        videos.push({
          videoId: video.id || "",
          title: video.snippet?.title || "",
          description: video.snippet?.description || "",
          tags: video.snippet?.tags || [],
          publishedAt: video.snippet?.publishedAt || "",
          categoryId: video.snippet?.categoryId || undefined,
        });
      }

      logger?.info(
        `✅ [fetchYouTubeVideosTool] Successfully fetched ${videos.length} videos`,
      );
      return { videos, totalFetched: videos.length };
    } catch (error) {
      logger?.error("❌ [fetchYouTubeVideosTool] Error fetching videos", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

/**
 * Tool to update a YouTube video's description and tags
 */
export const updateYouTubeVideoTool = createTool({
  id: "update-youtube-video",
  description:
    "Updates a YouTube video's description and tags with optimized content.",

  inputSchema: z.object({
    videoId: z.string().describe("The YouTube video ID to update"),
    title: z.string().describe("The video title (required for update)"),
    description: z
      .string()
      .describe("The new optimized description for the video"),
    tags: z.array(z.string()).describe("The new optimized tags for the video"),
    categoryId: z.string().optional().describe("The video category ID"),
  }),

  outputSchema: z.object({
    success: z.boolean(),
    videoId: z.string(),
    message: z.string(),
  }),

  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info("📝 [updateYouTubeVideoTool] Starting video update", {
      videoId: context.videoId,
    });

    try {
      const youtube = await getUncachableYouTubeClient();

      // Update the video
      await youtube.videos.update({
        part: ["snippet"],
        requestBody: {
          id: context.videoId,
          snippet: {
            title: context.title,
            description: context.description,
            tags: context.tags,
            categoryId: context.categoryId || "22", // Default to "People & Blogs"
          },
        },
      });

      logger?.info("✅ [updateYouTubeVideoTool] Video updated successfully", {
        videoId: context.videoId,
      });

      return {
        success: true,
        videoId: context.videoId,
        message: `Successfully updated video ${context.videoId} with optimized description and tags`,
      };
    } catch (error) {
      logger?.error("❌ [updateYouTubeVideoTool] Error updating video", {
        videoId: context.videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        videoId: context.videoId,
        message: `Failed to update video: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
