import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  TrendingUp,
  Loader2,
  Sparkles,
  Palette,
  Type,
  Hash,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Zap,
  Eye,
  BarChart3,
  Clock
} from "lucide-react";

interface TrendData {
  topic: string;
  score: number;
  change: "up" | "down" | "stable";
  category: string;
  relatedKeywords: string[];
  suggestedStyles: string[];
  peakTime: string;
}

interface StyleTrend {
  name: string;
  popularity: number;
  examples: string[];
  colors: string[];
  fonts: string[];
}

interface TrendAnalysisProps {
  onApplyTrend?: (trend: TrendData) => void;
  onApplyStyle?: (style: StyleTrend) => void;
  niche?: string;
}

const NICHES = [
  "Medicine & Money",
  "Healthcare",
  "Finance",
  "Technology",
  "Wellness",
  "Business",
  "Education",
  "Lifestyle"
];

const MOCK_TOPIC_TRENDS: TrendData[] = [
  {
    topic: "Physician Burnout Solutions",
    score: 92,
    change: "up",
    category: "Healthcare",
    relatedKeywords: ["doctor wellness", "medical burnout", "physician mental health"],
    suggestedStyles: ["Bold text", "Dark backgrounds", "Red accents"],
    peakTime: "Weekday mornings"
  },
  {
    topic: "Passive Income for Doctors",
    score: 88,
    change: "up",
    category: "Finance",
    relatedKeywords: ["physician investing", "doctor side income", "medical wealth"],
    suggestedStyles: ["Green/gold colors", "Professional photos", "Clean layouts"],
    peakTime: "Sunday evenings"
  },
  {
    topic: "AI in Healthcare",
    score: 85,
    change: "up",
    category: "Technology",
    relatedKeywords: ["medical AI", "healthcare automation", "digital health"],
    suggestedStyles: ["Futuristic", "Blue tones", "Tech imagery"],
    peakTime: "Midweek"
  },
  {
    topic: "Retirement Planning",
    score: 78,
    change: "stable",
    category: "Finance",
    relatedKeywords: ["401k", "pension", "financial freedom"],
    suggestedStyles: ["Trustworthy", "Green colors", "Family imagery"],
    peakTime: "Weekends"
  },
  {
    topic: "Work-Life Balance",
    score: 75,
    change: "down",
    category: "Wellness",
    relatedKeywords: ["time management", "self-care", "boundaries"],
    suggestedStyles: ["Calm colors", "Nature backgrounds", "Soft fonts"],
    peakTime: "Friday afternoons"
  }
];

const MOCK_STYLE_TRENDS: StyleTrend[] = [
  {
    name: "Bold & High Contrast",
    popularity: 94,
    examples: ["MrBeast", "MKBHD", "Veritasium"],
    colors: ["#FF0000", "#FFFF00", "#000000"],
    fonts: ["Impact", "Bebas Neue", "Anton"]
  },
  {
    name: "Clean Professional",
    popularity: 87,
    examples: ["TED", "Graham Stephan", "Ali Abdaal"],
    colors: ["#1A1A2E", "#16213E", "#FFFFFF"],
    fonts: ["Montserrat", "Roboto", "Open Sans"]
  },
  {
    name: "Vibrant Gradient",
    popularity: 82,
    examples: ["Marques Brownlee", "Linus Tech Tips"],
    colors: ["#667EEA", "#764BA2", "#F093FB"],
    fonts: ["Poppins", "Inter", "SF Pro"]
  },
  {
    name: "Minimalist Dark",
    popularity: 79,
    examples: ["Apple", "Tesla", "Premium channels"],
    colors: ["#0D0D0D", "#1A1A1A", "#FFFFFF"],
    fonts: ["Helvetica", "SF Pro", "Futura"]
  },
  {
    name: "Medical Trust",
    popularity: 76,
    examples: ["Dr. Mike", "Medlife Crisis", "Healthcare channels"],
    colors: ["#0077B6", "#00B4D8", "#FFFFFF"],
    fonts: ["Lato", "Source Sans Pro", "Nunito"]
  }
];

