import { useState, useRef } from "react";
import logoImage from "@assets/aragonai-6db9ede2-5123-48c3-8ae3-ed1f0654d82a_1769872211051.jpeg";
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  TrendingUp, 
  Sparkles, 
  Check, 
  X, 
  Trash2, 
  Youtube, 
  Instagram,
  Facebook,
  Linkedin,
  RefreshCw,
  Zap,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Copy,
  ExternalLink,
  Eye,
  ImagePlus,
  Upload,
  User,
  Layers,
  Image
} from "lucide-react";

interface ViralTopic {
  keyword: string;
  averageInterest: number;
  trendDirection: "up" | "down" | "stable";
  popularity: "high" | "medium" | "low";
  contentSuggestion: {
    title: string;
    urgency: string;
    reason: string;
  };
}

interface GeneratedContent {
  platform: string;
  title: string;
  description: string;
  script?: string;
  hashtags: string[];
  hooks: string[];
  viralityScore: number;
  thumbnailPrompt?: string;
}

interface SocialPost {
  id: number;
  viralContentId: number | null;
  platform: string;
  title: string;
  description: string | null;
  script: string | null;
  hashtags: string[] | null;
  hooks: string[] | null;
  targetLength: string | null;
  viralityScore: number | null;
  status: string | null;
  approvedBy: string | null;
  thumbnailUrl: string | null;
  backgroundUrl: string | null;
  backgroundOpacity: number | null;
  showLogo: boolean | null;
  createdAt: string;
}

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "youtube":
      return <Youtube className="w-4 h-4 text-red-500" />;
    case "tiktok":
      return <TikTokIcon />;
    case "instagram":
      return <Instagram className="w-4 h-4 text-pink-500" />;
    case "facebook":
      return <Facebook className="w-4 h-4 text-blue-600" />;
    case "linkedin":
      return <Linkedin className="w-4 h-4 text-blue-700" />;
    default:
      return <Zap className="w-4 h-4" />;
  }
};

const PLATFORMS = ["facebook", "instagram", "linkedin"] as const;
type Platform = typeof PLATFORMS[number];

const getTrendIcon = (direction: string) => {
  switch (direction) {
    case "up":
      return <ArrowUp className="w-4 h-4 text-green-500" />;
    case "down":
      return <ArrowDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "approved":
      return "bg-green-500/20 text-green-700 dark:text-green-400";
    case "rejected":
      return "bg-red-500/20 text-red-700 dark:text-red-400";
    case "posted":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    default:
      return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
  }
};

