import { useState } from "react";
import { Link } from "wouter";
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

interface EvaluationResult {
  url: string;
  copyScore: number;
  seoScore: number;
  graphicsScore: number;
  overallScore: number;
  fifteenPs: PScore[];
  seo: SEOResult;
  graphics: GraphicsResult;
  copySummary: string;
  topPriorities: string[];
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

export function SiteEvaluatorPanel() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [rawHtml, setRawHtml] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "paste">("url");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

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
    } catch (error: any) {
      toast({ title: "Evaluation Failed", description: error.message || "Could not evaluate the website.", variant: "destructive" });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
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
              AI will evaluate your website copy against the 15 P's of Compelling Copy framework, analyze graphics/design, and audit SEO factors. This may take 30-60 seconds.
            </p>
          </CardContent>
        </Card>

        {isEvaluating && (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
              <p className="font-medium">Analyzing your website...</p>
              <p className="text-sm text-muted-foreground mt-1">Evaluating copy, graphics, and SEO. This takes about 30-60 seconds.</p>
            </CardContent>
          </Card>
        )}

        {result && (
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
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="text-center" data-testid="card-overall-score">
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
          </Tabs>
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
              <p className="text-xs text-muted-foreground">Copy · Graphics · SEO Analysis</p>
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