import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Zap,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Target,
  TrendingUp,
  MessageSquare,
  Star
} from "lucide-react";

interface GeneratedHook {
  text: string;
  score: number;
  type: string;
  emotion: string;
  reasoning: string;
}

interface ViralHookGeneratorProps {
  onSelectHook?: (hook: string) => void;
}

const HOOK_TYPES = [
  { id: "curiosity", name: "Curiosity Gap", description: "Makes viewers need to know more" },
  { id: "controversy", name: "Controversial", description: "Challenges common beliefs" },
  { id: "story", name: "Story Hook", description: "Opens with a compelling narrative" },
  { id: "question", name: "Question Hook", description: "Engages with a thought-provoking question" },
  { id: "statistic", name: "Shocking Stat", description: "Leads with surprising data" },
  { id: "promise", name: "Promise Hook", description: "Promises a specific outcome" },
];

const CONTENT_TOPICS = [
  "Physician wealth building",
  "Doctor burnout solutions",
  "Medical practice management",
  "Healthcare investing",
  "Work-life balance for doctors",
  "Passive income for physicians",
  "Medical career transitions",
  "Healthcare technology",
];

export function ViralHookGenerator({ onSelectHook }: ViralHookGeneratorProps) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [hookType, setHookType] = useState("all");
  const [generatedHooks, setGeneratedHooks] = useState<GeneratedHook[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (data: { topic: string; hookType: string }) => {
      const response = await apiRequest("/api/hooks/generate", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.hooks) {
        setGeneratedHooks(data.hooks);
        toast({ title: "Hooks Generated", description: `Created ${data.hooks.length} viral hooks` });
      }
    },
    onError: () => {
      toast({ title: "Generation Failed", description: "Could not generate hooks", variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    const selectedTopic = topic === "custom" ? customTopic : topic;
    if (!selectedTopic) {
      toast({ title: "Topic Required", description: "Please select or enter a topic", variant: "destructive" });
      return;
    }
    generateMutation.mutate({ topic: selectedTopic, hookType });
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ title: "Copied!" });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const getEmotionIcon = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case "curiosity": return <Target className="w-3 h-3" />;
      case "excitement": return <Zap className="w-3 h-3" />;
      case "urgency": return <TrendingUp className="w-3 h-3" />;
      default: return <MessageSquare className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Viral Hook Generator
          </CardTitle>
          <CardDescription>Generate attention-grabbing hooks with virality scores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Content Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger data-testid="select-topic">
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TOPICS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
                <SelectItem value="custom">Custom topic...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {topic === "custom" && (
            <div>
              <Label>Custom Topic</Label>
              <Input
                placeholder="Enter your content topic..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                data-testid="input-custom-topic"
              />
            </div>
          )}

          <div>
            <Label>Hook Style</Label>
            <Select value={hookType} onValueChange={setHookType}>
              <SelectTrigger data-testid="select-hook-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles (Mixed)</SelectItem>
                {HOOK_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span>{type.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full"
            data-testid="button-generate-hooks"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Viral Hooks
          </Button>
        </CardContent>
      </Card>

      {generatedHooks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Generated Hooks ({generatedHooks.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {generatedHooks
                  .sort((a, b) => b.score - a.score)
                  .map((hook, index) => (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => onSelectHook?.(hook.text)}
                      data-testid={`hook-${index}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium mb-2">{hook.text}</p>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {hook.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                {getEmotionIcon(hook.emotion)}
                                {hook.emotion}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{hook.reasoning}</p>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <div className={`w-12 h-12 rounded-full ${getScoreColor(hook.score)} flex items-center justify-center text-white font-bold`}>
                              {hook.score}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(hook.text, index);
                              }}
                              data-testid={`copy-hook-${index}`}
                            >
                              {copiedIndex === index ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4" />
            Hook Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {HOOK_TYPES.map((type) => (
              <div key={type.id} className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{type.name}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
