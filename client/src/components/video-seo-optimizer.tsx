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
  return title.includes("#shorts") || description.includes("#shorts") || 
         video.title.includes("🔥") || video.title.length < 50;
}

export function VideoSeoOptimizer({ onTitleSelect, defaultExpanded = true }: VideoSeoOptimizerProps) {
  const { toast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [optimizedDescription, setOptimizedDescription] = useState("");
  const [optimizedTags, setOptimizedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; processing: boolean }>({ current: 0, total: 0, processing: false });
  const [optimizedVideosState, setOptimizedVideosState] = useState<Record<string, any>>({});

  useEffect(() => {
    setOptimizedVideosState(getOptimizedVideos());
  }, []);

  const { data: connectionStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/youtube/status"],
    refetchInterval: 30000,
  });

  const { data: videosData, isLoading: isLoadingVideos, refetch: refetchVideos } = useQuery<{
    videos: YouTubeVideo[];
    totalFetched: number;
  }>({
    queryKey: ["/api/youtube/videos"],
    enabled: connectionStatus?.connected === true,
  });

  const optimizeMutation = useMutation({
    mutationFn: async (video: YouTubeVideo) => {
      const isVideoShort = isShort(video);
      const response = await apiRequest("POST", "/api/youtube/optimize-seo", {
        title: video.title,
        description: video.description,
        tags: video.tags,
        isShort: isVideoShort,
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
    onSuccess: (_, variables) => {
      markVideoOptimized(variables.video.videoId, variables.description, variables.tags);
      setOptimizedVideosState(getOptimizedVideos());
      toast({
        title: "Video Updated",
        description: "Successfully updated video on YouTube!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/youtube/videos"] });
      setSelectedVideo(null);
      setOptimizedDescription("");
      setOptimizedTags([]);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Could not update video on YouTube. Please try again.";
      toast({
        title: "Update Failed",
        description: errorMessage,
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

  const handleBulkOptimize = async () => {
    if (!videosData?.videos) return;
    
    const unoptimizedVideos = videosData.videos.filter(v => !isVideoOptimized(v.videoId));
    if (unoptimizedVideos.length === 0) {
      toast({
        title: "All Videos Optimized",
        description: "All your videos have already been optimized!",
      });
      return;
    }

    setBulkProgress({ current: 0, total: unoptimizedVideos.length, processing: true });

    for (let i = 0; i < unoptimizedVideos.length; i++) {
      const video = unoptimizedVideos[i];
      try {
        const isVideoShort = isShort(video);
        const optimizeResponse = await apiRequest("POST", "/api/youtube/optimize-seo", {
          title: video.title,
          description: video.description,
          tags: video.tags,
          isShort: isVideoShort,
        });
        const optimizedData = await optimizeResponse.json();

        await apiRequest("PATCH", `/api/youtube/videos/${video.videoId}`, {
          title: video.title,
          description: optimizedData.optimizedDescription,
          tags: optimizedData.optimizedTags,
          categoryId: video.categoryId,
        });

        markVideoOptimized(video.videoId, optimizedData.optimizedDescription, optimizedData.optimizedTags);
        setBulkProgress(prev => ({ ...prev, current: i + 1 }));
      } catch (error) {
        console.error(`Failed to optimize video ${video.videoId}:`, error);
      }
    }

    setOptimizedVideosState(getOptimizedVideos());
    setBulkProgress(prev => ({ ...prev, processing: false }));
    queryClient.invalidateQueries({ queryKey: ["/api/youtube/videos"] });
    
    toast({
      title: "Bulk Optimization Complete",
      description: `Successfully optimized ${bulkProgress.current} videos!`,
    });
  };

  const getOptimizationStatus = (videoId: string) => {
    const info = getOptimizedInfo(videoId);
    if (!info) return null;
    return new Date(info.optimizedAt).toLocaleDateString();
  };

  const unoptimizedCount = videosData?.videos.filter(v => !isVideoOptimized(v.videoId)).length || 0;
  const shortsCount = videosData?.videos.filter(v => isShort(v)).length || 0;

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
          {videosData?.videos && (
            <Badge variant="outline" className="ml-2">
              {videosData.videos.length} videos
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" data-testid="button-toggle-expand">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Select a video to optimize its description and tags
                </p>
                {shortsCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Film className="h-3 w-3 mr-1" />
                    {shortsCount} Shorts
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
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
            </div>

            {unoptimizedCount > 0 && (
              <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium text-sm">Bulk Optimize All Videos</p>
                        <p className="text-xs text-muted-foreground">
                          {unoptimizedCount} video{unoptimizedCount !== 1 ? 's' : ''} not yet optimized
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleBulkOptimize}
                      disabled={bulkProgress.processing}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-bulk-optimize"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {bulkProgress.processing ? "Optimizing..." : "Optimize All"}
                    </Button>
                  </div>
                  {bulkProgress.processing && (
                    <div className="mt-3 space-y-2">
                      <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        Processing {bulkProgress.current} of {bulkProgress.total} videos...
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {unoptimizedCount === 0 && videosData?.videos && videosData.videos.length > 0 && (
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm text-green-700 dark:text-green-300">All Videos Optimized!</p>
                      <p className="text-xs text-muted-foreground">
                        All {videosData.videos.length} videos have been SEO optimized
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                {videosData?.videos.map((video) => {
                  const optimizedDate = getOptimizationStatus(video.videoId);
                  const videoIsShort = isShort(video);
                  
                  return (
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
                      <div className="relative">
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-24 h-14 object-cover rounded"
                            data-testid={`img-video-thumbnail-${video.videoId}`}
                          />
                        )}
                        {videoIsShort && (
                          <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 bg-red-500">
                            Short
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" data-testid={`text-video-title-${video.videoId}`}>{video.title}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-video-date-${video.videoId}`}>
                          {new Date(video.publishedAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground" data-testid={`text-video-tags-count-${video.videoId}`}>
                            {video.tags.length} tags
                          </p>
                          {optimizedDate ? (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-500/50">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                              Optimized {optimizedDate}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-500/50">
                              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                              Not optimized
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedVideo?.videoId === video.videoId && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
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
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{selectedVideo.title}</span>
                    {isShort(selectedVideo) && (
                      <Badge className="bg-red-500 text-white flex-shrink-0">
                        <Film className="h-3 w-3 mr-1" />
                        Short
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleOptimize}
                    disabled={optimizeMutation.isPending}
                    data-testid="button-optimize-seo"
                  >
                    <Sparkles className={`h-4 w-4 mr-2 ${optimizeMutation.isPending ? "animate-pulse" : ""}`} />
                    {optimizeMutation.isPending ? "Optimizing..." : isShort(selectedVideo) ? "Viral Optimize" : "AI Optimize"}
                  </Button>
                </CardTitle>
                {isShort(selectedVideo) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Shorts optimization includes viral hashtags, trending keywords, and engagement hooks
                  </p>
                )}
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
