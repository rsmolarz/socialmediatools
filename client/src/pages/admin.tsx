import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
    Link,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
    Shield,
    Zap,
    AlertTriangle,
    CheckCircle,
    Clock,
    RefreshCw,
    ArrowLeft,
    Lightbulb,
    Bug,
    Wrench,
    TrendingUp,
    Activity,
    FileCode,
    Loader2,
    AlertCircle,
    BarChart3,
} from "lucide-react";

// Interfaces
interface HealthStatus {
    status: "healthy" | "degraded" | "critical";
    uptime: number;
    memory: {
          used: number;
          total: number;
          percentage: number;
    };
    errorCount: number;
    avgResponseTime: number;
    circuitBreakerStatus: {
          youtube: "closed" | "open" | "half-open";
          database: "closed" | "open" | "half-open";
          externalApi: "closed" | "open" | "half-open";
    };
    youtubeQuota: {
          used: number;
          limit: number;
          percentage: number;
    };
    activeFeatureFlags: number;
    lastUpdate: string;
}

interface FeatureFlag {
    id: string;
    name: string;
    enabled: boolean;
    rolloutPercentage?: number;
    environment?: string;
}

interface MetricData {
    timestamp: string;
    value: number;
    p50: number;
    p95: number;
    p99: number;
}

// Helper functions
const getStatusColor = (status: string): string => {
    switch (status) {
      case "healthy":
      case "closed":
              return "bg-green-500";
      case "degraded":
      case "half-open":
              return "bg-yellow-500";
      case "critical":
      case "open":
              return "bg-red-500";
      default:
              return "bg-gray-500";
    }
};

const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const formatPercentage = (percent: number): string => {
    return Math.round(percent * 100) / 100 + "%";
};

