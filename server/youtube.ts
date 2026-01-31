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
  
  // Create an OAuth2 client and set the access token
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  return google.youtube({ version: "v3", auth: oauth2Client });
}

// The Medicine & Money Show channel handle
const TARGET_CHANNEL_HANDLE = "medicineandmoneyshow";

export async function fetchYouTubeVideos(
  maxResults: number = 50,
  daysBack: number = 365
): Promise<{ videos: YouTubeVideo[]; totalFetched: number }> {
  try {
    const youtube = await getUncachableYouTubeClient();

    // Get The Medicine & Money Show channel by handle
    const channelResponse = await youtube.channels.list({
      part: ["contentDetails"],
      forHandle: TARGET_CHANNEL_HANDLE,
    });

    let uploadsPlaylistId =
      channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists
        ?.uploads;

    if (!uploadsPlaylistId) {
      // Fallback: try with mine=true if handle lookup fails
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

    // Get playlist items (recent uploads)
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
      return { videos: [], totalFetched: 0 };
    }

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
        thumbnailUrl:
          video.snippet?.thumbnails?.medium?.url ||
          video.snippet?.thumbnails?.default?.url ||
          "",
        categoryId: video.snippet?.categoryId || undefined,
      });
    }

    return { videos, totalFetched: videos.length };
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
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

    await youtube.videos.update({
      part: ["snippet"],
      requestBody: {
        id: videoId,
        snippet: {
          title,
          description,
          tags,
          categoryId: categoryId || "22", // Default to "People & Blogs"
        },
      },
    });

    return {
      success: true,
      message: `Successfully updated video ${videoId}`,
    };
  } catch (error) {
    console.error("Error updating YouTube video:", error);
    return {
      success: false,
      message: `Failed to update video: ${error instanceof Error ? error.message : String(error)}`,
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
