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
import { UserMenu } from "@/components/user-menu";
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
  Youtube,
  Play,
  Eye,
  Tag,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Rocket,
  Code,
  XCircle
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

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

interface ImplementationStep {
  step: number;
  description: string;
  file: string;
  action: string;
  codeSnippet: string;
  impact: string;
}

interface ImplementationPlan {
  summary: string;
  steps: ImplementationStep[];
  estimatedImpact: string;
  risks: string;
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

interface BulkOptimizeResult {
  videoId: string;
  title: string;
  status: "success" | "failed" | "skipped";
  message: string;
  optimizedDescription?: string;
  optimizedTags?: string[];
}

interface OptimizationStatus {
  totalVideos: number;
  optimizedCount: number;
  videos: Array<{
    videoId: string;
    title: string;
    isOptimized: boolean;
    hasDescription: boolean;
    tagsCount: number;
  }>;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("guardian");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [maxVideos, setMaxVideos] = useState(10);
  const [dryRun, setDryRun] = useState(true);
  const [skipOptimized, setSkipOptimized] = useState(true);
  const [optimizeResults, setOptimizeResults] = useState<BulkOptimizeResult[]>([]);

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

  const implementUpgradeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/admin/agent-logs/${id}/implement`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-logs"] });
      setExpandedLogId(data.log?.id || null);
      toast({ title: "Implementation plan generated" });
    },
    onError: () => {
      toast({ title: "Failed to generate plan", variant: "destructive" });
    }
  });

  const applyUpgradeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/admin/agent-logs/${id}/apply`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agent-logs"] });
      setExpandedLogId(null);
      toast({ title: "Upgrade applied successfully" });
    },
    onError: () => {
      toast({ title: "Failed to apply upgrade", variant: "destructive" });
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

  // YouTube Bulk Optimization
  const { data: optimizationStatus, isLoading: loadingOptStatus, refetch: refetchOptStatus } = useQuery<OptimizationStatus>({
    queryKey: ["/api/youtube/optimization-status"],
    queryFn: () => fetch("/api/youtube/optimization-status").then(r => r.json()),
  });

  const bulkOptimizeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/youtube/bulk-optimize", {
      maxVideos,
      skipAlreadyOptimized: skipOptimized,
      dryRun,
    }),
    onSuccess: (data: any) => {
      setOptimizeResults(data.results || []);
      refetchOptStatus();
      toast({ 
        title: dryRun ? "Preview Generated" : "Optimization Complete",
        description: data.message 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Optimization Failed", 
        description: error.message,
        variant: "destructive" 
      });
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
          </div>
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
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              YouTube Optimizer
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
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {upgradeLogs.map((log) => {
                        const plan = (log.metadata as any)?.implementationPlan as ImplementationPlan | undefined;
                        const isExpanded = expandedLogId === log.id;

                        return (
                          <Card key={log.id} data-testid={`upgrade-card-${log.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    {getStatusIcon(log.status)}
                                    <h4 className="font-medium">{log.title}</h4>
                                    <Badge variant="outline" className="text-xs">
                                      {log.action}
                                    </Badge>
                                    {log.status === "in_progress" && (
                                      <Badge variant="secondary" className="text-xs">In Progress</Badge>
                                    )}
                                    {log.status === "resolved" && (
                                      <Badge className="text-xs">Implemented</Badge>
                                    )}
                                    {log.status === "ignored" && (
                                      <Badge variant="secondary" className="text-xs">Rejected</Badge>
                                    )}
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
                                    <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                                      <Wrench className="w-3 h-3 inline mr-1" />
                                      {log.recommendation}
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                  {log.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => implementUpgradeMutation.mutate(log.id)}
                                        disabled={implementUpgradeMutation.isPending}
                                        data-testid={`button-implement-${log.id}`}
                                      >
                                        {implementUpgradeMutation.isPending ? (
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        ) : (
                                          <Rocket className="w-3 h-3 mr-1" />
                                        )}
                                        Implement
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateLogStatus.mutate({ id: log.id, status: "ignored" })}
                                        data-testid={`button-reject-${log.id}`}
                                      >
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {log.status === "in_progress" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => applyUpgradeMutation.mutate(log.id)}
                                        disabled={applyUpgradeMutation.isPending}
                                        data-testid={`button-apply-${log.id}`}
                                      >
                                        {applyUpgradeMutation.isPending ? (
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                        )}
                                        Apply Changes
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateLogStatus.mutate({ id: log.id, status: "pending" })}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  )}
                                  {(log.status === "in_progress" || log.status === "resolved") && plan && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                      data-testid={`button-toggle-plan-${log.id}`}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-3 h-3 mr-1" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 mr-1" />
                                      )}
                                      {isExpanded ? "Hide Plan" : "View Plan"}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {isExpanded && plan && (
                                <div className="mt-4 border-t pt-4 space-y-4">
                                  <div>
                                    <h5 className="font-medium text-sm mb-1">Implementation Summary</h5>
                                    <p className="text-sm text-muted-foreground">{plan.summary}</p>
                                  </div>

                                  <div>
                                    <h5 className="font-medium text-sm mb-2">Steps</h5>
                                    <div className="space-y-3">
                                      {(plan.steps || []).map((step, idx) => (
                                        <div key={idx} className="bg-muted p-3 rounded-md">
                                          <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">Step {step.step || idx + 1}</Badge>
                                            <span className="text-sm font-medium">{step.description}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                            <FileCode className="w-3 h-3" />
                                            <span>{step.file}</span>
                                            <Badge variant="secondary" className="text-xs">{step.action}</Badge>
                                          </div>
                                          {step.codeSnippet && (
                                            <pre className="bg-background p-2 rounded-md text-xs overflow-x-auto border mt-1">
                                              <code>{step.codeSnippet}</code>
                                            </pre>
                                          )}
                                          {step.impact && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                              <strong>Impact:</strong> {step.impact}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {plan.estimatedImpact && (
                                    <div>
                                      <h5 className="font-medium text-sm mb-1">Expected Impact</h5>
                                      <p className="text-sm text-muted-foreground">{plan.estimatedImpact}</p>
                                    </div>
                                  )}

                                  {plan.risks && (
                                    <div>
                                      <h5 className="font-medium text-sm mb-1">Risks & Considerations</h5>
                                      <p className="text-sm text-muted-foreground">{plan.risks}</p>
                                    </div>
                                  )}

                                  {log.status === "in_progress" && (
                                    <div className="flex gap-2 pt-2 border-t">
                                      <Button
                                        onClick={() => applyUpgradeMutation.mutate(log.id)}
                                        disabled={applyUpgradeMutation.isPending}
                                        data-testid={`button-apply-plan-${log.id}`}
                                      >
                                        {applyUpgradeMutation.isPending ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                        )}
                                        Approve & Apply Changes
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => updateLogStatus.mutate({ id: log.id, status: "pending" })}
                                      >
                                        Cancel Implementation
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
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

          <TabsContent value="youtube">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Youtube className="w-5 h-5 text-red-500" />
                      YouTube Bulk Metadata Optimizer
                    </CardTitle>
                    <CardDescription>
                      Use AI to optimize video descriptions and tags for better SEO and discoverability
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => bulkOptimizeMutation.mutate()}
                    disabled={bulkOptimizeMutation.isPending}
                    data-testid="button-bulk-optimize"
                  >
                    {bulkOptimizeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : dryRun ? (
                      <Eye className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {dryRun ? "Preview Changes" : "Optimize Now"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Status Card */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">
                          {loadingOptStatus ? "..." : optimizationStatus?.totalVideos || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Videos</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-500">
                          {loadingOptStatus ? "..." : optimizationStatus?.optimizedCount || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Optimized</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-orange-500">
                          {loadingOptStatus ? "..." : (optimizationStatus?.totalVideos || 0) - (optimizationStatus?.optimizedCount || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Settings */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">Optimization Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Videos to Process: {maxVideos}</Label>
                      </div>
                      <Slider
                        value={[maxVideos]}
                        onValueChange={([v]) => setMaxVideos(v)}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Default: 10 videos (max 50). Each video uses ~50-100 API quota units. YouTube allows 10,000 units/day.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Preview Mode (Dry Run)</Label>
                        <p className="text-xs text-muted-foreground">
                          Generate optimizations without updating YouTube
                        </p>
                      </div>
                      <Switch
                        checked={dryRun}
                        onCheckedChange={setDryRun}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Skip Already Optimized</Label>
                        <p className="text-xs text-muted-foreground">
                          Don't re-optimize videos that were previously processed
                        </p>
                      </div>
                      <Switch
                        checked={skipOptimized}
                        onCheckedChange={setSkipOptimized}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-6 border-dashed">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        YouTube API Quota Information
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
                        <li>YouTube gives each project <strong>10,000 quota units per day</strong> (resets at midnight Pacific Time)</li>
                        <li>Each video update uses ~50-100 units. Processing 3 videos uses ~150-300 units</li>
                        <li>If you hit the limit, wait until the next day or request a quota increase</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>To increase your quota:</strong> Go to{" "}
                        <a
                          href="https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                          data-testid="link-quota-increase"
                        >
                          Google Cloud Console &rarr; YouTube Data API &rarr; Quotas
                        </a>
                        , click "Edit Quotas", and submit a request with your use case.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress indicator */}
                {bulkOptimizeMutation.isPending && (
                  <Card className="mb-6 border-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">Optimizing videos...</p>
                          <p className="text-sm text-muted-foreground">
                            This may take a few minutes. Processing {maxVideos} videos.
                          </p>
                          <Progress value={33} className="mt-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Results */}
                {optimizeResults.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Optimization Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {optimizeResults.map((result, idx) => (
                            <Card key={idx} className={`border-l-4 ${
                              result.status === "success" ? "border-l-green-500" :
                              result.status === "failed" ? "border-l-red-500" : "border-l-gray-500"
                            }`}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {result.status === "success" ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                      ) : result.status === "failed" ? (
                                        <X className="w-4 h-4 text-red-500" />
                                      ) : (
                                        <Clock className="w-4 h-4 text-gray-500" />
                                      )}
                                      <h4 className="font-medium text-sm truncate max-w-md">
                                        {result.title}
                                      </h4>
                                      <Badge variant={
                                        result.status === "success" ? "default" :
                                        result.status === "failed" ? "destructive" : "secondary"
                                      }>
                                        {result.status}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-2">
                                      {result.message}
                                    </p>
                                    {result.optimizedDescription && (
                                      <div className="mt-2 p-2 bg-muted rounded text-xs max-h-32 overflow-y-auto">
                                        <strong>New Description:</strong>
                                        <p className="mt-1 whitespace-pre-wrap">
                                          {result.optimizedDescription.substring(0, 300)}
                                          {result.optimizedDescription.length > 300 && "..."}
                                        </p>
                                      </div>
                                    )}
                                    {result.optimizedTags && result.optimizedTags.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        <Tag className="w-3 h-3 text-muted-foreground" />
                                        {result.optimizedTags.slice(0, 8).map((tag, i) => (
                                          <Badge key={i} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                        {result.optimizedTags.length > 8 && (
                                          <Badge variant="secondary" className="text-xs">
                                            +{result.optimizedTags.length - 8} more
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Empty state */}
                {optimizeResults.length === 0 && !bulkOptimizeMutation.isPending && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Youtube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Configure settings above and click "Preview Changes" to see AI-generated optimizations.</p>
                    <p className="text-sm mt-2">When ready, disable Preview Mode and click "Optimize Now" to update YouTube.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
