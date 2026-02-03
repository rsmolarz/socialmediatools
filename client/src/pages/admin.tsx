import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2
} from "lucide-react";

interface AgentLog {
  id: number;
  agentType: string;
  action: string;
  severity: string;
  title: string;
  description: string | null;
  filePath: string | null;
  lineNumber: number | null;
  recommendation: string | null;
  status: string;
  metadata: Record<string, any> | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface FeatureRecommendation {
  id: number;
  title: string;
  description: string;
  priority: string;
  category: string;
  estimatedEffort: string | null;
  status: string;
  rationale: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  reviewedAt: string | null;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical": return "bg-red-500";
    case "error": return "bg-orange-500";
    case "warning": return "bg-yellow-500";
    default: return "bg-blue-500";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical": return "destructive";
    case "high": return "destructive";
    case "medium": return "secondary";
    default: return "outline";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "resolved": return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "in_progress": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "ignored": return <Clock className="w-4 h-4 text-gray-500" />;
    default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  }
};

export default function AdminPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("guardian");

  const { data: guardianLogs = [], isLoading: loadingGuardian } = useQuery<AgentLog[]>({
    queryKey: ["/api/admin/agent-logs", "guardian"],
    queryFn: () => fetch("/api/admin/agent-logs?type=guardian").then(r => r.json()),
  });

  const { data: upgradeLogs = [], isLoading: loadingUpgrade } = useQuery<AgentLog[]>({
    queryKey: ["/api/admin/agent-logs", "upgrade"],
    queryFn: () => fetch("/api/admin/agent-logs?type=upgrade").then(r => r.json()),
  });

  const { data: recommendations = [], isLoading: loadingRecommendations } = useQuery<FeatureRecommendation[]>({
    queryKey: ["/api/admin/recommendations"],
  });

  const runGuardianMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/run-guardian"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-logs"] });
      toast({ title: "Code Guardian scan complete" });
    },
    onError: () => {
      toast({ title: "Scan failed", variant: "destructive" });
    }
  });

  const runUpgradeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/run-upgrade"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recommendations"] });
      toast({ title: "Code Upgrade analysis complete" });
    },
    onError: () => {
      toast({ title: "Analysis failed", variant: "destructive" });
    }
  });

  const updateLogStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/admin/agent-logs/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-logs"] });
      toast({ title: "Status updated" });
    }
  });

  const updateRecommendationStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/admin/recommendations/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recommendations"] });
      toast({ title: "Recommendation updated" });
    }
  });

  const pendingGuardian = guardianLogs.filter(l => l.status === "pending").length;
  const pendingUpgrade = upgradeLogs.filter(l => l.status === "pending").length;
  const pendingRecommendations = recommendations.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Editor
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Guardian Issues</p>
                  <p className="text-2xl font-bold">{pendingGuardian}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upgrade Suggestions</p>
                  <p className="text-2xl font-bold">{pendingUpgrade}</p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Feature Ideas</p>
                  <p className="text-2xl font-bold">{pendingRecommendations}</p>
                </div>
                <Lightbulb className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold">{guardianLogs.length + upgradeLogs.length}</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="guardian" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Code Guardian
              {pendingGuardian > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingGuardian}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upgrade" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Code Upgrade
              {pendingUpgrade > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingUpgrade}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Feature Ideas
              {pendingRecommendations > 0 && (
                <Badge className="ml-1">{pendingRecommendations}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guardian">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Code Guardian Agent
                    </CardTitle>
                    <CardDescription>
                      Monitors code for errors, security issues, and best practices
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => runGuardianMutation.mutate()}
                    disabled={runGuardianMutation.isPending}
                    data-testid="button-run-guardian"
                  >
                    {runGuardianMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Run Scan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingGuardian ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : guardianLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No issues detected. Run a scan to check your code.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {guardianLogs.map((log) => (
                        <Card key={log.id} className="border-l-4" style={{ borderLeftColor: getSeverityColor(log.severity).replace("bg-", "") }}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(log.status)}
                                  <h4 className="font-medium">{log.title}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {log.severity}
                                  </Badge>
                                </div>
                                {log.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{log.description}</p>
                                )}
                                {log.filePath && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <FileCode className="w-3 h-3" />
                                    {log.filePath}{log.lineNumber ? `:${log.lineNumber}` : ""}
                                  </div>
                                )}
                                {log.recommendation && (
                                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                                    <strong>Recommendation:</strong> {log.recommendation}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {log.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateLogStatus.mutate({ id: log.id, status: "resolved" })}
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => updateLogStatus.mutate({ id: log.id, status: "ignored" })}
                                    >
                                      Ignore
                                    </Button>
                                  </>
                                )}
                              </div>
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

          <TabsContent value="upgrade">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Code Upgrade Agent
                    </CardTitle>
                    <CardDescription>
                      Suggests improvements, optimizations, and modern patterns
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => runUpgradeMutation.mutate()}
                    disabled={runUpgradeMutation.isPending}
                    data-testid="button-run-upgrade"
                  >
                    {runUpgradeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4 mr-2" />
                    )}
                    Analyze Code
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUpgrade ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : upgradeLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No upgrade suggestions. Run an analysis to get recommendations.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {upgradeLogs.map((log) => (
                        <Card key={log.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(log.status)}
                                  <h4 className="font-medium">{log.title}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {log.action}
                                  </Badge>
                                </div>
                                {log.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{log.description}</p>
                                )}
                                {log.filePath && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <FileCode className="w-3 h-3" />
                                    {log.filePath}
                                  </div>
                                )}
                                {log.recommendation && (
                                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                                    <Wrench className="w-3 h-3 inline mr-1" />
                                    {log.recommendation}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {log.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateLogStatus.mutate({ id: log.id, status: "resolved" })}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Done
                                  </Button>
                                )}
                              </div>
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

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Feature Recommendations
                </CardTitle>
                <CardDescription>
                  AI-generated suggestions for new features based on usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRecommendations ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No feature recommendations yet. Run the Code Upgrade agent to generate ideas.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {recommendations.map((rec) => (
                        <Card key={rec.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{rec.title}</h4>
                                  <Badge variant={getPriorityColor(rec.priority) as any}>
                                    {rec.priority}
                                  </Badge>
                                  <Badge variant="outline">{rec.category}</Badge>
                                  {rec.estimatedEffort && (
                                    <Badge variant="secondary" className="text-xs">
                                      {rec.estimatedEffort} effort
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                                {rec.rationale && (
                                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                                    <strong>Why:</strong> {rec.rationale}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Suggested {formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1">
                                {rec.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => updateRecommendationStatus.mutate({ id: rec.id, status: "approved" })}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateRecommendationStatus.mutate({ id: rec.id, status: "rejected" })}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {rec.status !== "pending" && (
                                  <Badge variant={rec.status === "approved" ? "default" : "secondary"}>
                                    {rec.status}
                                  </Badge>
                                )}
                              </div>
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
      </main>
    </div>
  );
}
