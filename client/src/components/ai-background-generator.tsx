import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIBackgroundGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
}

const STYLE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "dramatic", label: "Dramatic" },
  { value: "minimalist", label: "Minimalist" },
  { value: "vibrant", label: "Vibrant" },
  { value: "dark", label: "Dark & Moody" },
  { value: "gradient", label: "Gradient Abstract" },
  { value: "futuristic", label: "Futuristic" },
  { value: "abstract", label: "Abstract" },
  { value: "cosmic", label: "Cosmic" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "medical", label: "Medical" },
  { value: "financial", label: "Financial" },
];

const MOOD_OPTIONS = [
  { value: "inspiring", label: "Inspiring" },
  { value: "serious", label: "Serious" },
  { value: "energetic", label: "Energetic" },
  { value: "calm", label: "Calm" },
  { value: "bold", label: "Bold" },
  { value: "mysterious", label: "Mysterious" },
  { value: "luxurious", label: "Luxurious" },
  { value: "techy", label: "Tech-focused" },
  { value: "trustworthy", label: "Trustworthy" },
  { value: "urgent", label: "Urgent" },
];

export function AIBackgroundGenerator({ onImageGenerated }: AIBackgroundGeneratorProps) {
  const [transcript, setTranscript] = useState("");
  const [style, setStyle] = useState("professional");
  const [mood, setMood] = useState("inspiring");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const promptParts = [
        "Create a YouTube thumbnail background image.",
        `Style: ${style}.`,
        `Mood: ${mood}.`,
        "The image should be suitable for overlaying text.",
        "High quality, 16:9 aspect ratio, visually striking.",
        "No text or words in the image.",
      ];

      if (transcript.trim()) {
        promptParts.push(`Theme inspired by: ${transcript.slice(0, 500)}`);
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptParts.join(" "),
          size: "1024x1024",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const data = await response.json();

      if (data.b64_json) {
        const imageUrl = `data:image/png;base64,${data.b64_json}`;
        onImageGenerated(imageUrl);
        toast({
          title: "Background Generated",
          description: "Your AI-generated background is ready!",
        });
      } else {
        throw new Error("No image data received");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate background. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Background Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="transcript">Podcast Transcript (optional)</Label>
          <Textarea
            id="transcript"
            placeholder="Paste your podcast transcript or topic description here to generate a relevant background..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="min-h-[100px] text-sm resize-none"
            data-testid="textarea-transcript"
          />
          <p className="text-xs text-muted-foreground">
            The AI will analyze the content to create a relevant background
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="style">Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger id="style" data-testid="select-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mood">Mood</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger id="mood" data-testid="select-mood">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
          data-testid="button-generate-ai-background"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Background
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
