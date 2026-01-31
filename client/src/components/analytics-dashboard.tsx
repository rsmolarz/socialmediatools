import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  BarChart3, 
  Eye, 
  MousePointerClick, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Plus,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ThumbnailStat {
  thumbnailId: string;
  title: string;
  impressions: number;
  clicks: number;
  engagementRate: number;
}

interface AnalyticsSummary {
  totalImpressions: number;
  totalClicks: number;
  overallEngagementRate: number;
  thumbnails: ThumbnailStat[];
}

interface DailyStats {
  date: string;
  impressions: number;
  clicks: number;
  platform: string;
}

interface ThumbnailAnalytics {
  thumbnailId: string;
  totalImpressions: number;
  totalClicks: number;
  engagementRate: number;
  dailyStats: DailyStats[];
}

export function AnalyticsDashboard() {
  const { toast } = useToast();
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newData, setNewData] = useState({
    thumbnailId: "",
    impressions: "",
    clicks: "",
    platform: "youtube",
    date: new Date().toISOString().split("T")[0],
  });

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: thumbnails } = useQuery<any[]>({
    queryKey: ["/api/thumbnails"],
  });

  const { data: thumbnailAnalytics, isLoading: detailLoading } = useQuery<ThumbnailAnalytics>({
    queryKey: ["/api/analytics/thumbnail", selectedThumbnail],
    enabled: !!selectedThumbnail,
  });

  const addAnalyticsMutation = useMutation({
    mutationFn: async (data: typeof newData) => {
      return apiRequest("/api/analytics/bulk", {
        method: "POST",
        body: JSON.stringify({
          thumbnailId: data.thumbnailId,
          impressions: parseInt(data.impressions),
          clicks: parseInt(data.clicks),
          platform: data.platform,
          date: data.date,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: "Analytics data added successfully" });
      setShowAddDialog(false);
      setNewData({
        thumbnailId: "",
        impressions: "",
        clicks: "",
        platform: "youtube",
        date: new Date().toISOString().split("T")[0],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/summary"] });
      if (selectedThumbnail) {
        queryClient.invalidateQueries({ queryKey: ["/api/analytics/thumbnail", selectedThumbnail] });
      }
    },
    onError: () => {
      toast({ title: "Failed to add analytics data", variant: "destructive" });
    },
  });

  const recordEventMutation = useMutation({
    mutationFn: async (data: { thumbnailId: string; eventType: string }) => {
      return apiRequest("/api/analytics/event", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/summary"] });
    },
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 10) return "text-green-500";
    if (rate >= 5) return "text-yellow-500";
    return "text-red-500";
  };

  const getEngagementBadge = (rate: number) => {
    if (rate >= 10) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (rate >= 5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track thumbnail performance and engagement</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchSummary()}
            data-testid="button-refresh-analytics"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-analytics">
                <Plus className="w-4 h-4 mr-2" />
                Add Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Analytics Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Thumbnail</Label>
                  <Select 
                    value={newData.thumbnailId} 
                    onValueChange={(v) => setNewData({ ...newData, thumbnailId: v })}
                  >
                    <SelectTrigger data-testid="select-thumbnail">
                      <SelectValue placeholder="Select thumbnail" />
                    </SelectTrigger>
                    <SelectContent>
                      {thumbnails?.map((thumb) => (
                        <SelectItem key={thumb.id} value={thumb.id}>
                          {thumb.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Impressions</Label>
                    <Input
                      type="number"
                      value={newData.impressions}
                      onChange={(e) => setNewData({ ...newData, impressions: e.target.value })}
                      placeholder="0"
                      data-testid="input-impressions"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Clicks</Label>
                    <Input
                      type="number"
                      value={newData.clicks}
                      onChange={(e) => setNewData({ ...newData, clicks: e.target.value })}
                      placeholder="0"
                      data-testid="input-clicks"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select 
                      value={newData.platform} 
                      onValueChange={(v) => setNewData({ ...newData, platform: v })}
                    >
                      <SelectTrigger data-testid="select-platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newData.date}
                      onChange={(e) => setNewData({ ...newData, date: e.target.value })}
                      data-testid="input-date"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => addAnalyticsMutation.mutate(newData)}
                  disabled={!newData.thumbnailId || !newData.impressions || addAnalyticsMutation.isPending}
                  data-testid="button-submit-analytics"
                >
                  {addAnalyticsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Add Analytics Data
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Impressions
            </CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-impressions">
              {formatNumber(summary?.totalImpressions || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Views across all thumbnails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clicks
            </CardTitle>
            <MousePointerClick className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-clicks">
              {formatNumber(summary?.totalClicks || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clicks across all thumbnails
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Engagement Rate
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div 
              className={`text-3xl font-bold ${getEngagementColor(summary?.overallEngagementRate || 0)}`}
              data-testid="text-engagement-rate"
            >
              {summary?.overallEngagementRate?.toFixed(2) || "0.00"}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Click-through rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Thumbnail Performance
            </CardTitle>
            <CardDescription>
              Click on a thumbnail to view detailed analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.thumbnails && summary.thumbnails.length > 0 ? (
              <div className="space-y-3">
                {summary.thumbnails.map((thumb, index) => (
                  <div
                    key={thumb.thumbnailId}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors hover-elevate ${
                      selectedThumbnail === thumb.thumbnailId
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedThumbnail(thumb.thumbnailId)}
                    data-testid={`thumbnail-stat-${index}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[200px]">
                          {thumb.title}
                        </span>
                      </div>
                      <Badge className={getEngagementBadge(thumb.engagementRate)}>
                        {thumb.engagementRate.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Eye className="w-3 h-3 text-muted-foreground" />
                        <span>{formatNumber(thumb.impressions)} impressions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MousePointerClick className="w-3 h-3 text-muted-foreground" />
                        <span>{formatNumber(thumb.clicks)} clicks</span>
                      </div>
                    </div>
                    <Progress 
                      value={thumb.engagementRate} 
                      className="mt-2 h-1" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No analytics data yet</p>
                <p className="text-sm mt-1">Add analytics data to see performance metrics</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Detailed Analytics
            </CardTitle>
            <CardDescription>
              {selectedThumbnail 
                ? "Showing stats for selected thumbnail" 
                : "Select a thumbnail to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedThumbnail ? (
              detailLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : thumbnailAnalytics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {formatNumber(thumbnailAnalytics.totalImpressions)}
                      </div>
                      <div className="text-xs text-muted-foreground">Impressions</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {formatNumber(thumbnailAnalytics.totalClicks)}
                      </div>
                      <div className="text-xs text-muted-foreground">Clicks</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className={`text-2xl font-bold ${getEngagementColor(thumbnailAnalytics.engagementRate)}`}>
                        {thumbnailAnalytics.engagementRate.toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">CTR</div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Recent Daily Stats</h4>
                    {thumbnailAnalytics.dailyStats.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {thumbnailAnalytics.dailyStats.slice(0, 7).map((day, index) => {
                          const dayEngagement = day.impressions > 0 
                            ? ((day.clicks / day.impressions) * 100)
                            : 0;
                          return (
                            <div 
                              key={index} 
                              className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                            >
                              <span className="text-muted-foreground">
                                {new Date(day.date).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {day.impressions}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MousePointerClick className="w-3 h-3" />
                                  {day.clicks}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {dayEngagement.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No daily stats available
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => recordEventMutation.mutate({ 
                        thumbnailId: selectedThumbnail, 
                        eventType: "impression" 
                      })}
                      data-testid="button-record-impression"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      +1 Impression
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => recordEventMutation.mutate({ 
                        thumbnailId: selectedThumbnail, 
                        eventType: "click" 
                      })}
                      data-testid="button-record-click"
                    >
                      <MousePointerClick className="w-3 h-3 mr-1" />
                      +1 Click
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No data available for this thumbnail</p>
                </div>
              )
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a thumbnail from the list</p>
                <p className="text-sm mt-1">to view detailed analytics</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}