// Health Status Card Component
function HealthStatusCard({ health }: { health: HealthStatus }) {
    return (
          <Card>
                <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                                  <Activity className="w-5 h-5" />
                                  System Health
                        </CardTitle>CardTitle>
                </CardHeader>CardHeader>
                <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Status</span>span>
                                  <div className="flex items-center gap-2">
                                              <div
                                                              className={`w-3 h-3 rounded-full ${getStatusColor(
                                                                                health.status
                                                                              )}`}
                                                            />
                                              <span className="text-sm font-medium">
                                                {getStatusLabel(health.status)}
                                              </span>span>
                                  </div>div>
                        </div>div>
                
                        <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                              <span>Memory Usage</span>span>
                                              <span>{formatPercentage(health.memory.percentage)}</span>span>
                                  </div>div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                              <div
                                                              className={`h-2 rounded-full transition-all ${
                                                                                health.memory.percentage > 80
                                                                                  ? "bg-red-500"
                                                                                  : health.memory.percentage > 60
                                                                                  ? "bg-yellow-500"
                                                                                  : "bg-green-500"
                                                              }`}
                                                             alth.memory.used)} / {formatBytes(health.memory.total)}
                                  </div>p>
                        </div>div>
                  
                          <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                                <span>YouTube Quota</span>span>
                                                <span>{formatPercentage(health.youtubeQuota.percentage)}</span>span>
                                    </div>div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                                className={`h-2 rounded-full transition-all ${
                                                                                  health.youtubeQuota.percentage > 80
                                                                                    ? "bg-red-500"
                                                                                    : health.youtubeQuota.percentage > 60
                                                                                    ? "bg-yellow-500"
                                                                                    : "bg-green-500"
                                                                }`}
                                                             %` }}
                                                  />
                                    </div>div>
                                      <p className="text-xs text-gray-600">
                                        {health.youtubeQuota.used} / {health.youtubeQuota.limit} units
                                      </p>p>
                          </div>div>
                
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                  <div>
                                              <p className="text-xs text-gray-600">Avg Response Time</p>p>
                                              <p className="text-sm font-medium">
                                                {Math.round(health.avgResponseTime)}ms
                                              </p>p>
                                  </div>div>
                                  <div>
                                              <p className="text-xs text-gray-600">Error Count</p>p>
                                              <p className="text-sm font-medium">{health.errorCount}</p>p>
                                  </div>div>
                                  <div>
                                              <p className="text-xs text-gray-600">Uptime</p>p>
                                              <p className="text-sm font-medium">
                                                {formatDistanceToNow(new Date(Date.now() - health.uptime))}
                                              </p>p>
                                  </div>div>
                                  <div>
                                              <p className="text-xs text-gray-600">Feature Flags</p>p>
                                              <p className="text-sm font-medium">{health.activeFeatureFlags}</p>p>
                                  </div>div>
                        </div>div>
                </CardContent>CardContent>
          </Card>Card>
        );
}

// Circuit Breaker Status Component
function CircuitBreakerCard({ status }: { status: HealthStatus }) {
    return (
          <Card>
                <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                                  <Zap className="w-5 h-5" />
                                  Circuit Breakers
                        </CardTitle>CardTitle>
                </CardHeader>CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(status.circuitBreakerStatus).map(([name, state]) => (
                      <div
                                    key={name}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                  >
                                  <span className="font-medium capitalize">{name}</span>span>
                                  <div className="flex items-center gap-2">
                                                <div
                                                                  className={`w-3 h-3 rounded-full ${getStatusColor(state)}`}
                                                                />
                                                <span className="text-sm">{getStatusLabel(state)}</span>span>
                                  </div>div>
                      </div>div>
                        ))}
                </CardContent>CardContent>
          </Card>Card>
        );
}

// Feature Flags Component
function FeatureFlagsSection({ flags }: { flags: FeatureFlag[] }) {
    const { toast } = useToast();
    const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  
    const toggleFlagMutation = useMutation({
          mutationFn: async (flag: FeatureFlag) => {
                  return await apiRequest("/api/admin/feature-flags", {
                            method: "PATCH",
                            body: JSON.stringify({
                                        id: flag.id,
                                        enabled: !flag.enabled,
                            }),
                  });
          },
          onSuccess: () => {
                  toast({
                            title: "Feature flag updated",
                            description: "The feature flag has been toggled successfully.",
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/health"] });
          },
          onError: () => {
                  toast({
                            title: "Error",
                            description: "Failed to update feature flag.",
                            variant: "destructive",
                  });
          },
    });
  
    return (
          <Card>
                <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                                  <Lightbulb className="w-5 h-5" />
                                  Feature Flags
                        </CardTitle>CardTitle>
                        <CardDescription>
                          {flags.filter((f) => f.enabled).length} of {flags.length} enabled
                        </CardDescription>CardDescription>
                </CardHeader>CardHeader>
                <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {flags.map((flag) => (
                        <div
                                        key={flag.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                      >
                                      <div>
                                                      <p className="font-medium">{flag.name}</p>p>
                                        {flag.rolloutPercentage && (
                                                          <p className="text-xs text-gray-600">
                                                                              Rollout: {flag.rolloutPercentage}%
                                                          </p>p>
                                                      )}
                                      </div>div>
                                      <Button
                                                        size="sm"
                                                        variant={flag.enabled ? "default" : "outline"}
                                                        onClick={() => toggleFlagMutation.mutate(flag)}
                                                        disabled={toggleFlagMutation.isPending}
                                                      >
                                        {flag.enabled ? "Enabled" : "Disabled"}
                                      </Button>Button>
                        </div>div>
                                  ))}
                        </div>div>
                </CardContent>CardContent>
          </Card>Card>
        );
}

// Main Admin Component
export default function Admin() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
  
    // Fetch health status
    const { data: health, isLoading: healthLoading } = useQuery({
          queryKey: ["/api/health"],
          queryFn: () => fetch("/api/health").then((r) => r.json()),
          refetchInterval: 30000, // Refetch every 30 seconds
    });
  
    // Fetch metrics
    const { data: metrics, isLoading: metricsLoading } = useQuery({
          queryKey: ["/api/admin/metrics"],
          queryFn: () => fetch("/api/admin/metrics").then((r) => r.json()),
          refetchInterval: 60000,
    });
  
    // Fetch feature flags
    const { data: flags, isLoading: flagsLoading } = useQuery({
          queryKey: ["/api/admin/feature-flags"],
          queryFn: () => fetch("/api/admin/feature-flags").then((r) => r.json()),
    });
  
    const clearCacheMutation = useMutation({
          mutationFn: async () => {
                  return await apiRequest("/api/admin/cache/clear", { method: "POST" });
          },
          onSuccess: () => {
                  toast({
                            title: "Cache cleared",
                            description: "Application cache has been cleared successfully.",
                  });
          },
    });
  
    const exportMetricsMutation = useMutation({
          mutationFn: async () => {
                  return await apiRequest("/api/admin/export-metrics", { method: "POST" });
          },
          onSuccess: (data: any) => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                            type: "application/json",
                  });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `metrics-${new Date().toISOString()}.json`;
                  a.click();
                  toast({
                            title: "Metrics exported",
                            description: "Metrics have been exported to a JSON file.",
                  });
          },
    });
  
    if (healthLoading) {
          return (
                  <div className="flex items-center justify-center min-h-screen">
                          <Loader2 className="w-8 h-8 animate-spin" />
                  </div>div>
                );
    }
  
    return (
          <div className="min-h-screen bg-background">
                <header className="border-b sticky top-0 z-10 bg-background">
                        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                              <Link href="/" className="inline-flex items-center gap-2 mr-8">
                                                            <Shield className="w-5 h-5" />
                                                            <span>Back to Home</span>span>
                                              </Link>Link>
                                              <h1 className="text-3xl font-bold">Admin Dashboard</h1>h1>
                                  </div>div>
                                  <div className="flex items-center gap-4">
                                              <ThemeToggle />
                                  </div>div>
                        </div>div>
                </header>header>
          
                <main className="container mx-auto px-4 py-8">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                                  <TabsList className="grid w-full grid-cols-4 mb-8">
                                              <TabsTrigger value="overview" className="flex items-center gap-2">
                                                            <BarChart3 className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Overview</span>span>
                                              </TabsTrigger>TabsTrigger>
                                              <TabsTrigger value="flags" className="flex items-center gap-2">
                                                            <Lightbulb className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Feature Flags</span>span>
                                              </TabsTrigger>TabsTrigger>
                                              <TabsTrigger value="metrics" className="flex items-center gap-2">
                                                            <TrendingUp className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Metrics</span>span>
                                              </TabsTrigger>TabsTrigger>
                                              <TabsTrigger value="tools" className="flex items-center gap-2">
                                                            <Wrench className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Tools</span>span>
                                              </TabsTrigger>TabsTrigger>
                                  </TabsList>TabsList>
                        
                          {/* Overview Tab */}
                                  <TabsContent value="overview" className="space-y-6">
                                    {health && <HealthStatusCard health={health} />}
                                    {health && <CircuitBreakerCard status={health} />}
                                  </TabsContent>TabsContent>
                        
                          {/* Feature Flags Tab */}
                                  <TabsContent value="flags" className="space-y-6">
                                    {flagsLoading ? (
                          <Card>
                                          <CardContent className="flex items-center justify-center py-8">
                                                            <Loader2 className="w-6 h-6 animate-spin" />
                                          </CardContent>CardContent>
                          </Card>Card>
                                              ) : flags ? (
                          <FeatureFlagsSection flags={flags} />
                        ) : (
                          <Card>
                                          <CardContent className="flex items-center justify-center py-8">
                                                            <p className="text-gray-600">No feature flags available</p>p>
                                          </CardContent>CardContent>
                          </Card>Card>
                                              )}
                                  </TabsContent>TabsContent>
                        
                          {/* Metrics Tab */}
                                  <TabsContent value="metrics" className="space-y-6">
                                              <Card>
                                                            <CardHeader>
                                                                            <CardTitle className="flex items-center gap-2">
                                                                                              <TrendingUp className="w-5 h-5" />
                                                                                              Performance Metrics
                                                                            </CardTitle>CardTitle>
                                                            </CardHeader>CardHeader>
                                                            <CardContent>
                                                              {metricsLoading ? (
                              <div className="flex items-center justify-center py-8">
                                                  <Loader2 className="w-6 h-6 animate-spin" />
                              </div>div>
                                                                            ) : metrics ? (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                  <div className="p-4 border rounded-lg">
                                                                        <p className="text-sm text-gray-600">P50 Response Time</p>p>
                                                                        <p className="text-2xl font-bold">
                                                                          {metrics.p50 || 0}ms
                                                                        </p>p>
                                                  </div>div>
                                                  <div className="p-4 border rounded-lg">
                                                                        <p className="text-sm text-gray-600">P95 Response Time</p>p>
                                                                        <p className="text-2xl font-bold">
                                                                                          </p>le={idth: `${health.youtubeQuota.percentage}`</div>={{ width: `${health.memory.percent}%` }}
                                                            />
                                  </div>div>
                                  <p className="text-xs text-gray-600">
                                    {formatBytes(he</Card>
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
    }
}
}
}
}