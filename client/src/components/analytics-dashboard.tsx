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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { 
  BarChart3, 
  Eye, 
  MousePointerClick, 
  TrendingUp, 
  RefreshCw,
  Plus,
  Calendar,
  Loader2,
  Image as ImageIcon,
  FlaskConical,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Trophy,
  Download,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface ABTest {
  id: number;
  name: string;
  description: string;
  status: string;
  variants: any[];
  winner: string | null;
  createdAt: string;
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function AnalyticsDashboard() {
  const { toast } = useToast();
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
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

  const { data: abTests } = useQuery<ABTest[]>({
    queryKey: ["/api/ab-tests"],
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

  const getLineChartData = () => {
    if (!thumbnailAnalytics?.dailyStats) return [];
    return thumbnailAnalytics.dailyStats
      .slice(0, 14)
      .reverse()
      .map(day => ({
        date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        impressions: day.impressions,
        clicks: day.clicks,
      }));
  };

  const getPieChartData = () => {
    if (!summary) return [];
    return [
      { name: "Impressions (No Click)", value: summary.totalImpressions - summary.totalClicks, color: "#3b82f6" },
      { name: "Clicks", value: summary.totalClicks, color: "#10b981" },
    ];
  };

  const getThumbnailComparisonData = () => {
    if (!summary?.thumbnails) return [];
    return summary.thumbnails.slice(0, 6).map((thumb, index) => ({
      name: thumb.title.length > 15 ? thumb.title.substring(0, 15) + "..." : thumb.title,
      impressions: thumb.impressions,
      clicks: thumb.clicks,
      ctr: thumb.engagementRate,
    }));
  };

  const getABTestResults = () => {
    if (!abTests) return [];
    return abTests.filter(test => test.status === "completed" || test.status === "active");
  };

  const exportToCSV = () => {
    if (!summary?.thumbnails) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Thumbnail", "Impressions", "Clicks", "CTR (%)"];
    const rows = summary.thumbnails.map(thumb => [
      thumb.title,
      thumb.impressions.toString(),
      thumb.clicks.toString(),
      thumb.engagementRate.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const summarySection = [
      "",
      "Summary",
      `Total Impressions,${summary.totalImpressions}`,
      `Total Clicks,${summary.totalClicks}`,
      `Overall CTR,${summary.overallEngagementRate.toFixed(2)}%`,
    ].join("\n");

    const fullContent = csvContent + "\n" + summarySection;
    const blob = new Blob([fullContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast({ title: "CSV report downloaded" });
  };

  const exportToPDF = () => {
    if (!summary?.thumbnails) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #4b5563; margin-top: 30px; }
          .summary { display: flex; gap: 30px; margin: 20px 0; }
          .stat-card { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; flex: 1; }
          .stat-value { font-size: 28px; font-weight: bold; color: #1a1a1a; }
          .stat-label { color: #6b7280; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          th { background: #3b82f6; color: white; }
          tr:nth-child(even) { background: #f9fafb; }
          .ctr-high { color: #10b981; font-weight: bold; }
          .ctr-medium { color: #f59e0b; font-weight: bold; }
          .ctr-low { color: #ef4444; font-weight: bold; }
          .footer { margin-top: 40px; color: #9ca3af; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Analytics Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        
        <h2>Summary</h2>
        <div class="summary">
          <div class="stat-card">
            <div class="stat-value">${formatNumber(summary.totalImpressions)}</div>
            <div class="stat-label">Total Impressions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatNumber(summary.totalClicks)}</div>
            <div class="stat-label">Total Clicks</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${summary.overallEngagementRate.toFixed(2)}%</div>
            <div class="stat-label">Overall CTR</div>
          </div>
        </div>

        <h2>Thumbnail Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Thumbnail</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>CTR</th>
            </tr>
          </thead>
          <tbody>
            ${summary.thumbnails.map(thumb => `
              <tr>
                <td>${thumb.title}</td>
                <td>${thumb.impressions.toLocaleString()}</td>
                <td>${thumb.clicks.toLocaleString()}</td>
                <td class="${thumb.engagementRate >= 10 ? 'ctr-high' : thumb.engagementRate >= 5 ? 'ctr-medium' : 'ctr-low'}">${thumb.engagementRate.toFixed(2)}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>Medicine & Money Show - Thumbnail Analytics</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
      toast({ title: "PDF report opened for printing" });
    } else {
      toast({ title: "Please allow popups to export PDF", variant: "destructive" });
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-export-analytics">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV} data-testid="button-export-csv">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} data-testid="button-export-pdf">
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="charts" data-testid="tab-charts">
            <LineChartIcon className="w-4 h-4 mr-2" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="engagement" data-testid="tab-engagement">
            <PieChartIcon className="w-4 h-4 mr-2" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="abtest" data-testid="tab-abtest-compare">
            <FlaskConical className="w-4 h-4 mr-2" />
            A/B Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
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
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
        </TabsContent>

        <TabsContent value="charts" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5" />
                  Views Over Time
                </CardTitle>
                <CardDescription>
                  {selectedThumbnail 
                    ? "Daily impressions and clicks for selected thumbnail"
                    : "Select a thumbnail to view trend data"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedThumbnail && thumbnailAnalytics?.dailyStats?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getLineChartData()}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                        className="fill-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                        className="fill-muted-foreground"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                        name="Impressions"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: "#10b981", strokeWidth: 2 }}
                        name="Clicks"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <LineChartIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Select a thumbnail with data</p>
                      <p className="text-sm mt-1">to view the trend chart</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Thumbnail Comparison
                </CardTitle>
                <CardDescription>
                  Compare performance across thumbnails
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary?.thumbnails && summary.thumbnails.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getThumbnailComparisonData()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 11 }} 
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="impressions" fill="#3b82f6" name="Impressions" />
                      <Bar dataKey="clicks" fill="#10b981" name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No thumbnail data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Engagement Breakdown
                </CardTitle>
                <CardDescription>
                  Distribution of impressions vs clicks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary && (summary.totalImpressions > 0 || summary.totalClicks > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getPieChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getPieChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No engagement data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  CTR Leaderboard
                </CardTitle>
                <CardDescription>
                  Top performing thumbnails by click-through rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summary?.thumbnails && summary.thumbnails.length > 0 ? (
                  <div className="space-y-3">
                    {summary.thumbnails
                      .sort((a, b) => b.engagementRate - a.engagementRate)
                      .slice(0, 5)
                      .map((thumb, index) => (
                        <div 
                          key={thumb.thumbnailId}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? "bg-yellow-500 text-yellow-900" :
                            index === 1 ? "bg-gray-300 text-gray-700" :
                            index === 2 ? "bg-amber-600 text-amber-100" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{thumb.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(thumb.impressions)} views • {formatNumber(thumb.clicks)} clicks
                            </p>
                          </div>
                          <Badge className={getEngagementBadge(thumb.engagementRate)}>
                            {thumb.engagementRate.toFixed(2)}%
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No performance data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="abtest" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5" />
                A/B Test Results
              </CardTitle>
              <CardDescription>
                Compare thumbnail variant performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getABTestResults().length > 0 ? (
                <div className="space-y-6">
                  {getABTestResults().map((test) => (
                    <div key={test.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{test.name}</h4>
                          <p className="text-sm text-muted-foreground">{test.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={test.status === "completed" ? "default" : "secondary"}>
                            {test.status}
                          </Badge>
                          {test.winner && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <Trophy className="w-3 h-3 mr-1" />
                              Winner: {test.winner}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {test.variants && test.variants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {test.variants.map((variant: any, index: number) => (
                            <div 
                              key={index}
                              className={`p-3 rounded-lg border ${
                                test.winner === variant.name 
                                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                                  : "border-border"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{variant.name || `Variant ${index + 1}`}</span>
                                {test.winner === variant.name && (
                                  <Trophy className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Layout: {variant.config?.layout || "N/A"}</p>
                                <p>Accent: {variant.config?.accentColor || "N/A"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No variants available</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No A/B tests completed yet</p>
                  <p className="text-sm mt-1">Create tests in the A/B Testing tab to see results here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}