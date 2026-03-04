import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Search,
  FileText,
  BarChart3,
  Palette,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Target,
  TrendingUp,
  Eye,
  Type,
  Image,
  Link2,
  Shield,
  Zap,
  MessageSquare,
  RefreshCw,
  Download,
  Clock,
  Copy,
  Smartphone,
  Lock,
  Gauge,
  BookOpen,
  ClipboardList,
  Star,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  History,
  ExternalLink,
} from "lucide-react";

const FIFTEEN_PS = [
  { key: "problem", label: "Problem", description: "Does the copy clearly identify the problem the audience faces?" },
  { key: "promise", label: "Promise", description: "Is there a clear promise of what the audience will gain?" },
  { key: "picture", label: "Picture", description: "Does the copy paint a vivid picture of the desired outcome?" },
  { key: "proof", label: "Proof", description: "Is there social proof, testimonials, or evidence of results?" },
  { key: "proposition", label: "Proposition", description: "Is the unique value proposition clear and compelling?" },
  { key: "price", label: "Price", description: "Is pricing presented in a way that demonstrates value?" },
  { key: "push", label: "Push", description: "Is there urgency or scarcity that motivates immediate action?" },
  { key: "pullback", label: "Pull-Back", description: "Is there a risk-reversal (guarantee, free trial) that reduces hesitation?" },
  { key: "purpose", label: "Purpose", description: "Does the copy communicate a higher purpose or mission?" },
  { key: "personality", label: "Personality", description: "Does the brand voice come through with authenticity?" },
  { key: "proximity", label: "Proximity", description: "Does the copy make the audience feel understood and close?" },
  { key: "positioning", label: "Positioning", description: "Is the brand clearly differentiated from competitors?" },
  { key: "platform", label: "Platform", description: "Is the copy optimized for the platform it appears on?" },
  { key: "progression", label: "Progression", description: "Does the copy guide the reader through a logical journey?" },
  { key: "prestige", label: "Prestige", description: "Does the copy elevate the brand's authority and credibility?" },
];

interface PScore {
  key: string;
  score: number;
  analysis: string;
  suggestions: string[];
}

interface SEOResult {
  score: number;
  title: { present: boolean; optimized: boolean; text: string; suggestion: string };
  metaDescription: { present: boolean; optimized: boolean; text: string; suggestion: string };
  headings: { h1Count: number; h2Count: number; structure: string; suggestion: string };
  images: { total: number; withAlt: number; suggestion: string };
  links: { internal: number; external: number; suggestion: string };
  mobile: { responsive: boolean; suggestion: string };
  speed: { suggestion: string };
  schema: { present: boolean; suggestion: string };
  keywords: { found: string[]; suggestion: string };
  overallSuggestions: string[];
}

interface GraphicsResult {
  score: number;
  visualHierarchy: { score: number; analysis: string; suggestion: string };
  colorScheme: { score: number; analysis: string; suggestion: string };
  typography: { score: number; analysis: string; suggestion: string };
  imagery: { score: number; analysis: string; suggestion: string };
  whitespace: { score: number; analysis: string; suggestion: string };
  consistency: { score: number; analysis: string; suggestion: string };
  callToAction: { score: number; analysis: string; suggestion: string };
  overallSuggestions: string[];
}

interface CategorySubScore {
  score: number;
  analysis: string;
  suggestion: string;
}

interface PerformanceResult {
  score: number;
  loadSpeed: CategorySubScore;
  cdn: CategorySubScore;
  caching: CategorySubScore;
  codeOptimization: CategorySubScore;
  bundleSize: CategorySubScore;
  overallSuggestions: string[];
}

interface SecurityResult {
  score: number;
  https: CategorySubScore;
  authPatterns: CategorySubScore;
  headers: CategorySubScore;
  dataProtection: CategorySubScore;
  compliance: CategorySubScore;
  overallSuggestions: string[];
}

interface MobileResult {
  score: number;
  responsiveDesign: CategorySubScore;
  touchTargets: CategorySubScore;
  viewport: CategorySubScore;
  pwaIndicators: CategorySubScore;
  mobileFirst: CategorySubScore;
  overallSuggestions: string[];
}

interface ContentResult {
  score: number;
  readability: CategorySubScore;
  structure: CategorySubScore;
  freshness: CategorySubScore;
  documentationQuality: CategorySubScore;
  writingClarity: CategorySubScore;
  overallSuggestions: string[];
}

