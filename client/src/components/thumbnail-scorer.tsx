import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Zap,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Target,
  Eye,
  Palette,
  Type,
  Layout,
  SmilePlus,
  Smartphone,
  Award,
  MousePointer,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface ScoreCategory {
  score: number;
  feedback: string;
}

interface ScoreData {
  overallScore: number;
  categories: {
    contrast: ScoreCategory;
    textReadability: ScoreCategory;
    composition: ScoreCategory;
    colorPsychology: ScoreCategory;
    facesAndEmotions: ScoreCategory;
    thumbnailClarity: ScoreCategory;
    brandConsistency: ScoreCategory;
    clickBait: ScoreCategory;
  };
  topImprovements: Array<{
    priority: number;
    category: string;
    action: string;
  }>;
  optimizationSuggestions: {
    textColor?: string | null;
    textSize?: string | null;
    backgroundColor?: string | null;
    addTextShadow?: boolean;
    addTextOutline?: boolean;
    increaseContrast?: boolean;
    suggestedTextOutlineColor?: string | null;
    suggestedOverlayOpacity?: number | null;
  };
}

interface ThumbnailScorerProps {
  getCanvasDataUrl: () => string | null;
  currentConfig: any;
  onConfigChange: (updater: (prev: any) => any) => void;
}

const categoryIcons: Record<string, any> = {
  contrast: Eye,
  textReadability: Type,
  composition: Layout,
  colorPsychology: Palette,
  facesAndEmotions: SmilePlus,
  thumbnailClarity: Smartphone,
  brandConsistency: Award,
  clickBait: MousePointer,
};

const categoryLabels: Record<string, string> = {
  contrast: "Contrast & Pop",
  textReadability: "Text Readability",
  composition: "Composition",
  colorPsychology: "Color Psychology",
  facesAndEmotions: "Faces & Emotions",
  thumbnailClarity: "Mobile Clarity",
  brandConsistency: "Brand Consistency",
  clickBait: "Click Appeal",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Great";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Poor";
}

function getProgressColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function ThumbnailScorer({ getCanvasDataUrl, currentConfig, onConfigChange }: ThumbnailScorerProps) {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [optimizeRound, setOptimizeRound] = useState(0);
  const { toast } = useToast();

  const handleScore = useCallback(async () => {
    const dataUrl = getCanvasDataUrl();
    if (!dataUrl) {
      toast({ title: "No Thumbnail", description: "Create a thumbnail first before scoring.", variant: "destructive" });
      return;
    }

    setIsScoring(true);
    try {
      const result = await apiRequest("POST", "/api/thumbnail/score", { imageDataUrl: dataUrl });
      const data = await result.json();
      if (data.error) throw new Error(data.error);
      setScoreData(data);
      setShowDetails(true);
      toast({ title: `Score: ${data.overallScore}/100`, description: getScoreLabel(data.overallScore) });
    } catch (error: any) {
      toast({ title: "Scoring Failed", description: error.message || "Could not score thumbnail.", variant: "destructive" });
    } finally {
      setIsScoring(false);
    }
  }, [getCanvasDataUrl, toast]);

  const handleOptimize = useCallback(async () => {
    const dataUrl = getCanvasDataUrl();
    if (!dataUrl) return;

    setIsOptimizing(true);
    try {
      const result = await apiRequest("POST", "/api/thumbnail/optimize", {
        imageDataUrl: dataUrl,
        currentConfig,
        scoreData,
      });
      const data = await result.json();
      if (data.error) throw new Error(data.error);

      if (data.changes) {
        onConfigChange((prev: any) => {
          const updated = { ...prev };

          const safeOverlayKeys = ["fontColor", "fontSize", "strokeColor", "strokeWidth", "textShadow", "fontWeight", "fontFamily", "x", "y"];

          if (data.changes.overlays && Array.isArray(data.changes.overlays)) {
            const newOverlays = [...(prev.overlays || [])];
            data.changes.overlays.forEach((change: any) => {
              if (!change || typeof change !== "object") return;
              const idx = change.id ? newOverlays.findIndex((o: any) => o.id === change.id) : -1;
              if (idx >= 0) {
                const safeChanges: any = {};
                for (const key of safeOverlayKeys) {
                  if (change[key] !== undefined) {
                    if (key === "fontSize" && (typeof change[key] !== "number" || change[key] < 8 || change[key] > 200)) continue;
                    if (key === "strokeWidth" && (typeof change[key] !== "number" || change[key] < 0 || change[key] > 20)) continue;
                    if ((key === "fontColor" || key === "strokeColor") && typeof change[key] !== "string") continue;
                    if (key === "fontWeight" && !["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"].includes(String(change[key]))) continue;
                    safeChanges[key] = change[key];
                  }
                }
                newOverlays[idx] = { ...newOverlays[idx], ...safeChanges };
              }
            });
            updated.overlays = newOverlays;
          }

          if (data.changes.backgroundColor && typeof data.changes.backgroundColor === "string") {
            updated.backgroundColor = data.changes.backgroundColor;
          }
          if (typeof data.changes.backgroundOpacity === "number") {
            updated.backgroundOpacity = Math.max(0, Math.min(100, data.changes.backgroundOpacity));
          }
          if (data.changes.accentColor && typeof data.changes.accentColor === "string") {
            const validAccents = ["orange", "blue", "purple"];
            if (validAccents.includes(data.changes.accentColor)) {
              updated.accentColor = data.changes.accentColor;
            }
          }

          return updated;
        });

        setOptimizeRound((r) => r + 1);
        toast({
          title: "Optimizations Applied",
          description: data.explanation || `Expected +${data.expectedScoreImprovement || "?"} points improvement. Re-score to see results!`,
        });
      }
    } catch (error: any) {
      console.error("Optimization error:", error);
      toast({ title: "Optimization Failed", description: error.message || "Could not optimize.", variant: "destructive" });
    } finally {
      setIsOptimizing(false);
    }
  }, [getCanvasDataUrl, currentConfig, scoreData, onConfigChange, toast]);

  return (
    <Card className="border-2 border-dashed border-primary/30" data-testid="thumbnail-scorer-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-primary" />
          AI Thumbnail Scorer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!scoreData ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Get an AI-powered score for your thumbnail with detailed feedback on what drives clicks.
            </p>
            <Button
              onClick={handleScore}
              disabled={isScoring}
              className="w-full"
              data-testid="button-score-thumbnail"
            >
              {isScoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Score My Thumbnail
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-bold ${getScoreColor(scoreData.overallScore)}`} data-testid="text-overall-score">
                  {scoreData.overallScore}
                </div>
                <div>
                  <div className="text-sm font-medium">/100</div>
                  <Badge variant={scoreData.overallScore >= 70 ? "default" : "secondary"} data-testid="badge-score-label">
                    {getScoreLabel(scoreData.overallScore)}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScore}
                  disabled={isScoring}
                  data-testid="button-rescore"
                >
                  {isScoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  data-testid="button-auto-optimize"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-1" />
                      Auto-Optimize
                    </>
                  )}
                </Button>
              </div>
            </div>

            {optimizeRound > 0 && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-md px-3 py-2" data-testid="text-optimize-round">
                <TrendingUp className="h-4 w-4" />
                {optimizeRound} optimization{optimizeRound > 1 ? "s" : ""} applied - click Re-score to see updated score
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">Overall Progress</div>
              <div className="relative h-3 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(scoreData.overallScore)}`}
                  style={{ width: `${scoreData.overallScore}%` }}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowDetails(!showDetails)}
              data-testid="button-toggle-details"
            >
              {showDetails ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>

            {showDetails && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {Object.entries(scoreData.categories).map(([key, cat]) => {
                    const Icon = categoryIcons[key] || Target;
                    return (
                      <div key={key} className="space-y-1" data-testid={`category-${key}`}>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{categoryLabels[key] || key}</span>
                          </div>
                          <span className={`font-semibold ${getScoreColor(cat.score)}`}>{cat.score}</span>
                        </div>
                        <div className="relative h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(cat.score)}`}
                            style={{ width: `${cat.score}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">{cat.feedback}</p>
                      </div>
                    );
                  })}
                </div>

                {scoreData.topImprovements && scoreData.topImprovements.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Top Improvements
                    </div>
                    <div className="space-y-2">
                      {scoreData.topImprovements.map((imp, i) => (
                        <div key={i} className="flex gap-2 text-sm bg-muted/50 rounded-md p-2" data-testid={`improvement-${i}`}>
                          <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0 text-xs shrink-0">
                            {imp.priority}
                          </Badge>
                          <div>
                            <span className="font-medium">{categoryLabels[imp.category] || imp.category}: </span>
                            <span className="text-muted-foreground">{imp.action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
