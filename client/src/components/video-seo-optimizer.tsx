import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw, Upload, Youtube, Check, X, ChevronDown, ChevronUp, Zap, CheckCircle2, AlertCircle, Film } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { handleYouTubeError, logError, retryWithBackoff, YouTubeQuotaError } from "@/lib/api-error-handler";

interface YouTubeVideo {
    videoId: string;
    title: string;
    description: string;
    tags: string[];
    publishedAt: string;
    thumbnailUrl: string;
    categoryId?: string;
}

interface VideoSeoOptimizerProps {
    onTitleSelect?: (title: string) => void;
    defaultExpanded?: boolean;
}

const OPTIMIZED_VIDEOS_KEY = "optimized_youtube_videos";

function getOptimizedVideos(): Record<string, { optimizedAt: string; description: string; tags: string[] }> {
    try {
          const stored = localStorage.getItem(OPTIMIZED_VIDEOS_KEY);
          return stored ? JSON.parse(stored) : {};
    } catch {
          return {};
    }
}

function markVideoOptimized(videoId: string, description: string, tags: string[]) {
    const current = getOptimizedVideos();
    current[videoId] = {
          optimizedAt: new Date().toISOString(),
          description,
          tags,
    };
    localStorage.setItem(OPTIMIZED_VIDEOS_KEY, JSON.stringify(current));
}

function isVideoOptimized(videoId: string): boolean {
    return videoId in getOptimizedVideos();
}

function getOptimizedInfo(videoId: string) {
    return getOptimizedVideos()[videoId];
}

function isShort(video: YouTubeVideo): boolean {
    const title = video.title.toLowerCase();
    const description = video.description.toLowerCase();
    return (
          title.includes("#shorts") ||
          description.includes("#shorts") ||
          video.title.includes("🔥") ||
          video.title.length < 50
        );
}

export function VideoSeoOptimizer({ onTitleSelect, defaultExpanded = true }: VideoSeoOptimizerProps) {
    // Check if feature is enabled
    if (!isFeatureEnabled('videoSeoOptimizer')) {
          return null;
    }

    const { toast } = useToast();
    const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
    const [optimizedDescription, setOptimizedDescription] = useState("");
    const [optimizedTags, setOptimizedTags] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [newTag, setNewTag] = useState("");

    // Fetch user's YouTube videos with error handling and retry logic
    const {
          data: videos = [],
          isLoading,
          isError,
          error,
          refetch,
    } = useQuery({
          queryKey: ["youtube-videos"],
          queryFn: async () => {
                  try {
                            return await retryWithBackoff(async () => {
                                        const response = await apiRequest("GET", "/api/youtube/videos");
                                        return response.data || [];
                            });
                  } catch (err) {
                            const { message, code } = handleYouTubeError(err);
                            logError(err, {
                                        component: "VideoSeoOptimizer",
                                        action: "fetchVideos",
                                        code,
                            });

                            if (code === "YOUTUBE_QUOTA_EXCEEDED") {
                                        throw new YouTubeQuotaError(message);
                            }
                            throw new Error(message);
                  }
          },
          retry: (failureCount, error) => {
                  // Don't retry quota errors
                  if (error instanceof YouTubeQuotaError) {
                            return false;
                  }
                  return failureCount < 2;
          },
    });

    // Optimize video description and tags
    const optimizeVideoMutation = useMutation({
          mutationFn: async (video: YouTubeVideo) => {
                  try {
                            return await retryWithBackoff(async () => {
                                        const response = await apiRequest("POST", "/api/youtube/optimize", {
                                                      videoId: video.videoId,
                                                      title: video.title,
                                                      description: video.description,
                                                      tags: video.tags,
                                        });
                                        return response.data;
                            });
                  } catch (err) {
                            const { message } = handleYouTubeError(err);
                            logError(err, {
                                        component: "VideoSeoOptimizer",
                                        action: "optimizeVideo",
                                        videoId: video.videoId,
                            });
                            throw new Error(message);
                  }
          },
          onSuccess: (data, video) => {
                  setOptimizedDescription(data.description);
                  setOptimizedTags(data.tags);
                  markVideoOptimized(video.videoId, data.description, data.tags);
                  toast({
                            title: "Success",
                            description: "Video optimized successfully",
                  });
          },
          onError: (error) => {
                  const errorMessage = error instanceof Error ? error.message : 
          }
                  })
          }
                            })
                  }
                                        })
                            })
                  }
          }
    })
                  }
          }
                            }
                            })
                  }
                            })
                  }
          }
    })
    }
    }
}
    )
}
}
}
    }
}
    }
    }
}
}
}