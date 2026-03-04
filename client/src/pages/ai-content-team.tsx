import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import type { AiSuggestion, AiAction, AiAutomation } from "@shared/schema";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Zap,
  FileText,
  ClipboardList,
  DollarSign,
  Target,
  Loader2,
  ArrowLeft,
  Settings,
  Activity,
  Wrench,
  Bot,
  TrendingUp,
  Clock,
  Check,
  X,
} from "lucide-react";

interface TeamStats {
  pendingSuggestions: number;
  acceptedToday: number;
  autoResponded: number;
  actionsThisWeek: number;
}

function StatCard({ icon: Icon, value, label, color }: { icon: any; value: number; label: string; color: string }) {
  return (
    <Card data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-3xl font-bold" data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SuggestionsTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: suggestions = [], isLoading } = useQuery<AiSuggestion[]>({
    queryKey: ["/api/ai-team/suggestions"],
  });

  const reviewMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai-team/run-review"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/stats"] });
      toast({ title: "AI Review Complete", description: "Optimization suggestions have been generated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run AI review.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/ai-team/suggestions/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/stats"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update suggestion.", variant: "destructive" });
    },
  });

  const filtered = suggestions.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="description">Description</SelectItem>
              <SelectItem value="seo">SEO</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => reviewMutation.mutate()}
          disabled={reviewMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          data-testid="button-run-ai-review"
        >
          {reviewMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Run AI Review
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold" data-testid="text-no-suggestions">No Suggestions Found</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Run an AI Review to generate optimization suggestions for your content.
            </p>
            <Button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-run-ai-review-empty"
            >
              {reviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Run AI Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((suggestion) => (
            <Card key={suggestion.id} data-testid={`suggestion-card-${suggestion.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={suggestion.type === "title" ? "default" : suggestion.type === "seo" ? "secondary" : "outline"}>
                        {suggestion.type}
                      </Badge>
                      <Badge variant={suggestion.impact === "high" ? "destructive" : suggestion.impact === "medium" ? "default" : "secondary"}>
                        {suggestion.impact} impact
                      </Badge>
                      <Badge variant={suggestion.status === "pending" ? "outline" : suggestion.status === "accepted" ? "default" : "secondary"}>
                        {suggestion.status}
                      </Badge>
                    </div>
                    <p className="font-medium">{suggestion.targetTitle}</p>
                    {suggestion.currentValue && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Current:</span> {suggestion.currentValue}
                      </p>
                    )}
                    {suggestion.suggestedValue && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        <span className="font-medium">Suggested:</span> {suggestion.suggestedValue}
                      </p>
                    )}
                    {suggestion.reasoning && (
                      <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
                    )}
                  </div>
                  {suggestion.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateMutation.mutate({ id: suggestion.id, status: "accepted" })}
                        data-testid={`button-accept-${suggestion.id}`}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateMutation.mutate({ id: suggestion.id, status: "dismissed" })}
                        data-testid={`button-dismiss-${suggestion.id}`}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AutomationTab() {
  const { toast } = useToast();
  const { data: automations = [], isLoading } = useQuery<AiAutomation[]>({
    queryKey: ["/api/ai-team/automations"],
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest("PATCH", `/api/ai-team/automations/${id}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/automations"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to toggle automation.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ai-team/automations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/automations"] });
      toast({ title: "Automation Created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create automation.", variant: "destructive" });
    },
  });

  const presetAutomations = [
    { name: "Auto-Optimize Titles", trigger: "new_content", action: "optimize_title", description: "Automatically optimize titles when new content is created" },
    { name: "Daily SEO Review", trigger: "daily_schedule", action: "seo_review", description: "Run SEO analysis on all content daily" },
    { name: "Auto-Generate Descriptions", trigger: "missing_description", action: "generate_description", description: "Generate descriptions for content without one" },
    { name: "Engagement Alert", trigger: "low_engagement", action: "engagement_strategy", description: "Generate engagement strategies when metrics drop" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Active Automations</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : automations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Settings className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No automations configured yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {automations.map((auto) => (
              <Card key={auto.id} data-testid={`automation-card-${auto.id}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{auto.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger: {auto.trigger} | Runs: {auto.runCount}
                    </p>
                  </div>
                  <Switch
                    checked={auto.enabled ?? false}
                    onCheckedChange={(enabled) => toggleMutation.mutate({ id: auto.id, enabled })}
                    data-testid={`switch-automation-${auto.id}`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Available Automations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presetAutomations.map((preset) => (
            <Card key={preset.name} data-testid={`preset-automation-${preset.action}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{preset.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createMutation.mutate({
                      name: preset.name,
                      trigger: preset.trigger,
                      action: preset.action,
                      enabled: true,
                    })}
                    disabled={createMutation.isPending}
                    data-testid={`button-enable-${preset.action}`}
                  >
                    Enable
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityTab() {
  const { data: actions = [], isLoading } = useQuery<AiAction[]>({
    queryKey: ["/api/ai-team/actions"],
  });

  const getActionIcon = (type: string) => {
    switch (type) {
      case "optimize_title": return FileText;
      case "generate_description": return ClipboardList;
      case "performance_analysis": return TrendingUp;
      case "engagement_strategy": return Target;
      case "ai_review": return Sparkles;
      default: return Bot;
    }
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : actions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Activity Yet</h3>
            <p className="text-muted-foreground mt-1">
              Use the AI tools to start generating activity.
            </p>
          </CardContent>
        </Card>
      ) : (
        actions.map((action) => {
          const Icon = getActionIcon(action.actionType);
          return (
            <Card key={action.id} data-testid={`activity-card-${action.id}`}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{action.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{action.toolUsed}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(action.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Badge variant={action.status === "completed" ? "default" : "secondary"}>
                  {action.status}
                </Badge>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function ToolCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card data-testid={`tool-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToolsTab() {
  const { toast } = useToast();

  const [titleInput, setTitleInput] = useState({ currentTitle: "", category: "" });
  const [descInput, setDescInput] = useState({ productTitle: "", currentDescription: "", condition: "", category: "" });
  const [perfInput, setPerfInput] = useState({ contentId: "", contentTitle: "" });
  const [engInput, setEngInput] = useState({ contentId: "", contentTitle: "" });

  const [titleResult, setTitleResult] = useState<any>(null);
  const [descResult, setDescResult] = useState<any>(null);
  const [perfResult, setPerfResult] = useState<any>(null);
  const [engResult, setEngResult] = useState<any>(null);

  const optimizeTitleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-team/optimize-title", titleInput);
      return res.json();
    },
    onSuccess: (data) => {
      setTitleResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/actions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to optimize title", variant: "destructive" }),
  });

  const generateDescMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-team/generate-description", descInput);
      return res.json();
    },
    onSuccess: (data) => {
      setDescResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/actions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to generate description", variant: "destructive" }),
  });

  const perfAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-team/performance-analysis", perfInput);
      return res.json();
    },
    onSuccess: (data) => {
      setPerfResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/actions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to analyze performance", variant: "destructive" }),
  });

  const engStrategyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-team/engagement-strategy", engInput);
      return res.json();
    },
    onSuccess: (data) => {
      setEngResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-team/actions"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to generate strategy", variant: "destructive" }),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ToolCard icon={FileText} title="Optimize Title" description="AI-powered title optimization for better search visibility">
        <div className="space-y-3">
          <div>
            <Label>Current Title</Label>
            <Input
              placeholder="Enter listing title..."
              value={titleInput.currentTitle}
              onChange={(e) => setTitleInput(p => ({ ...p, currentTitle: e.target.value }))}
              data-testid="input-optimize-title"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              placeholder="e.g., Health & Wellness"
              value={titleInput.category}
              onChange={(e) => setTitleInput(p => ({ ...p, category: e.target.value }))}
              data-testid="input-optimize-category"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => optimizeTitleMutation.mutate()}
            disabled={optimizeTitleMutation.isPending || !titleInput.currentTitle}
            data-testid="button-run-optimize-title"
          >
            {optimizeTitleMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Run
          </Button>
          {titleResult?.titles && (
            <div className="space-y-2 mt-3 p-3 bg-muted/50 rounded-lg" data-testid="result-optimize-title">
              {titleResult.titles.map((t: any, i: number) => (
                <div key={i} className="p-2 bg-background rounded border">
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.reasoning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </ToolCard>

      <ToolCard icon={ClipboardList} title="Generate Description" description="Generate compelling content descriptions with AI">
        <div className="space-y-3">
          <div>
            <Label>Content Title</Label>
            <Input
              placeholder="Enter title..."
              value={descInput.productTitle}
              onChange={(e) => setDescInput(p => ({ ...p, productTitle: e.target.value }))}
              data-testid="input-desc-title"
            />
          </div>
          <div>
            <Label>Current Description</Label>
            <Textarea
              placeholder="Enter current description..."
              value={descInput.currentDescription}
              onChange={(e) => setDescInput(p => ({ ...p, currentDescription: e.target.value }))}
              data-testid="input-desc-current"
            />
          </div>
          <div>
            <Label>Context</Label>
            <Input
              placeholder="e.g., Episode 45 - Health Tips"
              value={descInput.condition}
              onChange={(e) => setDescInput(p => ({ ...p, condition: e.target.value }))}
              data-testid="input-desc-condition"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              placeholder="e.g., Medical Education"
              value={descInput.category}
              onChange={(e) => setDescInput(p => ({ ...p, category: e.target.value }))}
              data-testid="input-desc-category"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => generateDescMutation.mutate()}
            disabled={generateDescMutation.isPending || !descInput.productTitle}
            data-testid="button-run-generate-desc"
          >
            {generateDescMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Run
          </Button>
          {descResult?.description && (
            <div className="space-y-2 mt-3 p-3 bg-muted/50 rounded-lg" data-testid="result-generate-desc">
              <p className="text-sm">{descResult.description}</p>
              {descResult.highlights && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {descResult.highlights.map((h: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{h}</Badge>
                  ))}
                </div>
              )}
              {descResult.seoKeywords && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {descResult.seoKeywords.map((k: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{k}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ToolCard>

      <ToolCard icon={DollarSign} title="Performance Analysis" description="Get AI-powered performance insights based on content data">
        <div className="space-y-3">
          <div>
            <Label>Content Title</Label>
            <Input
              placeholder="Enter content title..."
              value={perfInput.contentTitle}
              onChange={(e) => setPerfInput(p => ({ ...p, contentTitle: e.target.value }))}
              data-testid="input-perf-title"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => perfAnalysisMutation.mutate()}
            disabled={perfAnalysisMutation.isPending || !perfInput.contentTitle}
            data-testid="button-run-perf-analysis"
          >
            {perfAnalysisMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Run
          </Button>
          {perfResult && (
            <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg" data-testid="result-perf-analysis">
              {perfResult.score !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Score:</span>
                  <Badge variant={perfResult.score >= 70 ? "default" : perfResult.score >= 40 ? "secondary" : "destructive"}>
                    {perfResult.score}/100
                  </Badge>
                </div>
              )}
              {perfResult.strengths && (
                <div>
                  <p className="font-medium text-sm text-green-600 dark:text-green-400">Strengths</p>
                  <ul className="text-sm list-disc list-inside">
                    {perfResult.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {perfResult.recommendations && (
                <div>
                  <p className="font-medium text-sm">Recommendations</p>
                  {perfResult.recommendations.map((r: any, i: number) => (
                    <div key={i} className="text-sm p-2 bg-background rounded border mt-1">
                      <p>{r.action}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{r.impact} impact</Badge>
                        <Badge variant="outline" className="text-xs">{r.effort} effort</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ToolCard>

      <ToolCard icon={Target} title="Engagement Strategy" description="Get smart engagement strategies for your content">
        <div className="space-y-3">
          <div>
            <Label>Content Title</Label>
            <Input
              placeholder="Enter content title..."
              value={engInput.contentTitle}
              onChange={(e) => setEngInput(p => ({ ...p, contentTitle: e.target.value }))}
              data-testid="input-eng-title"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => engStrategyMutation.mutate()}
            disabled={engStrategyMutation.isPending || !engInput.contentTitle}
            data-testid="button-run-eng-strategy"
          >
            {engStrategyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Run
          </Button>
          {engResult && (
            <div className="space-y-3 mt-3 p-3 bg-muted/50 rounded-lg" data-testid="result-eng-strategy">
              {engResult.overallStrategy && (
                <p className="text-sm">{engResult.overallStrategy}</p>
              )}
              {engResult.hooks && (
                <div>
                  <p className="font-medium text-sm">Hooks</p>
                  {engResult.hooks.map((h: any, i: number) => (
                    <div key={i} className="text-sm p-2 bg-background rounded border mt-1">
                      <p className="font-medium">{h.type}</p>
                      <p className="text-muted-foreground">{h.example}</p>
                    </div>
                  ))}
                </div>
              )}
              {engResult.ctaRecommendations && (
                <div>
                  <p className="font-medium text-sm">CTA Recommendations</p>
                  <ul className="text-sm list-disc list-inside">
                    {engResult.ctaRecommendations.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </ToolCard>
    </div>
  );
}

export default function AiContentTeam() {
  const [activeTab, setActiveTab] = useState("suggestions");

  const { data: stats, isLoading: statsLoading } = useQuery<TeamStats>({
    queryKey: ["/api/ai-team/stats"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg leading-tight">AI Content Team</h1>
              <p className="text-xs text-muted-foreground">Medicine & Money Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-page-title">AI Content Team</h2>
              <p className="text-muted-foreground">Your AI-powered virtual content optimization team</p>
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5" data-testid="badge-active-status">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Active
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={AlertTriangle}
            value={stats?.pendingSuggestions ?? 0}
            label="Pending Suggestions"
            color="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
          />
          <StatCard
            icon={CheckCircle2}
            value={stats?.acceptedToday ?? 0}
            label="Accepted Today"
            color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          />
          <StatCard
            icon={MessageSquare}
            value={stats?.autoResponded ?? 0}
            label="Auto-Responded"
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
          />
          <StatCard
            icon={Zap}
            value={stats?.actionsThisWeek ?? 0}
            label="AI Actions This Week"
            color="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start mb-4" data-testid="tabs-ai-team">
            <TabsTrigger value="suggestions" className="flex items-center gap-1.5" data-testid="tab-suggestions">
              <Sparkles className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-1.5" data-testid="tab-automation">
              <Settings className="h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1.5" data-testid="tab-activity">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-1.5" data-testid="tab-tools">
              <Wrench className="h-4 w-4" />
              Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions">
            <SuggestionsTab />
          </TabsContent>
          <TabsContent value="automation">
            <AutomationTab />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTab />
          </TabsContent>
          <TabsContent value="tools">
            <ToolsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
