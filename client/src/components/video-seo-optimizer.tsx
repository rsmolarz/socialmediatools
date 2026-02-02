import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw, Upload, Youtube, Check, X, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export function VideoSeoOptimizer({ onTitleSelect, defaultExpanded = true }: VideoSeoOptimizerProps) {
  const { toast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [optimizedDescription, setOptimizedDescription] = useState("");
  const [optimizedTags, setOptimizedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { data: connectionStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/youtube/status"],
    refetchInterval: 30000,
  });

  const { data: videosData, isLoading: isLoadingVideos, refetch: refetchVideos, error: videosError } = useQuery<{
    videos: YouTubeVideo[];
    totalFetched: number;
  }>({
    queryKey: ["/api/youtube/videos"],
    enabled: connectionStatus?.connected === true,
    retry: false,
  });

  const optimizeMutation = useMutation({
    mutationFn: async (video: YouTubeVideo) => {
      const response = await apiRequest("POST", "/api/youtube/optimize-seo", {
        title: video.title,
        description: video.description,
        tags: video.tags,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setOptimizedDescription(data.optimizedDescription);
      setOptimizedTags(data.optimizedTags);
      toast({
        title: "SEO Optimized",
        description: "Generated optimized description and tags for your video.",
      });
    },
    onError: () => {
      toast({
        title: "Optimization Failed",
        description: "Could not generate SEO optimization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: async ({
      video,
      description,
      tags,
    }: {
      video: YouTubeVideo;
      description: string;
      tags: string[];
    }) => {
      const response = await apiRequest("PATCH", `/api/youtube/videos/${video.videoId}`, {
        title: video.title,
        description,
        tags,
        categoryId: video.categoryId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video Updated",
        description: "Successfully updated video on YouTube!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/youtube/videos"] });
      setSelectedVideo(null);
      setOptimizedDescription("");
      setOptimizedTags([]);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update video on YouTube. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectVideo = (video: YouTubeVideo) => {
    setSelectedVideo(video);
    setOptimizedDescription(video.description);
    setOptimizedTags(video.tags);
    if (onTitleSelect) {
      onTitleSelect(video.title);
    }
  };

  const handleOptimize = () => {
    if (selectedVideo) {
      optimizeMutation.mutate(selectedVideo);
    }
  };

  const handleUpdateVideo = () => {
    if (selectedVideo) {
      updateVideoMutation.mutate({
        video: selectedVideo,
        description: optimizedDescription,
        tags: optimizedTags,
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !optimizedTags.includes(newTag.trim())) {
      setOptimizedTags([...optimizedTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setOptimizedTags(optimizedTags.filter((tag) => tag !== tagToRemove));
  };

  if (!connectionStatus?.connected) {
    return (
      <Card className="border-dashed" data-testid="card-youtube-disconnected">
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Youtube className="h-10 w-10 text-muted-foreground" data-testid="icon-youtube-disconnected" />
            <div>
              <p className="font-medium" data-testid="text-youtube-status">YouTube Not Connected</p>
              <p className="text-sm text-muted-foreground" data-testid="text-youtube-help">
                Connect your YouTube account using Replit's integrations panel to optimize video SEO
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (videosError) {
    return (
      <Card className="border-orange-500/30 bg-orange-500/5" data-testid="card-youtube-error">
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-orange-500" data-testid="icon-youtube-error" />
            <div>
              <p className="font-medium text-orange-700 dark:text-orange-400" data-testid="text-youtube-error-title">YouTube API Quota Exceeded</p>
              <p className="text-sm text-muted-foreground mt-2" data-testid="text-youtube-error-help">
                You've exceeded the daily YouTube API quota limit. The quota resets at midnight Pacific Time (approximately 3:00 AM Eastern).
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please try again tomorrow, or request a quota increase from Google Cloud Console.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => refetchVideos()}
                data-testid="button-retry-videos"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="toggle-video-seo"
      >
        <div className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          <h3 className="font-semibold">Video SEO Optimizer</h3>
        </div>
        <Button variant="ghost" size="icon" data-testid="button-toggle-expand">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Select a video to optimize its description and tags
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchVideos()}
              disabled={isLoadingVideos}
              data-testid="button-refresh-videos"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingVideos ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {isLoadingVideos ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-48 rounded-md border">
              <div className="p-2 space-y-2">
                {videosData?.videos.map((video) => (
                  <div
                    key={video.videoId}
                    className={`flex gap-3 p-2 rounded-md cursor-pointer hover-elevate ${
                      selectedVideo?.videoId === video.videoId
                        ? "bg-accent"
                        : ""
                    }`}
                    onClick={() => handleSelectVideo(video)}
                    data-testid={`video-item-${video.videoId}`}
                  >
                    {video.thumbnailUrl && (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-24 h-14 object-cover rounded"
                        data-testid={`img-video-thumbnail-${video.videoId}`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`text-video-title-${video.videoId}`}>{video.title}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-video-date-${video.videoId}`}>
                        {new Date(video.publishedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-video-tags-count-${video.videoId}`}>
                        {video.tags.length} tags
                      </p>
                    </div>
                    {selectedVideo?.videoId === video.videoId && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                ))}
                {videosData?.videos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent videos found
                  </p>
                )}
              </div>
            </ScrollArea>
          )}

          {selectedVideo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                  <span className="truncate">{selectedVideo.title}</span>
                  <Button
                    size="sm"
                    onClick={handleOptimize}
                    disabled={optimizeMutation.isPending}
                    data-testid="button-optimize-seo"
                  >
                    <Sparkles className={`h-4 w-4 mr-2 ${optimizeMutation.isPending ? "animate-pulse" : ""}`} />
                    {optimizeMutation.isPending ? "Optimizing..." : "AI Optimize"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Optimized Description</Label>
                  <Textarea
                    value={optimizedDescription}
                    onChange={(e) => setOptimizedDescription(e.target.value)}
                    rows={6}
                    placeholder="Video description..."
                    data-testid="textarea-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags ({optimizedTags.length})</Label>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {optimizedTags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                        data-testid={`badge-tag-${index}`}
                      >
                        {tag}
                        <X className="h-3 w-3 ml-1" data-testid={`icon-remove-tag-${index}`} />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add new tag..."
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      data-testid="input-new-tag"
                    />
                    <Button variant="outline" onClick={handleAddTag} data-testid="button-add-tag">
                      Add
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={handleUpdateVideo}
                    disabled={updateVideoMutation.isPending}
                    data-testid="button-update-youtube"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {updateVideoMutation.isPending ? "Updating..." : "Update on YouTube"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedVideo(null);
                      setOptimizedDescription("");
                      setOptimizedTags([]);
                    }}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
