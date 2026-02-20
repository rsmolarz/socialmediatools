// YouTube Integration - connection:conn_youtube_01K6EATYGDWNCHJ8NCFAKKH63P
import { google } from "googleapis";

interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  thumbnailUrl: string;
  categoryId?: string;
}

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
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("YouTube not connected");
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
async function getUncachableYouTubeClient() {
  const accessToken = await getAccessToken();
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.youtube({ version: "v3", auth: oauth2Client });
}

// The Medicine & Money Show channel handle
const TARGET_CHANNEL_HANDLE = "medicineandmoneyshow";

// Server-side cache for video list to avoid burning API quota on every page load
let videoCache: { videos: YouTubeVideo[]; totalFetched: number } | null = null;
let videoCacheTime: number = 0;
const VIDEO_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Track quota errors to stop retrying when quota is exhausted
let quotaExceededAt: number = 0;
const QUOTA_COOLDOWN = 30 * 60 * 1000; // 30 min cooldown after quota error

export function invalidateVideoCache() {
  videoCache = null;
  videoCacheTime = 0;
}

export async function fetchYouTubeVideos(
  maxResults: number = 50,
  daysBack: number = 365,
  forceRefresh: boolean = false
): Promise<{ videos: YouTubeVideo[]; totalFetched: number }> {
  // If quota was recently exceeded, don't hammer the API
  if (quotaExceededAt && (Date.now() - quotaExceededAt) < QUOTA_COOLDOWN) {
    if (videoCache) {
      return videoCache;
    }
    throw new Error("YouTube API quota exceeded. Please try again later.");
  }

  if (!forceRefresh && videoCache && (Date.now() - videoCacheTime) < VIDEO_CACHE_TTL) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const filtered = videoCache.videos.filter(
      v => new Date(v.publishedAt) >= cutoffDate
    ).slice(0, maxResults);
    return { videos: filtered, totalFetched: filtered.length };
  }

  try {
    const youtube = await getUncachableYouTubeClient();

    const channelResponse = await youtube.channels.list({
      part: ["contentDetails"],
      forHandle: TARGET_CHANNEL_HANDLE,
    });

    let uploadsPlaylistId =
      channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists
        ?.uploads;

    if (!uploadsPlaylistId) {
      const fallbackResponse = await youtube.channels.list({
        part: ["contentDetails"],
        mine: true,
      });
      uploadsPlaylistId =
        fallbackResponse.data.items?.[0]?.contentDetails?.relatedPlaylists
          ?.uploads;
      if (!uploadsPlaylistId) {
        return { videos: [], totalFetched: 0 };
      }
    }

    const playlistResponse = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(maxResults, 50),
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

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
      videoCache = { videos: [], totalFetched: 0 };
      videoCacheTime = Date.now();
      return videoCache;
    }

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
        thumbnailUrl:
          video.snippet?.thumbnails?.medium?.url ||
          video.snippet?.thumbnails?.default?.url ||
          "",
        categoryId: video.snippet?.categoryId || undefined,
      });
    }

    videoCache = { videos, totalFetched: videos.length };
    videoCacheTime = Date.now();
    return { videos, totalFetched: videos.length };
  } catch (error: any) {
    console.error("Error fetching YouTube videos:", error);
    if (error?.status === 403 || error?.code === 403 || 
        error?.errors?.[0]?.reason === "quotaExceeded" ||
        error?.message?.includes("quota")) {
      quotaExceededAt = Date.now();
      console.log("YouTube quota exceeded - entering 30 min cooldown to prevent further API calls");
    }
    throw error;
  }
}

export async function updateYouTubeVideo(
  videoId: string,
  title: string,
  description: string,
  tags: string[],
  categoryId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const youtube = await getUncachableYouTubeClient();

    // Try to use provided categoryId, then look up from cache, then default
    let effectiveCategoryId = categoryId;
    if (!effectiveCategoryId && videoCache) {
      const cached = videoCache.videos.find(v => v.videoId === videoId);
      effectiveCategoryId = cached?.categoryId;
    }
    if (!effectiveCategoryId) {
      effectiveCategoryId = "22";
    }

    await youtube.videos.update({
      part: ["snippet"],
      requestBody: {
        id: videoId,
        snippet: {
          title,
          description,
          tags,
          categoryId: effectiveCategoryId,
        },
      },
    });

    invalidateVideoCache();

    return {
      success: true,
      message: `Successfully updated video ${videoId}`,
    };
  } catch (error: any) {
    console.error("Error updating YouTube video:", error);
    
    let errorMessage = "Unknown error";
    if (error?.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error?.errors?.[0]?.message) {
      errorMessage = error.errors[0].message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    if (errorMessage.includes("forbidden") || errorMessage.includes("403")) {
      errorMessage = "Permission denied. Make sure the YouTube account is connected and has write access to this video.";
    }
    
    return {
      success: false,
      message: `Failed to update video: ${errorMessage}`,
    };
  }
}

export async function checkYouTubeConnection(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export function getCachedVideos(): { videos: YouTubeVideo[]; totalFetched: number } | null {
  if (videoCache && (Date.now() - videoCacheTime) < VIDEO_CACHE_TTL) {
    return videoCache;
  }
  return null;
}
