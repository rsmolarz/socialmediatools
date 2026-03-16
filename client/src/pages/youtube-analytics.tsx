import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  ThumbsUp,
  MessageSquare,
  Users,
  TrendingUp,
  Search,
  Target,
  Clock,
  Tag,
  Loader2,
  ExternalLink,
  Copy,
  Sparkles,
  Calendar,
  Trophy,
  Zap,
  Shield,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

interface VideoStats {
  videoId: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  engagementRate: number;
}

interface ChannelStats {
  channelId: string;
  title: string;
  description: string;
  customUrl: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
  country: string;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}:` : "";
  const m = match[2] ? match[2].padStart(2, "0") : "00";
  const s = match[3] ? match[3].padStart(2, "0") : "00";
  return `${h}${m}:${s}`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-500/10 border-green-500/30";
  if (score >= 60) return "bg-yellow-500/10 border-yellow-500/30";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
}

function DashboardTab() {
  const { data: channel, isLoading: channelLoading } = useQuery<ChannelStats>({
    queryKey: ["/api/youtube/channel"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<{ videos: VideoStats[]; totalVideos: number }>({
    queryKey: ["/api/youtube/analytics"],
  });

  const isLoading = channelLoading || analyticsLoading;
  const videos = analytics?.videos || [];

  const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likeCount, 0);
  const totalComments = videos.reduce((s, v) => s + v.commentCount, 0);
  const avgEngagement = videos.length > 0
    ? Math.round(videos.reduce((s, v) => s + v.engagementRate, 0) / videos.length * 100) / 100
    : 0;
  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;

  const topVideos = [...videos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const topEngagement = [...videos].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading channel data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {channel && (
        <Card data-testid="channel-overview-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {channel.thumbnailUrl && (
                <img src={channel.thumbnailUrl} alt={channel.title} className="w-16 h-16 rounded-full" />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold" data-testid="text-channel-title">{channel.title}</h2>
                <p className="text-sm text-muted-foreground">{channel.customUrl}</p>
              </div>
              <a href={`https://youtube.com/${channel.customUrl}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" data-testid="link-youtube-channel">
                  <ExternalLink className="h-4 w-4 mr-1" /> View Channel
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="stat-subscribers">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">{channel ? formatNumber(channel.subscriberCount) : "-"}</div>
            <div className="text-xs text-muted-foreground">Subscribers</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-views">
          <CardContent className="p-4 text-center">
            <Eye className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{channel ? formatNumber(channel.viewCount) : "-"}</div>
            <div className="text-xs text-muted-foreground">Total Views</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-videos">
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold">{channel ? formatNumber(channel.videoCount) : "-"}</div>
            <div className="text-xs text-muted-foreground">Videos</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-avg-engagement">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <div className="text-2xl font-bold">{avgEngagement}%</div>
            <div className="text-xs text-muted-foreground">Avg Engagement</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-blue-500">{formatNumber(totalViews)}</div>
            <div className="text-xs text-muted-foreground">Video Views</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-pink-500">{formatNumber(totalLikes)}</div>
            <div className="text-xs text-muted-foreground">Total Likes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-green-500">{formatNumber(totalComments)}</div>
            <div className="text-xs text-muted-foreground">Total Comments</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card data-testid="top-videos-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> Top Videos by Views
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topVideos.map((v, i) => (
              <div key={v.videoId} className="flex items-center gap-3" data-testid={`top-video-${i}`}>
                <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                <img src={v.thumbnailUrl} alt="" className="w-20 h-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(v.viewCount)} views</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="top-engagement-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" /> Top by Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topEngagement.map((v, i) => (
              <div key={v.videoId} className="flex items-center gap-3" data-testid={`top-engagement-${i}`}>
                <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                <img src={v.thumbnailUrl} alt="" className="w-20 h-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{v.engagementRate}% engagement</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VideoAnalyticsTab() {
  const { data: analytics, isLoading } = useQuery<{ videos: VideoStats[]; totalVideos: number }>({
    queryKey: ["/api/youtube/analytics"],
  });

  const [sortBy, setSortBy] = useState<"views" | "likes" | "comments" | "engagement" | "date">("views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const videos = [...(analytics?.videos || [])].sort((a, b) => {
    const dir = sortDir === "desc" ? -1 : 1;
    switch (sortBy) {
      case "views": return (a.viewCount - b.viewCount) * dir;
      case "likes": return (a.likeCount - b.likeCount) * dir;
      case "comments": return (a.commentCount - b.commentCount) * dir;
      case "engagement": return (a.engagementRate - b.engagementRate) * dir;
      case "date": return (new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()) * dir;
      default: return 0;
    }
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const SortHeader = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <button onClick={() => toggleSort(col)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid={`sort-${col}`}>
      {label} {sortBy === col && (sortDir === "desc" ? "↓" : "↑")}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{videos.length} videos</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 w-[350px]">Video</th>
                <th className="p-3 text-right"><SortHeader col="views" label="Views" /></th>
                <th className="p-3 text-right"><SortHeader col="likes" label="Likes" /></th>
                <th className="p-3 text-right"><SortHeader col="comments" label="Comments" /></th>
                <th className="p-3 text-right"><SortHeader col="engagement" label="Engagement" /></th>
                <th className="p-3 text-right"><SortHeader col="date" label="Published" /></th>
                <th className="p-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.videoId} className="border-t hover:bg-muted/30 transition-colors" data-testid={`video-row-${v.videoId}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={v.thumbnailUrl} alt="" className="w-24 h-14 rounded object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <a href={`https://youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary truncate block max-w-[250px]" data-testid={`link-video-${v.videoId}`}>
                          {v.title}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium">{formatNumber(v.viewCount)}</td>
                  <td className="p-3 text-right">{formatNumber(v.likeCount)}</td>
                  <td className="p-3 text-right">{formatNumber(v.commentCount)}</td>
                  <td className="p-3 text-right">
                    <span className={v.engagementRate >= 5 ? "text-green-500 font-medium" : v.engagementRate >= 2 ? "text-yellow-500" : "text-muted-foreground"}>
                      {v.engagementRate}%
                    </span>
                  </td>
                  <td className="p-3 text-right text-muted-foreground text-xs">{new Date(v.publishedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right text-muted-foreground text-xs">{formatDuration(v.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SeoScorerTab() {
  const { data: analytics, isLoading: listLoading } = useQuery<{ videos: VideoStats[]; totalVideos: number }>({
    queryKey: ["/api/youtube/analytics"],
  });
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [seoResult, setSeoResult] = useState<any>(null);
  const [scoring, setScoring] = useState(false);
  const { toast } = useToast();

  const scoreVideo = async (videoId: string) => {
    setSelectedVideo(videoId);
    setScoring(true);
    setSeoResult(null);
    try {
      const res = await apiRequest("GET", `/api/youtube/seo-score/${videoId}`);
      const data = await res.json();
      setSeoResult(data);
    } catch (error: any) {
      toast({ title: "SEO scoring failed", description: error.message, variant: "destructive" });
    } finally {
      setScoring(false);
    }
  };

  if (listLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const videos = analytics?.videos || [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Select a video to get an AI-powered SEO score with specific improvement suggestions.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {videos.map((v) => (
            <button
              key={v.videoId}
              onClick={() => scoreVideo(v.videoId)}
              className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${selectedVideo === v.videoId ? "border-primary bg-primary/5" : ""}`}
              data-testid={`seo-video-${v.videoId}`}
            >
              <div className="flex items-center gap-3">
                <img src={v.thumbnailUrl} alt="" className="w-16 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(v.viewCount)} views · {v.tags?.length || 0} tags</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div>
          {scoring && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Analyzing SEO...</p>
            </div>
          )}

          {seoResult && !scoring && (
            <div className="space-y-4" data-testid="seo-results">
              <div className={`text-center p-6 rounded-lg border ${scoreBg(seoResult.seo.overallScore)}`}>
                <div className={`text-4xl font-bold ${scoreColor(seoResult.seo.overallScore)}`} data-testid="text-seo-overall-score">
                  {seoResult.seo.overallScore}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Overall SEO Score</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Title", score: seoResult.seo.titleScore },
                  { label: "Description", score: seoResult.seo.descriptionScore },
                  { label: "Tags", score: seoResult.seo.tagsScore },
                ].map((item) => (
                  <Card key={item.label}>
                    <CardContent className="p-3 text-center">
                      <div className={`text-xl font-bold ${scoreColor(item.score)}`}>{item.score}</div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {seoResult.seo.titleSuggestion && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Suggested Title</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-primary" data-testid="text-suggested-title">{seoResult.seo.titleSuggestion}</p>
                    <p className="text-xs text-muted-foreground mt-1">{seoResult.seo.titleAnalysis}</p>
                  </CardContent>
                </Card>
              )}

              {seoResult.seo.suggestedTags?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Suggested Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {seoResult.seo.suggestedTags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {seoResult.seo.topPriorities?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top Priorities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-1.5">
                      {seoResult.seo.topPriorities.map((p: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-primary font-bold text-xs mt-0.5">{i + 1}.</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}

              {seoResult.seo.engagementAnalysis && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Engagement Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{seoResult.seo.engagementAnalysis}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!scoring && !seoResult && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Select a video to analyze its SEO</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BestTimeTab() {
  const { data, isLoading } = useQuery<{ analysis: any; videosAnalyzed: number }>({
    queryKey: ["/api/youtube/best-time"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Analyzing your posting patterns...</span>
      </div>
    );
  }

  const analysis = data?.analysis;
  if (!analysis) {
    return <p className="text-center text-muted-foreground py-10">Not enough data to analyze posting times.</p>;
  }

  return (
    <div className="space-y-6" data-testid="best-time-results">
      <p className="text-sm text-muted-foreground">Based on analysis of {data?.videosAnalyzed} videos</p>

      {analysis.recommendation && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Top Recommendation</p>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-recommendation">{analysis.recommendation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {analysis.bestDays?.length > 0 && (
          <Card data-testid="best-days-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Best Days to Post
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.bestDays.map((d: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{d.day}</span>
                    <p className="text-xs text-muted-foreground">{d.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={d.score * 10} className="w-20 h-2" />
                    <span className="text-sm font-medium w-6">{d.score}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {analysis.bestHours?.length > 0 && (
          <Card data-testid="best-hours-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Best Hours to Post
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.bestHours.map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{h.hour}</span>
                    <p className="text-xs text-muted-foreground">{h.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={h.score * 10} className="w-20 h-2" />
                    <span className="text-sm font-medium w-6">{h.score}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {analysis.bestCombinations?.length > 0 && (
        <Card data-testid="best-combos-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Best Day + Time Combos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {analysis.bestCombinations.map((c: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/30 text-center">
                  <p className="font-medium text-sm">{c.day}</p>
                  <p className="text-primary font-bold">{c.time}</p>
                  <Badge variant={c.confidence === "high" ? "default" : "secondary"} className="mt-1 text-xs">{c.confidence}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.publishingSchedule && (
        <Card data-testid="schedule-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suggested Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Object.entries(analysis.publishingSchedule).map(([day, time]) => (
                <div key={day} className={`p-2 rounded text-center text-xs ${time ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
                  <p className="font-medium capitalize">{day.slice(0, 3)}</p>
                  <p className={time ? "text-primary font-medium mt-1" : "text-muted-foreground mt-1"}>{(time as string) || "-"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analysis.insights?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.insights.map((insight: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TagResearchTab() {
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("physician finance, investing, and entrepreneurship");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const research = async () => {
    if (!topic.trim()) {
      toast({ title: "Enter a topic", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest("POST", "/api/youtube/tag-research", { topic: topic.trim(), niche });
      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      toast({ title: "Research failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyTags = (tags: string[]) => {
    navigator.clipboard.writeText(tags.join(", "));
    toast({ title: "Tags copied!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          placeholder="Enter a topic (e.g., 'physician side hustles')"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && research()}
          className="flex-1"
          data-testid="input-tag-topic"
        />
        <Button onClick={research} disabled={loading} data-testid="button-research-tags">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
          Research
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Researching keywords...</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6" data-testid="tag-research-results">
          {result.suggestedTags?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Suggested Tags ({result.suggestedTags.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyTags(result.suggestedTags)} data-testid="button-copy-tags">
                    <Copy className="h-3 w-3 mr-1" /> Copy All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedTags.map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => { navigator.clipboard.writeText(tag); toast({ title: `Copied: ${tag}` }); }}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {result.primaryKeywords?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Primary Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.primaryKeywords.map((kw: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{kw.keyword}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={kw.searchVolume === "high" ? "default" : "secondary"} className="text-xs">{kw.searchVolume}</Badge>
                          <Badge variant={kw.competition === "low" ? "default" : "outline"} className="text-xs">{kw.competition}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.longTailKeywords?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Long-Tail Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.longTailKeywords.map((kw: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span>{kw.keyword}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{kw.searchVolume}</Badge>
                          <Badge variant="outline" className="text-xs">{kw.competition}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {result.titleSuggestions?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Title Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.titleSuggestions.map((title: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-sm font-medium">{title}</span>
                      <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(title); toast({ title: "Title copied!" }); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.hashTags?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Hashtags</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyTags(result.hashTags)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.hashTags.map((tag: string, i: number) => (
                    <Badge key={i} className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(result.contentAngle || result.targetAudience) && (
            <Card>
              <CardContent className="p-4 space-y-3">
                {result.contentAngle && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Content Angle</p>
                    <p className="text-sm mt-1">{result.contentAngle}</p>
                  </div>
                )}
                {result.targetAudience && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Target Audience</p>
                    <p className="text-sm mt-1">{result.targetAudience}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function CompetitorTab() {
  const [handle, setHandle] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const analyze = async () => {
    if (!handle.trim()) {
      toast({ title: "Enter a channel handle", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const cleanHandle = handle.trim().replace(/^@/, "");
      const res = await apiRequest("GET", `/api/youtube/competitor/${cleanHandle}`);
      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      toast({ title: "Competitor lookup failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const ComparisonRow = ({ label, you, them }: { label: string; you: number; them: number }) => {
    const diff = you - them;
    const pct = them > 0 ? Math.round((diff / them) * 100) : 0;
    return (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-6 text-sm">
          <span className="font-medium w-20 text-right">{formatNumber(you)}</span>
          <span className="w-16 text-center">
            {diff > 0 ? (
              <span className="text-green-500 flex items-center justify-center gap-0.5"><ArrowUpRight className="h-3 w-3" />{Math.abs(pct)}%</span>
            ) : diff < 0 ? (
              <span className="text-red-500 flex items-center justify-center gap-0.5"><ArrowDownRight className="h-3 w-3" />{Math.abs(pct)}%</span>
            ) : (
              <span className="text-muted-foreground flex items-center justify-center"><Minus className="h-3 w-3" /></span>
            )}
          </span>
          <span className="font-medium w-20 text-right">{formatNumber(them)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          placeholder="Enter YouTube channel handle (e.g., @mkbhd)"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          className="flex-1"
          data-testid="input-competitor-handle"
        />
        <Button onClick={analyze} disabled={loading} data-testid="button-analyze-competitor">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Target className="h-4 w-4 mr-1" />}
          Analyze
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Fetching competitor data...</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6" data-testid="competitor-results">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {result.competitor.thumbnailUrl && (
                  <img src={result.competitor.thumbnailUrl} alt="" className="w-14 h-14 rounded-full" />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg" data-testid="text-competitor-name">{result.competitor.title}</h3>
                  <p className="text-sm text-muted-foreground">{result.competitor.customUrl}</p>
                </div>
                <a href={`https://youtube.com/${result.competitor.customUrl}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /></Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="comparison-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Head-to-Head Comparison</CardTitle>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>You</span>
                <span>Diff</span>
                <span>{result.competitor.title}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ComparisonRow label="Subscribers" you={result.comparison.you.subscribers} them={result.comparison.competitor.subscribers} />
              <ComparisonRow label="Total Views" you={result.comparison.you.totalViews} them={result.comparison.competitor.totalViews} />
              <ComparisonRow label="Videos" you={result.comparison.you.videoCount} them={result.comparison.competitor.videoCount} />
              <ComparisonRow label="Avg Views/Video" you={result.comparison.you.avgViews} them={result.comparison.competitor.avgViews} />
              <ComparisonRow label="Avg Engagement %" you={Math.round(result.comparison.you.avgEngagement * 100)} them={Math.round(result.comparison.competitor.avgEngagement * 100)} />
            </CardContent>
          </Card>

          {result.competitorVideos?.length > 0 && (
            <Card data-testid="competitor-videos-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Their Recent Videos ({result.competitorVideos.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.competitorVideos.slice(0, 10).map((v: VideoStats) => (
                  <div key={v.videoId} className="flex items-center gap-3">
                    <img src={v.thumbnailUrl} alt="" className="w-24 h-14 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a href={`https://youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary truncate block">
                        {v.title}
                      </a>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatNumber(v.viewCount)}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{formatNumber(v.likeCount)}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{formatNumber(v.commentCount)}</span>
                        <span>{v.engagementRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loading && !result && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Shield className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Enter a YouTube channel handle to compare stats</p>
        </div>
      )}
    </div>
  );
}

export default function YouTubeAnalytics() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-back-home">
                <ArrowLeft className="h-4 w-4 mr-1" /> Home
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-red-500" />
              YouTube Analytics
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6 flex-wrap h-auto gap-1" data-testid="analytics-tabs">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4 mr-1" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="videos" data-testid="tab-videos">
              <Eye className="h-4 w-4 mr-1" /> Video Analytics
            </TabsTrigger>
            <TabsTrigger value="seo" data-testid="tab-seo">
              <Search className="h-4 w-4 mr-1" /> SEO Scorer
            </TabsTrigger>
            <TabsTrigger value="besttime" data-testid="tab-best-time">
              <Clock className="h-4 w-4 mr-1" /> Best Time
            </TabsTrigger>
            <TabsTrigger value="tags" data-testid="tab-tags">
              <Tag className="h-4 w-4 mr-1" /> Tag Research
            </TabsTrigger>
            <TabsTrigger value="competitor" data-testid="tab-competitor">
              <Target className="h-4 w-4 mr-1" /> Competitor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="videos"><VideoAnalyticsTab /></TabsContent>
          <TabsContent value="seo"><SeoScorerTab /></TabsContent>
          <TabsContent value="besttime"><BestTimeTab /></TabsContent>
          <TabsContent value="tags"><TagResearchTab /></TabsContent>
          <TabsContent value="competitor"><CompetitorTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