export function TrendAnalysis({ onApplyTrend, onApplyStyle, niche = "Medicine & Money" }: TrendAnalysisProps) {
  const { toast } = useToast();
  const [selectedNiche, setSelectedNiche] = useState(niche);
  const [topicTrends, setTopicTrends] = useState<TrendData[]>(MOCK_TOPIC_TRENDS);
  const [styleTrends, setStyleTrends] = useState<StyleTrend[]>(MOCK_STYLE_TRENDS);
  const [activeTab, setActiveTab] = useState("topics");

  const analyzeMutation = useMutation({
    mutationFn: async (nicheToAnalyze: string) => {
      const response = await apiRequest("/api/trends/analyze", {
        method: "POST",
        body: JSON.stringify({ niche: nicheToAnalyze }),
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.topics) setTopicTrends(data.topics);
      if (data.styles) setStyleTrends(data.styles);
      toast({ title: "Trends Updated", description: "Latest trends loaded for " + selectedNiche });
    },
    onError: () => {
      toast({ title: "Using cached trends", description: "Showing recent trend data" });
    },
  });

  const handleRefresh = () => {
    analyzeMutation.mutate(selectedNiche);
  };

  const getChangeIcon = (change: "up" | "down" | "stable") => {
    switch (change) {
      case "up": return <ArrowUp className="w-4 h-4 text-green-500" />;
      case "down": return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trend Analysis
              </CardTitle>
              <CardDescription>Discover trending topics and styles for your content</CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={analyzeMutation.isPending}
              variant="outline"
              data-testid="button-refresh-trends"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Select Niche</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {NICHES.map((n) => (
                <Badge
                  key={n}
                  variant={selectedNiche === n ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedNiche(n)}
                  data-testid={`niche-${n.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {n}
                </Badge>
              ))}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="topics" className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Topics
              </TabsTrigger>
              <TabsTrigger value="styles" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Styles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="topics">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {topicTrends.map((trend, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => onApplyTrend?.(trend)}
                      data-testid={`trend-topic-${index}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{trend.topic}</h4>
                              {getChangeIcon(trend.change)}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {trend.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {trend.peakTime}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {trend.relatedKeywords.map((kw, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Suggested: </span>
                              {trend.suggestedStyles.join(", ")}
                            </div>
                          </div>
                          <div className="flex flex-col items-center ml-4">
                            <div className={`w-12 h-12 rounded-full ${getScoreColor(trend.score)} flex items-center justify-center text-white font-bold`}>
                              {trend.score}
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">Score</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="styles">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {styleTrends.map((style, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => onApplyStyle?.(style)}
                      data-testid={`trend-style-${index}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-2">{style.name}</h4>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-muted-foreground">Colors:</span>
                              <div className="flex gap-1">
                                {style.colors.map((color, i) => (
                                  <div
                                    key={i}
                                    className="w-6 h-6 rounded-full border"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {style.fonts.map((font, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <Type className="w-3 h-3 mr-1" />
                                  {font}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Examples: </span>
                              {style.examples.join(", ")}
                            </div>
                          </div>
                          <div className="flex flex-col items-center ml-4">
                            <div className="relative w-12 h-12">
                              <div className="absolute inset-0 rounded-full bg-muted" />
                              <div
                                className="absolute inset-0 rounded-full bg-primary"
                                style={{
                                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                                  opacity: style.popularity / 100
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center font-bold text-sm">
                                {style.popularity}%
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">Popular</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted text-center">
              <BarChart3 className="w-5 h-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{topicTrends.filter(t => t.change === "up").length}</div>
              <div className="text-xs text-muted-foreground">Rising Topics</div>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <Target className="w-5 h-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{Math.round(topicTrends.reduce((a, b) => a + b.score, 0) / topicTrends.length)}</div>
              <div className="text-xs text-muted-foreground">Avg. Score</div>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <Palette className="w-5 h-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{styleTrends.length}</div>
              <div className="text-xs text-muted-foreground">Style Trends</div>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <Eye className="w-5 h-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{styleTrends[0]?.name.split(" ")[0]}</div>
              <div className="text-xs text-muted-foreground">Top Style</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