export function SocialMediaDashboard() {
  const { toast } = useToast();
  const [customTopic, setCustomTopic] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<ViralTopic | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [previewPost, setPreviewPost] = useState<SocialPost | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPostId, setUploadingPostId] = useState<number | null>(null);
  const [dragOverPostId, setDragOverPostId] = useState<number | null>(null);
  const [processingPostId, setProcessingPostId] = useState<number | null>(null);

  const { data: topicsData, isLoading: topicsLoading, refetch: refetchTopics } = useQuery<{ topics: ViralTopic[] }>({
    queryKey: ["/api/viral/discover-topics"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = useQuery<{ posts: SocialPost[] }>({
    queryKey: ["/api/viral/posts"],
    staleTime: 30 * 1000,
  });

  const generateContentMutation = useMutation({
    mutationFn: async (topic: string) => {
      const response = await apiRequest("POST", "/api/viral/generate-content", {
        topic,
        platforms: ["youtube", "tiktok", "instagram"],
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content || []);
      queryClient.invalidateQueries({ queryKey: ["/api/viral/content"] });
      toast({
        title: "Content Generated",
        description: `Generated ${data.content?.length || 0} platform-specific content pieces`,
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest("POST", `/api/viral/posts/${postId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
      toast({ title: "Post Approved", description: "Content is ready for posting" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest("POST", `/api/viral/posts/${postId}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
      toast({ title: "Post Rejected", description: "Content has been rejected" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest("DELETE", `/api/viral/posts/${postId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
      toast({ title: "Post Deleted", description: "Content has been removed" });
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: async ({ postId, photoUrl }: { postId: number; photoUrl: string }) => {
      const response = await apiRequest("PATCH", `/api/viral/posts/${postId}`, {
        thumbnailUrl: photoUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
      toast({ title: "Photo Updated", description: "Your photo has been added to the post" });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Failed to update photo", variant: "destructive" });
    },
  });

  const toggleLogoMutation = useMutation({
    mutationFn: async ({ postId, showLogo }: { postId: number; showLogo: boolean }) => {
      const response = await apiRequest("PATCH", `/api/viral/posts/${postId}`, {
        showLogo,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
      toast({ title: "Logo Updated", description: "Logo visibility has been updated" });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Failed to update logo", variant: "destructive" });
    },
  });

  const updateBackgroundMutation = useMutation({
    mutationFn: async ({ postId, backgroundUrl }: { postId: number; backgroundUrl: string }) => {
      const response = await apiRequest("PATCH", `/api/viral/posts/${postId}`, {
        backgroundUrl: backgroundUrl || null,
      });
      return { result: await response.json(), wasRemoved: !backgroundUrl };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
      if (data.wasRemoved) {
        toast({ title: "Background Removed", description: "Background image has been removed" });
      } else {
        toast({ title: "Background Updated", description: "Background image has been set" });
      }
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Failed to update background", variant: "destructive" });
    },
  });

  const updateOpacityMutation = useMutation({
    mutationFn: async ({ postId, backgroundOpacity }: { postId: number; backgroundOpacity: number }) => {
      const response = await apiRequest("PATCH", `/api/viral/posts/${postId}`, {
        backgroundOpacity,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Failed to update opacity", variant: "destructive" });
    },
  });

  const regenerateBackgroundMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest("POST", `/api/viral/posts/${postId}/regenerate-background`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
      toast({ title: "Background Generated", description: "New AI background has been created" });
    },
    onError: () => {
      toast({ title: "Generation Failed", description: "Failed to generate new background", variant: "destructive" });
    },
  });

  const updatePlatformMutation = useMutation({
    mutationFn: async ({ postId, platform }: { postId: number; platform: string }) => {
      const response = await apiRequest("PATCH", `/api/viral/posts/${postId}`, {
        platform,
      });
      return response.json();
    },
    onMutate: async ({ postId, platform }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/viral/posts"] });
      const previousData = queryClient.getQueryData(["/api/viral/posts"]);
      queryClient.setQueryData(["/api/viral/posts"], (old: { posts: SocialPost[]; total: number } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          posts: old.posts.map((p: SocialPost) =>
            p.id === postId ? { ...p, platform } : p
          ),
        };
      });
      if (previewPost && previewPost.id === postId) {
        setPreviewPost({ ...previewPost, platform });
      }
      return { previousData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral/posts"] });
      toast({ title: "Platform Updated", description: `Post format changed to ${variables.platform}` });
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/viral/posts"], context.previousData);
      }
      toast({ title: "Update Failed", description: "Failed to change platform format", variant: "destructive" });
    },
  });

  const removeBackgroundFromImage = async (imageData: string): Promise<string> => {
    const blob = await imglyRemoveBackground(imageData, {
      progress: (key, current, total) => {
        console.log(`Background removal: ${key} - ${current}/${total}`);
      },
    });
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerateFromTopic = (topic: ViralTopic) => {
    setSelectedTopic(topic);
    generateContentMutation.mutate(topic.keyword);
  };

  const handleGenerateCustom = () => {
    if (!customTopic.trim()) return;
    generateContentMutation.mutate(customTopic.trim());
    setCustomTopic("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Content copied to clipboard" });
  };

  const handlePhotoUpload = (postId: number) => {
    setUploadingPostId(postId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingPostId) {
      const postId = uploadingPostId;
      setUploadingPostId(null);
      setProcessingPostId(postId);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          toast({ title: "Removing Background", description: "Processing your image..." });
          const processedImage = await removeBackgroundFromImage(base64);
          updatePhotoMutation.mutate({ postId, photoUrl: processedImage });
          toast({ title: "Background Removed", description: "Image processed successfully" });
        } catch (error) {
          console.error("Background removal failed:", error);
          updatePhotoMutation.mutate({ postId, photoUrl: base64 });
          toast({ 
            title: "Background Removal Failed", 
            description: "Using original image. You can try again later.",
            variant: "destructive" 
          });
        } finally {
          setProcessingPostId(null);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent, postId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPostId(postId);
  };

  const handleDragLeave = (e: React.DragEvent, postId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget as Node;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDragOverPostId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, postId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPostId(null);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setProcessingPostId(postId);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          toast({ title: "Removing Background", description: "Processing your image..." });
          const processedImage = await removeBackgroundFromImage(base64);
          updatePhotoMutation.mutate({ postId, photoUrl: processedImage });
          toast({ title: "Background Removed", description: "Image processed successfully" });
        } catch (error) {
          console.error("Background removal failed:", error);
          updatePhotoMutation.mutate({ postId, photoUrl: base64 });
          toast({ 
            title: "Background Removal Failed", 
            description: "Using original image.",
            variant: "destructive" 
          });
        } finally {
          setProcessingPostId(null);
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please drop an image file",
        variant: "destructive",
      });
    }
  };

  const topics = topicsData?.topics || [];
  const posts = postsData?.posts || [];

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        data-testid="input-photo-upload"
      />
      
      <Dialog open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewPost && getPlatformIcon(previewPost.platform)}
              <span className="capitalize">{previewPost?.platform} Post Preview</span>
            </DialogTitle>
          </DialogHeader>
          {previewPost && (
            <div className="space-y-4">
              <div className="bg-card border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">M&M</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">The Medicine and Money Show</p>
                    <p className="text-xs text-muted-foreground">Just now</p>
                  </div>
                </div>
                {previewPost.description && (
                  <div className="p-3 text-sm">
                    {previewPost.description}
                  </div>
                )}
                {(previewPost.thumbnailUrl || previewPost.backgroundUrl) && (
                  <div className={`relative overflow-hidden bg-muted ${previewPost.platform === "youtube" ? "aspect-video" : previewPost.platform === "tiktok" ? "aspect-[9/16] max-h-[400px]" : "aspect-square"}`}>
                    {previewPost.backgroundUrl && (
                      <img 
                        src={previewPost.backgroundUrl} 
                        alt="Background"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: (previewPost.backgroundOpacity ?? 100) / 100 }}
                      />
                    )}
                    {previewPost.thumbnailUrl && (
                      <img 
                        src={previewPost.thumbnailUrl} 
                        alt={previewPost.title}
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ objectPosition: "center" }}
                      />
                    )}
                    {previewPost.showLogo && (
                      <div className="absolute top-3 right-3">
                        <img 
                          src={logoImage} 
                          alt="Medicine & Money Logo"
                          className="w-16 h-16 object-contain"
                          style={{ mixBlendMode: "multiply" }}
                        />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <p className="text-white font-bold text-xl uppercase tracking-wide">
                        {previewPost.title.split(" - ")[0]}
                      </p>
                    </div>
                  </div>
                )}
                {previewPost.hashtags && previewPost.hashtags.length > 0 && (
                  <div className="p-3 text-sm text-blue-500">
                    {previewPost.hashtags.join(" ")}
                  </div>
                )}
                <div className="flex items-center gap-4 p-3 border-t text-muted-foreground">
                  <span className="text-xs">Like</span>
                  <span className="text-xs">Comment</span>
                  <span className="text-xs">Share</span>
                </div>
              </div>
              {previewPost.hooks && previewPost.hooks.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Suggested Hooks:</p>
                  <div className="space-y-1">
                    {previewPost.hooks.map((hook, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground italic">"{hook}"</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="grid w-full grid-cols-3" data-testid="social-tabs">
          <TabsTrigger value="discover" data-testid="tab-discover">
            <TrendingUp className="w-4 h-4 mr-2" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="generate" data-testid="tab-generate">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="manage" data-testid="tab-manage">
            <Target className="w-4 h-4 mr-2" />
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Viral Topics</CardTitle>
                  <CardDescription>Medicine & Money trending topics</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => refetchTopics()}
                  disabled={topicsLoading}
                  data-testid="button-refresh-topics"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${topicsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topicsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {topics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border bg-card hover-elevate transition-all"
                        data-testid={`topic-${idx}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{topic.keyword}</span>
                              {getTrendIcon(topic.trendDirection)}
                              <Badge 
                                variant={topic.popularity === "high" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {topic.popularity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {topic.contentSuggestion.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold">{topic.averageInterest}</div>
                              <div className="text-xs text-muted-foreground">Interest Score</div>
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleGenerateFromTopic(topic)}
                              disabled={generateContentMutation.isPending}
                              data-testid={`button-generate-topic-${idx}`}
                            >
                              {generateContentMutation.isPending && selectedTopic?.keyword === topic.keyword ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Generate Content</CardTitle>
              <CardDescription>Create viral content for all platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter custom topic..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateCustom()}
                  data-testid="input-custom-topic"
                />
                <Button 
                  onClick={handleGenerateCustom}
                  disabled={!customTopic.trim() || generateContentMutation.isPending}
                  data-testid="button-generate-content"
                >
                  {generateContentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {selectedTopic && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium">Generating for: {selectedTopic.keyword}</p>
                </div>
              )}

              {generatedContent.length > 0 && (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {generatedContent.map((content, idx) => (
                      <Card key={idx} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getPlatformIcon(content.platform)}
                              <span className="font-medium capitalize">{content.platform}</span>
                            </div>
                            <Badge variant="outline">
                              Score: {content.viralityScore}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="font-semibold text-lg">{content.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{content.description}</p>
                          </div>

                          {content.hooks && content.hooks.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Hooks:</p>
                              <div className="space-y-1">
                                {content.hooks.slice(0, 3).map((hook, hIdx) => (
                                  <div 
                                    key={hIdx}
                                    className="text-sm p-2 bg-muted rounded cursor-pointer hover-elevate"
                                    onClick={() => copyToClipboard(hook)}
                                  >
                                    "{hook}"
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {content.hashtags && content.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {content.hashtags.slice(0, 6).map((tag, tIdx) => (
                                <Badge key={tIdx} variant="secondary" className="text-xs">
                                  {tag.startsWith("#") ? tag : `#${tag}`}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(content.title + "\n\n" + content.description)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Content Queue</CardTitle>
                  <CardDescription>Review and approve generated content</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => refetchPosts()}
                  disabled={postsLoading}
                  data-testid="button-refresh-posts"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${postsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No content in queue</p>
                  <p className="text-sm">Generate content from the Generate tab</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <Card key={post.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div 
                              className={`flex-shrink-0 w-32 rounded-md transition-all ${dragOverPostId === post.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                              onDragOver={(e) => handleDragOver(e, post.id)}
                              onDragLeave={(e) => handleDragLeave(e, post.id)}
                              onDrop={(e) => handleDrop(e, post.id)}
                              data-testid={`dropzone-${post.id}`}
                            >
                              {post.thumbnailUrl ? (
                                <div className="relative group aspect-square w-32 rounded-md transition-all overflow-hidden border bg-muted">
                                  {post.backgroundUrl && (
                                    <img 
                                      src={post.backgroundUrl} 
                                      alt="Background"
                                      className="absolute inset-0 w-full h-full object-cover"
                                      style={{ opacity: (post.backgroundOpacity ?? 100) / 100 }}
                                      data-testid={`background-${post.id}`}
                                    />
                                  )}
                                  <img 
                                    src={post.thumbnailUrl} 
                                    alt={post.title}
                                    className="absolute inset-0 w-full h-full object-contain"
                                    data-testid={`thumbnail-${post.id}`}
                                  />
                                  {post.showLogo && (
                                    <div className="absolute top-1 right-1">
                                      <img 
                                        src={logoImage} 
                                        alt="Logo"
                                        className="w-8 h-8 object-contain"
                                        style={{ mixBlendMode: "multiply" }}
                                      />
                                    </div>
                                  )}
                                  {processingPostId === post.id && (
                                    <div className="absolute inset-0 bg-black/70 rounded-md flex items-center justify-center">
                                      <div className="text-white text-xs text-center">
                                        <Loader2 className="w-5 h-5 mx-auto mb-1 animate-spin" />
                                        Processing...
                                      </div>
                                    </div>
                                  )}
                                  <div className={`absolute inset-0 bg-black/50 rounded-md flex items-center justify-center transition-all ${dragOverPostId === post.id ? "visible" : processingPostId === post.id ? "invisible" : "invisible group-hover:visible"}`}>
                                    {dragOverPostId === post.id ? (
                                      <div className="text-white text-xs text-center">
                                        <Upload className="w-5 h-5 mx-auto mb-1" />
                                        Drop image
                                      </div>
                                    ) : (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handlePhotoUpload(post.id)}
                                        data-testid={`button-change-photo-${post.id}`}
                                      >
                                        <Upload className="w-5 h-5 text-white" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className={`aspect-square w-32 flex items-center justify-center border-2 border-dashed rounded-md transition-all cursor-pointer ${dragOverPostId === post.id ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-muted-foreground/50"}`}
                                  onClick={() => handlePhotoUpload(post.id)}
                                  data-testid={`button-add-photo-${post.id}`}
                                >
                                  {dragOverPostId === post.id ? (
                                    <div className="text-center text-sm text-primary">
                                      <Upload className="w-5 h-5 mx-auto mb-1" />
                                      Drop image
                                    </div>
                                  ) : (
                                    <div className="text-center text-sm text-muted-foreground">
                                      <ImagePlus className="w-5 h-5 mx-auto mb-1" />
                                      Drop or click
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {getPlatformIcon(post.platform)}
                                <span className="font-medium capitalize">{post.platform}</span>
                                <Badge className={getStatusColor(post.status)}>
                                  {post.status || "draft"}
                                </Badge>
                                {post.viralityScore && (
                                  <Badge variant="outline" className="text-xs">
                                    Score: {post.viralityScore}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-semibold truncate">{post.title}</p>
                              {post.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {post.description}
                                </p>
                              )}
                              {post.hashtags && post.hashtags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {post.hashtags.slice(0, 4).map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1 mt-2">
                            <span className="text-xs text-muted-foreground mr-1">Format:</span>
                            {PLATFORMS.map((p) => (
                              <Button
                                key={p}
                                size="sm"
                                variant={post.platform.toLowerCase() === p ? "default" : "outline"}
                                className="h-7 px-2"
                                onClick={() => updatePlatformMutation.mutate({ postId: post.id, platform: p })}
                                disabled={updatePlatformMutation.isPending || post.platform.toLowerCase() === p}
                                data-testid={`button-platform-${p}-${post.id}`}
                              >
                                {getPlatformIcon(p)}
                                <span className="ml-1 capitalize text-xs">{p}</span>
                              </Button>
                            ))}
                          </div>

                          <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPreviewPost({ ...post })}
                              data-testid={`button-preview-${post.id}`}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              variant={post.showLogo ? "default" : "outline"}
                              onClick={() => toggleLogoMutation.mutate({ postId: post.id, showLogo: !post.showLogo })}
                              disabled={toggleLogoMutation.isPending}
                              data-testid={`button-logo-${post.id}`}
                            >
                              <img 
                                src={logoImage} 
                                alt="Logo" 
                                className="w-4 h-4 mr-1 object-contain"
                                style={{ mixBlendMode: post.showLogo ? undefined : "multiply" }}
                              />
                              {post.showLogo ? "Logo On" : "Add Logo"}
                            </Button>
                            {post.thumbnailUrl && (
                              <Button
                                size="sm"
                                variant={post.backgroundUrl ? "default" : "outline"}
                                onClick={() => regenerateBackgroundMutation.mutate(post.id)}
                                disabled={regenerateBackgroundMutation.isPending}
                                data-testid={`button-background-${post.id}`}
                              >
                                {regenerateBackgroundMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 mr-1" />
                                )}
                                {post.backgroundUrl ? "New BG" : "Generate BG"}
                              </Button>
                            )}
                            {!post.thumbnailUrl && (
                              <Button
                                size="sm"
                                variant={post.backgroundUrl ? "default" : "outline"}
                                onClick={() => regenerateBackgroundMutation.mutate(post.id)}
                                disabled={regenerateBackgroundMutation.isPending}
                                data-testid={`button-background-only-${post.id}`}
                              >
                                {regenerateBackgroundMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 mr-1" />
                                )}
                                {post.backgroundUrl ? "New BG" : "Generate BG"}
                              </Button>
                            )}
                            {post.backgroundUrl && (
                              <div className="flex items-center gap-2 min-w-[140px]">
                                <Image className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <Slider
                                  value={[post.backgroundOpacity ?? 100]}
                                  onValueChange={(value) => updateOpacityMutation.mutate({ postId: post.id, backgroundOpacity: value[0] })}
                                  min={10}
                                  max={100}
                                  step={5}
                                  className="flex-1"
                                  data-testid={`slider-opacity-${post.id}`}
                                />
                                <span className="text-xs text-muted-foreground w-8">{post.backgroundOpacity ?? 100}%</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateBackgroundMutation.mutate({ postId: post.id, backgroundUrl: "" })}
                                  disabled={updateBackgroundMutation.isPending}
                                  data-testid={`button-remove-bg-${post.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            {post.status === "draft" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => approveMutation.mutate(post.id)}
                                  disabled={approveMutation.isPending}
                                  data-testid={`button-approve-${post.id}`}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectMutation.mutate(post.id)}
                                  disabled={rejectMutation.isPending}
                                  data-testid={`button-reject-${post.id}`}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(post.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${post.id}`}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
