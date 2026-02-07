import { log } from "./index";

interface GHLPostData {
  summary: string;
  mediaUrl?: string;
  platform: string;
  hashtags?: string[];
  accountIds?: string[];
}

interface GHLConfig {
  locationId: string;
  apiKey: string;
  baseUrl: string;
}

function getGHLConfig(): GHLConfig | null {
  const locationId = process.env.GHL_LOCATION_ID;
  const apiKey = process.env.GHL_API_KEY;
  
  if (!locationId || !apiKey) {
    return null;
  }
  
  return {
    locationId,
    apiKey,
    baseUrl: "https://services.leadconnectorhq.com",
  };
}

export function isGHLConfigured(): boolean {
  return getGHLConfig() !== null;
}

export async function getGHLAccounts(): Promise<any[]> {
  const config = getGHLConfig();
  if (!config) return [];

  try {
    const response = await fetch(
      `${config.baseUrl}/social-media-posting/${config.locationId}/accounts`,
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
      }
    );

    if (!response.ok) {
      log(`GHL get accounts failed: ${response.status}`, "ghl");
      return [];
    }

    const data = await response.json();
    return data.accounts || data || [];
  } catch (error) {
    log(`GHL get accounts error: ${error}`, "ghl");
    return [];
  }
}

export async function publishToGHL(postData: GHLPostData): Promise<{
  success: boolean;
  postId?: string;
  error?: string;
}> {
  const config = getGHLConfig();
  if (!config) {
    return {
      success: false,
      error: "Go High Level is not configured. Add GHL_LOCATION_ID and GHL_API_KEY to your secrets.",
    };
  }

  try {
    const hashtagText = postData.hashtags?.length 
      ? "\n\n" + postData.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")
      : "";

    const fullSummary = `${postData.summary}${hashtagText}`;

    const media = postData.mediaUrl
      ? [{ url: postData.mediaUrl, type: "image" }]
      : [];

    const body: Record<string, any> = {
      summary: fullSummary,
      type: "post",
      status: "published",
    };

    if (media.length > 0) {
      body.media = media;
    }

    if (postData.accountIds && postData.accountIds.length > 0) {
      body.accountIds = postData.accountIds;
    }

    log(`Publishing to GHL location ${config.locationId}`, "ghl");

    const response = await fetch(
      `${config.baseUrl}/social-media-posting/${config.locationId}/posts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log(`GHL publish failed: ${response.status} - ${JSON.stringify(errorData)}`, "ghl");
      return {
        success: false,
        error: `GHL API returned ${response.status}: ${errorData.message || "Unknown error"}`,
      };
    }

    const result = await response.json();
    log(`Published to GHL successfully: ${result.id || "no-id"}`, "ghl");

    return {
      success: true,
      postId: result.id || result.postId,
    };
  } catch (error: any) {
    log(`GHL publish error: ${error.message}`, "ghl");
    return {
      success: false,
      error: `Failed to publish: ${error.message}`,
    };
  }
}

export async function getGHLConnectionStatus(): Promise<{
  connected: boolean;
  locationId?: string;
  accounts?: any[];
  message: string;
}> {
  const config = getGHLConfig();
  
  if (!config) {
    return {
      connected: false,
      message: "Go High Level requires configuration. Add GHL_LOCATION_ID and GHL_API_KEY to your secrets.",
    };
  }

  const accounts = await getGHLAccounts();
  
  return {
    connected: true,
    locationId: config.locationId,
    accounts: accounts.map((a: any) => ({
      id: a.id || a._id,
      name: a.name,
      platform: a.type || a.platform,
    })),
    message: `Connected with ${accounts.length} social media account(s)`,
  };
}