interface ActionPlanItem {
  priority: "high" | "medium" | "low";
  category: string;
  action: string;
  impact: string;
  effort: string;
}

interface ExecutiveSummaryResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  immediateActions: string[];
  longTermStrategy: string;
  nextSteps: string;
}

interface EvaluationResult {
  url: string;
  copyScore: number;
  seoScore: number;
  graphicsScore: number;
  performanceScore: number;
  securityScore: number;
  mobileScore: number;
  contentScore: number;
  overallScore: number;
  fifteenPs: PScore[];
  seo: SEOResult;
  graphics: GraphicsResult;
  performance: PerformanceResult;
  security: SecurityResult;
  mobile: MobileResult;
  content: ContentResult;
  actionPlan: ActionPlanItem[];
  executiveSummary: ExecutiveSummaryResult;
  copySummary: string;
  topPriorities: string[];
  proofId?: string;
  reviewId?: number;
}

interface ReviewListItem {
  id: number;
  url: string;
  status: string;
  scores: { overallScore: number; copyScore: number; seoScore: number; graphicsScore: number; performanceScore: number; securityScore: number; mobileScore: number; contentScore: number } | null;
  proofId: string;
  createdAt: string;
  completedAt: string | null;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
  if (score >= 40) return "bg-orange-100 dark:bg-orange-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 50) return "Needs Work";
  if (score >= 40) return "Below Average";
  return "Poor";
}

function getScoreIcon(score: number) {
  if (score >= 70) return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (score >= 50) return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
  return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
}

