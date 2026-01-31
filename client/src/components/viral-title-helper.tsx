import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Zap, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ViralTitleHelperProps {
  onTitleSelect: (title: string) => void;
  currentTitle?: string;
}

const VIRAL_TITLE_TIPS = [
  "Keep it to 3-5 words max",
  "Use power words: FREE, SECRET, NOW, STOP",
  "Create curiosity or urgency",
  "Use numbers when possible",
  "Ask a question or make a bold claim",
];

const QUICK_VIRAL_TEMPLATES = [
  { label: "Money Hook", templates: ["$[X] SECRET", "GET RICH NOW", "MONEY MISTAKE", "WEALTH HACK"] },
  { label: "Medical Hook", templates: ["DOCTORS HIDE THIS", "HEALTH SECRET", "STOP THIS NOW", "SAVE YOUR LIFE"] },
  { label: "Urgency", templates: ["WATCH THIS NOW", "DON'T DO THIS", "BEFORE IT'S LATE", "ACT NOW"] },
  { label: "Curiosity", templates: ["THE TRUTH ABOUT", "NOBODY TOLD YOU", "WHAT THEY HIDE", "THE REAL REASON"] },
];

export function ViralTitleHelper({ onTitleSelect, currentTitle }: ViralTitleHelperProps) {
  const [topic, setTopic] = useState(currentTitle || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const generateViralTitles = async () => {
    if (!topic.trim()) {
      toast({
        title: "Enter a topic",
        description: "Please describe what your video is about",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);

    try {
      const response = await fetch("/api/generate-viral-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate titles");
      }

      const data = await response.json();
      setSuggestions(data.titles || []);
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Could not generate viral titles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = (title: string, index: number) => {
    onTitleSelect(title);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({
      title: "Title applied!",
      description: "The viral title has been set as your headline",
    });
  };

  const handleQuickTemplate = (template: string) => {
    onTitleSelect(template);
    toast({
      title: "Template applied!",
      description: "Quick template has been set as your headline",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Viral Title Helper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            YouTube thumbnails need SHORT, punchy text. Describe your topic and get viral title suggestions:
          </p>
          <Textarea
            placeholder="e.g., Real estate investing strategies for physicians..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="resize-none text-sm"
            rows={2}
            data-testid="input-viral-topic"
          />
          <Button
            onClick={generateViralTitles}
            disabled={isGenerating}
            className="w-full"
            size="sm"
            data-testid="button-generate-viral-titles"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Viral Titles
              </>
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">AI Suggestions (click to use):</p>
            <div className="grid gap-2">
              {suggestions.map((title, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-between text-left h-auto py-2 px-3"
                  onClick={() => handleSelect(title, index)}
                  data-testid={`button-viral-title-${index}`}
                >
                  <span className="font-bold text-sm">{title}</span>
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium">Quick Templates:</p>
          <div className="space-y-2">
            {QUICK_VIRAL_TEMPLATES.map((category) => (
              <div key={category.label} className="space-y-1">
                <p className="text-xs text-muted-foreground">{category.label}:</p>
                <div className="flex flex-wrap gap-1">
                  {category.templates.map((template) => (
                    <Badge
                      key={template}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => handleQuickTemplate(template)}
                      data-testid={`badge-template-${template.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {template}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs font-medium mb-2">Viral Title Tips:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {VIRAL_TITLE_TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-yellow-500">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