function getPriorityColor(priority: string) {
  if (priority === "high") return "text-red-600 dark:text-red-400";
  if (priority === "medium") return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function getPriorityBadgeVariant(priority: string): "destructive" | "secondary" | "default" {
  if (priority === "high") return "destructive";
  if (priority === "medium") return "secondary";
  return "default";
}

function ScoreGauge({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const radius = size === "lg" ? 60 : 36;
  const stroke = size === "lg" ? 8 : 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const svgSize = (radius + stroke) * 2;

  return (
    <div className="flex flex-col items-center gap-2" data-testid={`gauge-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted-foreground/20"
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={getScoreColor(score)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${size === "lg" ? "text-3xl" : "text-lg"} ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className={`font-medium ${size === "lg" ? "text-sm" : "text-xs"} text-muted-foreground`}>{label}</span>
    </div>
  );
}

const PROGRESS_STEPS = [
  { label: "Fetching content...", icon: Globe },
  { label: "Analyzing copy...", icon: Type },
  { label: "Checking SEO...", icon: Search },
  { label: "Evaluating design...", icon: Palette },
  { label: "Testing performance...", icon: Gauge },
  { label: "Reviewing security...", icon: Lock },
  { label: "Generating report...", icon: FileText },
];

function ProgressAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < PROGRESS_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 5000);
    return () => clearInterval(stepInterval);
  }, []);

  const progressPercent = Math.min(((currentStep + 1) / PROGRESS_STEPS.length) * 100, 95);

  return (
    <Card className="mb-8" data-testid="progress-animation">
      <CardContent className="py-8">
        <div className="text-center mb-6">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
          <p className="font-medium text-lg">Analyzing your website...</p>
          <p className="text-sm text-muted-foreground mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            {elapsed}s elapsed
          </p>
        </div>

        <Progress value={progressPercent} className="h-2 mb-6" />

        <div className="space-y-2">
          {PROGRESS_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === currentStep;
            const isDone = idx < currentStep;
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                  isActive ? "bg-primary/10" : isDone ? "opacity-60" : "opacity-30"
                }`}
                data-testid={`progress-step-${idx}`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <StepIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={`text-sm ${isActive ? "font-medium" : ""}`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function generateMarkdownReport(result: EvaluationResult): string {
  let md = `# Website Evaluation Report\n\n`;
  md += `**URL:** ${result.url}\n`;
  md += `**Overall Score:** ${result.overallScore}/100 (${getScoreLabel(result.overallScore)})\n\n`;

  if (result.proofId) {
    md += `**Proof ID:** ${result.proofId}\n\n`;
  }

  md += `---\n\n## Executive Summary\n\n`;
  if (result.executiveSummary) {
    md += `${result.executiveSummary.summary}\n\n`;
    md += `### Strengths\n`;
    result.executiveSummary.strengths?.forEach((s) => { md += `- ${s}\n`; });
    md += `\n### Weaknesses\n`;
    result.executiveSummary.weaknesses?.forEach((w) => { md += `- ${w}\n`; });
    md += `\n### Immediate Actions\n`;
    result.executiveSummary.immediateActions?.forEach((a) => { md += `- ${a}\n`; });
    md += `\n### Long-Term Strategy\n${result.executiveSummary.longTermStrategy}\n\n`;
    md += `### Next Steps\n${result.executiveSummary.nextSteps}\n\n`;
  }

  md += `---\n\n## Scores Overview\n\n`;
  md += `| Category | Score |\n|----------|-------|\n`;
  md += `| Copy (15 P's) | ${result.copyScore}/100 |\n`;
  md += `| SEO | ${result.seoScore}/100 |\n`;
  md += `| Graphics | ${result.graphicsScore}/100 |\n`;
  md += `| Performance | ${result.performanceScore ?? "N/A"}/100 |\n`;
  md += `| Security | ${result.securityScore ?? "N/A"}/100 |\n`;
  md += `| Mobile | ${result.mobileScore ?? "N/A"}/100 |\n`;
  md += `| Content | ${result.contentScore ?? "N/A"}/100 |\n\n`;

  md += `---\n\n## 15 P's of Compelling Copy\n\n`;
  md += `**Copy Score:** ${result.copyScore}/100\n\n`;
  md += `${result.copySummary}\n\n`;
  result.fifteenPs?.forEach((p) => {
    const pDef = FIFTEEN_PS.find((d) => d.key === p.key);
    md += `### ${pDef?.label || p.key} - ${p.score}/100\n`;
    md += `${p.analysis}\n`;
    if (p.suggestions.length > 0) {
      md += `**Suggestions:**\n`;
      p.suggestions.forEach((s) => { md += `- ${s}\n`; });
    }
    md += `\n`;
  });

  md += `---\n\n## Action Plan\n\n`;
  if (result.actionPlan?.length) {
    md += `| Priority | Category | Action | Impact | Effort |\n|----------|----------|--------|--------|--------|\n`;
    result.actionPlan.forEach((item) => {
      md += `| ${item.priority} | ${item.category} | ${item.action} | ${item.impact} | ${item.effort} |\n`;
    });
    md += `\n`;
  }

  md += `---\n\n## Top Priorities\n\n`;
  result.topPriorities?.forEach((p, i) => { md += `${i + 1}. ${p}\n`; });

  return md;
}

function downloadMarkdown(result: EvaluationResult) {
  const md = generateMarkdownReport(result);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const domain = result.url ? new URL(result.url.startsWith("http") ? result.url : `https://${result.url}`).hostname : "evaluation";
  a.download = `${domain}-evaluation-report.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CategoryAnalysisTab({
  title,
  icon: Icon,
  score,
  subcategories,
  overallSuggestions,
}: {
  title: string;
  icon: any;
  score: number;
  subcategories: { key: string; label: string; icon: any; data: CategorySubScore }[];
  overallSuggestions: string[];
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium">{title} Score:</span>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}/100</span>
            <Badge className={getScoreBg(score)}>{getScoreLabel(score)}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subcategories.map(({ key, label, icon: SubIcon, data }) => (
          <Card key={key} data-testid={`${title.toLowerCase()}-${key}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SubIcon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{label}</h3>
                </div>
                <span className={`text-lg font-bold ${getScoreColor(data?.score ?? 0)}`}>{data?.score ?? 0}/100</span>
              </div>
              <Progress value={data?.score ?? 0} className="h-2 mb-3" />
              <p className="text-sm mb-2">{data?.analysis}</p>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Sparkles className="h-3 w-3 shrink-0 mt-0.5" />
                  {data?.suggestion}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {overallSuggestions?.length > 0 && (
        <Card data-testid={`${title.toLowerCase()}-suggestions`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5" />
              {title} Improvement Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {overallSuggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function SiteEvaluatorPanel() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [rawHtml, setRawHtml] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "paste">("url");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showHistory, setShowHistory] = useState(false);

  const { data: reviews, isLoading: reviewsLoading } = useQuery<ReviewListItem[]>({
    queryKey: ["/api/site-evaluator/reviews"],
    enabled: showHistory,
  });

  const handleEvaluate = async () => {
    const input = inputMode === "url" ? url.trim() : rawHtml.trim();
    if (!input) {
      toast({ title: "Enter a URL or paste content", description: "Provide a website URL or paste the page HTML/text to evaluate.", variant: "destructive" });
      return;
    }

    setIsEvaluating(true);
    setResult(null);

    try {
      const res = await apiRequest("POST", "/api/site-evaluator/evaluate", {
        url: inputMode === "url" ? input : undefined,
        rawContent: inputMode === "paste" ? input : undefined,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setActiveTab("overview");
      toast({ title: `Overall Score: ${data.overallScore}/100`, description: getScoreLabel(data.overallScore) });
      queryClient.invalidateQueries({ queryKey: ["/api/site-evaluator/reviews"] });
    } catch (error: any) {
      toast({ title: "Evaluation Failed", description: error.message || "Could not evaluate the website.", variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
  };

  const loadReview = async (id: number) => {
    try {
      const res = await apiRequest("GET", `/api/site-evaluator/review/${id}`);
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
        setActiveTab("overview");
        setShowHistory(false);
      }
    } catch {
      toast({ title: "Failed to load review", variant: "destructive" });
    }
  };

  const copyProofLink = () => {
    if (!result?.proofId) return;
    const proofUrl = `${window.location.origin}/site-evaluator/proof/${result.proofId}`;
    navigator.clipboard.writeText(proofUrl);
    toast({ title: "Link copied!", description: "Share this link to show your evaluation results." });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            data-testid="button-toggle-history"
          >
            <History className="h-4 w-4 mr-1" />
            {showHistory ? "Hide History" : "Review History"}
          </Button>
          {result && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMarkdown(result)}
              data-testid="button-download-report"
            >
              <Download className="h-4 w-4 mr-1" />
              Download Report
            </Button>
          )}
        </div>
      </div>

      {showHistory && (
        <Card className="mb-8" data-testid="review-history-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Review History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reviews && reviews.length > 0 ? (
              <div className="space-y-2">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border hover-elevate cursor-pointer"
                    onClick={() => loadReview(review.id)}
                    data-testid={`review-history-item-${review.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{review.url}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()} &middot; {review.proofId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-lg font-bold ${getScoreColor(review.scores?.overallScore ?? 0)}`}>{review.scores?.overallScore ?? "—"}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No reviews yet. Evaluate a website to get started.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-8" data-testid="evaluation-input-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Evaluate a Website
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={inputMode === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("url")}
              data-testid="button-mode-url"
            >
              <Globe className="h-4 w-4 mr-1" />
              Enter URL
            </Button>
            <Button
              variant={inputMode === "paste" ? "default" : "outline"}
              size="sm"
              onClick={() => setInputMode("paste")}
              data-testid="button-mode-paste"
            >
              <FileText className="h-4 w-4 mr-1" />
              Paste Content
            </Button>
          </div>

          {inputMode === "url" ? (
            <div className="flex gap-3">
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEvaluate()}
                className="flex-1"
                data-testid="input-url"
              />
              <Button
                onClick={handleEvaluate}
                disabled={isEvaluating}
                className="min-w-[140px]"
                data-testid="button-evaluate"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Evaluate
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Paste the website HTML or text content here..."
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                rows={6}
                data-testid="textarea-raw-content"
              />
              <Button
                onClick={handleEvaluate}
                disabled={isEvaluating}
                className="w-full"
                data-testid="button-evaluate-paste"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Evaluate Content
                  </>
                )}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            AI will evaluate your website across 7 categories: Copy (15 P's), SEO, Graphics, Performance, Security, Mobile, and Content. This may take 30-60 seconds.
          </p>
        </CardContent>
      </Card>

      {isEvaluating && <ProgressAnimation />}

      {result && (
        <>
          {result.proofId && (
            <Card className="mb-6" data-testid="proof-id-card">
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Proof ID: <span className="font-mono" data-testid="text-proof-id">{result.proofId}</span></p>
                      <p className="text-xs text-muted-foreground">Share this unique ID to verify your evaluation results</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyProofLink}
                    data-testid="button-copy-proof-link"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Share Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex flex-wrap gap-1" data-testid="evaluation-tabs">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <BarChart3 className="h-4 w-4 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="copy" data-testid="tab-copy">
                <Type className="h-4 w-4 mr-1" />
                15 P's Copy
              </TabsTrigger>
              <TabsTrigger value="seo" data-testid="tab-seo">
                <Search className="h-4 w-4 mr-1" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="graphics" data-testid="tab-graphics">
                <Image className="h-4 w-4 mr-1" />
                Graphics
              </TabsTrigger>
              <TabsTrigger value="performance" data-testid="tab-performance">
                <Gauge className="h-4 w-4 mr-1" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="security" data-testid="tab-security">
                <Lock className="h-4 w-4 mr-1" />
                Security
              </TabsTrigger>
              <TabsTrigger value="mobile" data-testid="tab-mobile">
                <Smartphone className="h-4 w-4 mr-1" />
                Mobile
              </TabsTrigger>
              <TabsTrigger value="content" data-testid="tab-content">
                <BookOpen className="h-4 w-4 mr-1" />
                Content
              </TabsTrigger>
              <TabsTrigger value="actionplan" data-testid="tab-actionplan">
                <ClipboardList className="h-4 w-4 mr-1" />
                Action Plan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="text-center col-span-2 md:col-span-1" data-testid="card-overall-score">
                    <CardContent className="pt-6">
                      <div className="relative inline-flex">
                        <ScoreGauge score={result.overallScore} label="Overall" />
                      </div>
                      <Badge className={`mt-2 ${getScoreBg(result.overallScore)}`}>
                        {getScoreLabel(result.overallScore)}
                      </Badge>
                    </CardContent>
                  </Card>
                  {[
                    { label: "Copy (15 P's)", score: result.copyScore, icon: Type },
                    { label: "SEO", score: result.seoScore, icon: Search },
                    { label: "Graphics", score: result.graphicsScore, icon: Palette },
                    { label: "Performance", score: result.performanceScore ?? 0, icon: Gauge },
                    { label: "Security", score: result.securityScore ?? 0, icon: Lock },
                    { label: "Mobile", score: result.mobileScore ?? 0, icon: Smartphone },
                    { label: "Content", score: result.contentScore ?? 0, icon: BookOpen },
                  ].map(({ label, score, icon: Icon }) => (
                    <Card key={label} className="text-center" data-testid={`card-score-${label.toLowerCase().replace(/[^a-z]/g, "")}`}>
                      <CardContent className="pt-6">
                        <div className="relative inline-flex">
                          <ScoreGauge score={score} label={label} size="sm" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {result.executiveSummary && (
                  <Card data-testid="card-executive-summary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Star className="h-5 w-5" />
                        Executive Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-relaxed">{result.executiveSummary.summary}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.executiveSummary.strengths?.length > 0 && (
                          <div className="space-y-2" data-testid="executive-strengths">
                            <h4 className="text-sm font-semibold flex items-center gap-1">
                              <ThumbsUp className="h-4 w-4 text-green-500" />
                              Strengths
                            </h4>
                            <ul className="space-y-1">
                              {result.executiveSummary.strengths.map((s, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-1" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {result.executiveSummary.weaknesses?.length > 0 && (
                          <div className="space-y-2" data-testid="executive-weaknesses">
                            <h4 className="text-sm font-semibold flex items-center gap-1">
                              <ThumbsDown className="h-4 w-4 text-red-500" />
                              Weaknesses
                            </h4>
                            <ul className="space-y-1">
                              {result.executiveSummary.weaknesses.map((w, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-1" />
                                  {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {result.executiveSummary.immediateActions?.length > 0 && (
                        <div data-testid="executive-immediate-actions">
                          <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            Immediate Actions
                          </h4>
                          <ul className="space-y-1">
                            {result.executiveSummary.immediateActions.map((a, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-1" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.executiveSummary.longTermStrategy && (
                        <div data-testid="executive-long-term">
                          <h4 className="text-sm font-semibold mb-1">Long-Term Strategy</h4>
                          <p className="text-sm text-muted-foreground">{result.executiveSummary.longTermStrategy}</p>
                        </div>
                      )}

                      {result.executiveSummary.nextSteps && (
                        <div data-testid="executive-next-steps">
                          <h4 className="text-sm font-semibold mb-1">Next Steps</h4>
                          <p className="text-sm text-muted-foreground">{result.executiveSummary.nextSteps}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card data-testid="card-summary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-5 w-5" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{result.copySummary}</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-priorities">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-5 w-5" />
                      Top Priorities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {result.topPriorities.map((priority, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <Badge variant="outline" className="shrink-0 mt-0.5">{idx + 1}</Badge>
                          <span>{priority}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="card-15p-overview">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-5 w-5" />
                      15 P's Snapshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {result.fifteenPs.map((p) => {
                        const pDef = FIFTEEN_PS.find((d) => d.key === p.key);
                        return (
                          <div
                            key={p.key}
                            className={`p-3 rounded-lg border text-center ${getScoreBg(p.score)}`}
                            data-testid={`p-snapshot-${p.key}`}
                          >
                            <div className={`text-xl font-bold ${getScoreColor(p.score)}`}>{p.score}</div>
                            <div className="text-xs font-medium mt-1">{pDef?.label || p.key}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="copy">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      15 P's of Compelling Copy Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Based on the Brand Builders Group framework, each "P" is scored 0-100 to measure how effectively the copy addresses that dimension.
                    </p>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-sm font-medium">Overall Copy Score:</span>
                      <span className={`text-2xl font-bold ${getScoreColor(result.copyScore)}`}>{result.copyScore}/100</span>
                      <Badge className={getScoreBg(result.copyScore)}>{getScoreLabel(result.copyScore)}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <ScrollArea className="h-auto">
                  <div className="space-y-3">
                    {result.fifteenPs.map((p) => {
                      const pDef = FIFTEEN_PS.find((d) => d.key === p.key);
                      return (
                        <Card key={p.key} data-testid={`card-p-${p.key}`}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                {getScoreIcon(p.score)}
                                <div>
                                  <h3 className="font-semibold">{pDef?.label || p.key}</h3>
                                  <p className="text-xs text-muted-foreground">{pDef?.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${getScoreColor(p.score)}`}>{p.score}</span>
                                <span className="text-sm text-muted-foreground">/100</span>
                              </div>
                            </div>
                            <Progress value={p.score} className="h-2 mb-3" />
                            <p className="text-sm mb-3">{p.analysis}</p>
                            {p.suggestions.length > 0 && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Suggestions
                                </p>
                                <ul className="space-y-1">
                                  {p.suggestions.map((s, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                      <span className="text-primary mt-0.5">•</span>
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="seo">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      SEO Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm font-medium">SEO Score:</span>
                      <span className={`text-2xl font-bold ${getScoreColor(result.seoScore)}`}>{result.seoScore}/100</span>
                      <Badge className={getScoreBg(result.seoScore)}>{getScoreLabel(result.seoScore)}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card data-testid="seo-title">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        {result.seo.title.optimized ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        <h3 className="font-semibold text-sm">Title Tag</h3>
                        <Badge variant={result.seo.title.present ? "default" : "destructive"} className="text-xs">
                          {result.seo.title.present ? "Present" : "Missing"}
                        </Badge>
                      </div>
                      {result.seo.title.text && <p className="text-xs bg-muted/50 p-2 rounded mb-2 font-mono">{result.seo.title.text}</p>}
                      <p className="text-xs text-muted-foreground">{result.seo.title.suggestion}</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="seo-meta">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        {result.seo.metaDescription.optimized ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        <h3 className="font-semibold text-sm">Meta Description</h3>
                        <Badge variant={result.seo.metaDescription.present ? "default" : "destructive"} className="text-xs">
                          {result.seo.metaDescription.present ? "Present" : "Missing"}
                        </Badge>
                      </div>
                      {result.seo.metaDescription.text && <p className="text-xs bg-muted/50 p-2 rounded mb-2">{result.seo.metaDescription.text}</p>}
                      <p className="text-xs text-muted-foreground">{result.seo.metaDescription.suggestion}</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="seo-headings">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Type className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">Heading Structure</h3>
                      </div>
                      <div className="flex gap-3 mb-2">
                        <Badge variant="outline">H1: {result.seo.headings.h1Count}</Badge>
                        <Badge variant="outline">H2: {result.seo.headings.h2Count}</Badge>
                      </div>
                      <p className="text-xs mb-1">{result.seo.headings.structure}</p>
                      <p className="text-xs text-muted-foreground">{result.seo.headings.suggestion}</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="seo-images">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">Images</h3>
                      </div>
                      <div className="flex gap-3 mb-2">
                        <Badge variant="outline">Total: {result.seo.images.total}</Badge>
                        <Badge variant={result.seo.images.total === result.seo.images.withAlt ? "default" : "secondary"}>
                          Alt text: {result.seo.images.withAlt}/{result.seo.images.total}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.seo.images.suggestion}</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="seo-links">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">Links</h3>
                      </div>
                      <div className="flex gap-3 mb-2">
                        <Badge variant="outline">Internal: {result.seo.links.internal}</Badge>
                        <Badge variant="outline">External: {result.seo.links.external}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.seo.links.suggestion}</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="seo-keywords">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">Keywords</h3>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {result.seo.keywords.found.map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{result.seo.keywords.suggestion}</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="seo-mobile">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        {result.seo.mobile.responsive ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        <h3 className="font-semibold text-sm">Mobile Responsiveness</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.seo.mobile.suggestion}</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="seo-schema">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        {result.seo.schema.present ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        <h3 className="font-semibold text-sm">Structured Data / Schema</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.seo.schema.suggestion}</p>
                    </CardContent>
                  </Card>
                </div>

                {result.seo.overallSuggestions.length > 0 && (
                  <Card data-testid="seo-suggestions">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-5 w-5" />
                        SEO Improvement Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.seo.overallSuggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="graphics">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Graphics & Design Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm font-medium">Graphics Score:</span>
                      <span className={`text-2xl font-bold ${getScoreColor(result.graphicsScore)}`}>{result.graphicsScore}/100</span>
                      <Badge className={getScoreBg(result.graphicsScore)}>{getScoreLabel(result.graphicsScore)}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: "visualHierarchy", label: "Visual Hierarchy", icon: Eye, data: result.graphics.visualHierarchy },
                    { key: "colorScheme", label: "Color Scheme", icon: Palette, data: result.graphics.colorScheme },
                    { key: "typography", label: "Typography", icon: Type, data: result.graphics.typography },
                    { key: "imagery", label: "Imagery & Photos", icon: Image, data: result.graphics.imagery },
                    { key: "whitespace", label: "Whitespace & Layout", icon: Zap, data: result.graphics.whitespace },
                    { key: "consistency", label: "Design Consistency", icon: Shield, data: result.graphics.consistency },
                    { key: "callToAction", label: "Call-to-Action Design", icon: Target, data: result.graphics.callToAction },
                  ].map(({ key, label, icon: Icon, data }) => (
                    <Card key={key} data-testid={`graphics-${key}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">{label}</h3>
                          </div>
                          <span className={`text-lg font-bold ${getScoreColor(data.score)}`}>{data.score}/100</span>
                        </div>
                        <Progress value={data.score} className="h-2 mb-3" />
                        <p className="text-sm mb-2">{data.analysis}</p>
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground flex items-start gap-1">
                            <Sparkles className="h-3 w-3 shrink-0 mt-0.5" />
                            {data.suggestion}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {result.graphics.overallSuggestions.length > 0 && (
                  <Card data-testid="graphics-suggestions">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-5 w-5" />
                        Design Improvement Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.graphics.overallSuggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="performance">
              {result.performance && (
                <CategoryAnalysisTab
                  title="Performance"
                  icon={Gauge}
                  score={result.performanceScore ?? 0}
                  subcategories={[
                    { key: "loadSpeed", label: "Load Speed", icon: Zap, data: result.performance.loadSpeed },
                    { key: "cdn", label: "CDN Usage", icon: Globe, data: result.performance.cdn },
                    { key: "caching", label: "Caching", icon: RefreshCw, data: result.performance.caching },
                    { key: "codeOptimization", label: "Code Optimization", icon: FileText, data: result.performance.codeOptimization },
                    { key: "bundleSize", label: "Bundle Size", icon: Target, data: result.performance.bundleSize },
                  ]}
                  overallSuggestions={result.performance.overallSuggestions || []}
                />
              )}
            </TabsContent>

            <TabsContent value="security">
              {result.security && (
                <CategoryAnalysisTab
                  title="Security"
                  icon={Lock}
                  score={result.securityScore ?? 0}
                  subcategories={[
                    { key: "https", label: "HTTPS", icon: Lock, data: result.security.https },
                    { key: "authPatterns", label: "Auth Patterns", icon: Shield, data: result.security.authPatterns },
                    { key: "headers", label: "Security Headers", icon: FileText, data: result.security.headers },
                    { key: "dataProtection", label: "Data Protection", icon: Eye, data: result.security.dataProtection },
                    { key: "compliance", label: "Compliance", icon: CheckCircle2, data: result.security.compliance },
                  ]}
                  overallSuggestions={result.security.overallSuggestions || []}
                />
              )}
            </TabsContent>

            <TabsContent value="mobile">
              {result.mobile && (
                <CategoryAnalysisTab
                  title="Mobile"
                  icon={Smartphone}
                  score={result.mobileScore ?? 0}
                  subcategories={[
                    { key: "responsiveDesign", label: "Responsive Design", icon: Smartphone, data: result.mobile.responsiveDesign },
                    { key: "touchTargets", label: "Touch Targets", icon: Target, data: result.mobile.touchTargets },
                    { key: "viewport", label: "Viewport", icon: Eye, data: result.mobile.viewport },
                    { key: "pwaIndicators", label: "PWA Indicators", icon: Zap, data: result.mobile.pwaIndicators },
                    { key: "mobileFirst", label: "Mobile-First", icon: TrendingUp, data: result.mobile.mobileFirst },
                  ]}
                  overallSuggestions={result.mobile.overallSuggestions || []}
                />
              )}
            </TabsContent>

            <TabsContent value="content">
              {result.content && (
                <CategoryAnalysisTab
                  title="Content"
                  icon={BookOpen}
                  score={result.contentScore ?? 0}
                  subcategories={[
                    { key: "readability", label: "Readability", icon: Eye, data: result.content.readability },
                    { key: "structure", label: "Structure", icon: FileText, data: result.content.structure },
                    { key: "freshness", label: "Freshness", icon: RefreshCw, data: result.content.freshness },
                    { key: "documentationQuality", label: "Documentation Quality", icon: BookOpen, data: result.content.documentationQuality },
                    { key: "writingClarity", label: "Writing Clarity", icon: Type, data: result.content.writingClarity },
                  ]}
                  overallSuggestions={result.content.overallSuggestions || []}
                />
              )}
            </TabsContent>

            <TabsContent value="actionplan">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Action Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Prioritized list of actions to improve your website, sorted by impact and effort.
                    </p>
                  </CardContent>
                </Card>

                {result.actionPlan?.length > 0 ? (
                  <Card data-testid="action-plan-table">
                    <CardContent className="pt-6">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 pr-4 font-medium">Priority</th>
                              <th className="text-left py-2 pr-4 font-medium">Category</th>
                              <th className="text-left py-2 pr-4 font-medium">Action</th>
                              <th className="text-left py-2 pr-4 font-medium">Impact</th>
                              <th className="text-left py-2 font-medium">Effort</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.actionPlan.map((item, idx) => (
                              <tr key={idx} className="border-b last:border-b-0" data-testid={`action-plan-row-${idx}`}>
                                <td className="py-3 pr-4">
                                  <Badge variant={getPriorityBadgeVariant(item.priority)}>
                                    {item.priority}
                                  </Badge>
                                </td>
                                <td className="py-3 pr-4 font-medium">{item.category}</td>
                                <td className="py-3 pr-4">{item.action}</td>
                                <td className="py-3 pr-4 text-muted-foreground">{item.impact}</td>
                                <td className="py-3 text-muted-foreground">{item.effort}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No action plan items available.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

export default function SiteEvaluatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">Website Evaluator</h1>
              <p className="text-xs text-muted-foreground">Copy · Graphics · SEO · Performance · Security · Mobile · Content</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <SiteEvaluatorPanel />
      </div>
    </div>
  );
}

export function ProofViewer({ proofId }: { proofId: string }) {
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/site-evaluator/proof/${proofId}`)
      .then(res => {
        if (!res.ok) throw new Error("Proof not found");
        return res.json();
      })
      .then(data => setReview(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [proofId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full" data-testid="proof-error">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Proof Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || "This proof ID does not exist or has been removed."}</p>
            <Link href="/">
              <Button data-testid="button-go-home">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scores = review.scores || {};

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-proof-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">Verification Certificate</h1>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="mb-6" data-testid="proof-certificate">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Website Analysis Certificate</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">Independent evaluation verified</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Analyzed URL</p>
              <p className="font-medium text-lg" data-testid="proof-url">{review.url}</p>
            </div>

            <Separator />

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
              <ScoreGauge score={scores.overallScore ?? 0} label="Overall" />
              <Badge className={`mt-3 ${getScoreBg(scores.overallScore ?? 0)}`}>
                {getScoreLabel(scores.overallScore ?? 0)}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Copy", score: scores.copyScore },
                { label: "SEO", score: scores.seoScore },
                { label: "Graphics", score: scores.graphicsScore },
                { label: "Performance", score: scores.performanceScore },
                { label: "Security", score: scores.securityScore },
                { label: "Mobile", score: scores.mobileScore },
                { label: "Content", score: scores.contentScore },
              ].map(({ label, score }) => (
                <div key={label} className="text-center" data-testid={`proof-score-${label.toLowerCase()}`}>
                  <p className={`text-2xl font-bold ${getScoreColor(score ?? 0)}`}>{score ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>Proof ID: <span className="font-mono font-medium" data-testid="proof-id-display">{review.proofId}</span></p>
              <p>Analyzed: {new Date(review.createdAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
