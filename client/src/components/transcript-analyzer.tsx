import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, X, Mic, Copy, Check, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptAnalysis {
  themes: string[];
  backgroundPrompt: string;
  style: string;
  mood: string;
  viralTitle?: string;
  youtubeTitle?: string;
  youtubeDescription?: string;
  tags?: string[];
  suggestedHeadline?: string[];
}

interface TranscriptAnalyzerProps {
  onAnalysisComplete: (analysis: TranscriptAnalysis) => void;
  onGenerateBackground?: (prompt: string, style: string, mood: string) => void;
  onApplyViralTitle?: (title: string) => void;
  onMetadataUpdate?: (metadata: { youtubeTitle?: string; youtubeDescription?: string; tags?: string[] }) => void;
  savedYoutubeTitle?: string;
  savedYoutubeDescription?: string;
  savedTags?: string[];
}

export function TranscriptAnalyzer({ 
  onAnalysisComplete, 
  onGenerateBackground,
  onApplyViralTitle,
  onMetadataUpdate,
  savedYoutubeTitle,
  savedYoutubeDescription,
  savedTags,
}: TranscriptAnalyzerProps) {
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TranscriptAnalysis | null>(() => {
    if (savedYoutubeTitle || savedYoutubeDescription || (savedTags && savedTags.length > 0)) {
      return {
        themes: [],
        backgroundPrompt: "",
        style: "",
        mood: "",
        youtubeTitle: savedYoutubeTitle,
        youtubeDescription: savedYoutubeDescription,
        tags: savedTags,
      };
    }
    return null;
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (savedYoutubeTitle || savedYoutubeDescription || (savedTags && savedTags.length > 0)) {
      setAnalysis((prev) => ({
        themes: prev?.themes || [],
        backgroundPrompt: prev?.backgroundPrompt || "",
        style: prev?.style || "",
        mood: prev?.mood || "",
        youtubeTitle: savedYoutubeTitle,
        youtubeDescription: savedYoutubeDescription,
        tags: savedTags,
        viralTitle: prev?.viralTitle,
        suggestedHeadline: prev?.suggestedHeadline,
      }));
    }
  }, [savedYoutubeTitle, savedYoutubeDescription, savedTags]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const analyzeTranscript = async () => {
    if (!transcript.trim()) {
      setStatus("Please paste a transcript first!");
      setTimeout(() => setStatus(null), 2000);
      return;
    }

    setIsAnalyzing(true);
    setStatus("Reading transcript...");
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: transcript.substring(0, 3000) }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result: TranscriptAnalysis = await response.json();
      setAnalysis(result);

      setStatus("Generating background from themes...");

      onAnalysisComplete(result);

      if (onMetadataUpdate) {
        onMetadataUpdate({
          youtubeTitle: result.youtubeTitle,
          youtubeDescription: result.youtubeDescription,
          tags: result.tags,
        });
      }

      if (onGenerateBackground && result.backgroundPrompt) {
        onGenerateBackground(
          result.backgroundPrompt,
          result.style || "cinematic",
          result.mood || "professional"
        );
      }

      setStatus("Analysis complete!");
      setTimeout(() => setStatus(null), 2000);
    } catch (error) {
      console.error("Transcript analysis error:", error);
      setStatus("Analysis failed. Try again.");
      setTimeout(() => setStatus(null), 2000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setAnalysis(null);
    setStatus(null);
  };

  const handleApplyTitle = () => {
    const title = analysis?.viralTitle || (analysis?.suggestedHeadline?.[0]);
    if (title && onApplyViralTitle) {
      onApplyViralTitle(title);
      toast({
        title: "Title applied!",
        description: "Viral title has been set on your thumbnail",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-green-900/40 to-teal-900/40 border-green-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-white">
            <Mic className="w-4 h-4" />
            Podcast Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-400 text-xs">
            Paste your transcript to generate: viral title, YouTube description, SEO tags, and background image.
          </p>

          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            placeholder="Paste your podcast transcript here..."
            className="bg-gray-800/80 text-white border-gray-700 text-sm resize-y"
            data-testid="input-transcript"
          />

          <div className="flex gap-2">
            <Button
              onClick={analyzeTranscript}
              disabled={isAnalyzing}
              className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
              data-testid="button-analyze-transcript"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze & Generate All
                </>
              )}
            </Button>
            <Button
              onClick={clearTranscript}
              variant="secondary"
              size="icon"
              className="bg-gray-700 hover:bg-gray-600"
              data-testid="button-clear-transcript"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {status && (
            <div className="text-center text-sm text-gray-400">
              {status}
            </div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-3">
          {(analysis.viralTitle || analysis.suggestedHeadline?.[0]) && (
            <Card className="bg-yellow-900/30 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-yellow-300 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Viral Thumbnail Title
                  </h4>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(analysis.viralTitle || analysis.suggestedHeadline?.[0] || "", "Title")}
                      className="h-7 px-2 text-yellow-300 hover:text-yellow-100"
                      data-testid="button-copy-viral-title"
                    >
                      {copiedField === "Title" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    {onApplyViralTitle && (
                      <Button
                        size="sm"
                        onClick={handleApplyTitle}
                        className="h-7 bg-yellow-600 hover:bg-yellow-700 text-xs"
                        data-testid="button-apply-viral-title"
                      >
                        Apply to Thumbnail
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold text-white">
                  {analysis.viralTitle || analysis.suggestedHeadline?.[0]}
                </p>
              </CardContent>
            </Card>
          )}

          {analysis.youtubeTitle && (
            <Card className="bg-blue-900/30 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-blue-300">YouTube Video Title</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(analysis.youtubeTitle || "", "YouTube Title")}
                    className="h-7 px-2 text-blue-300 hover:text-blue-100"
                    data-testid="button-copy-youtube-title"
                  >
                    {copiedField === "YouTube Title" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <p className="text-sm text-white">{analysis.youtubeTitle}</p>
              </CardContent>
            </Card>
          )}

          {analysis.youtubeDescription && (
            <Card className="bg-purple-900/30 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-purple-300">YouTube Description</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(analysis.youtubeDescription || "", "Description")}
                    className="h-7 px-2 text-purple-300 hover:text-purple-100"
                    data-testid="button-copy-description"
                  >
                    {copiedField === "Description" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {analysis.youtubeDescription}
                </p>
              </CardContent>
            </Card>
          )}

          {analysis.tags && analysis.tags.length > 0 && (
            <Card className="bg-pink-900/30 border-pink-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-pink-300">SEO Tags</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(analysis.tags?.join(", ") || "", "Tags")}
                    className="h-7 px-2 text-pink-300 hover:text-pink-100"
                    data-testid="button-copy-tags"
                  >
                    {copiedField === "Tags" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs bg-pink-900/50 text-pink-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysis.themes && analysis.themes.length > 0 && (
            <div className="mt-2">
              <p className="text-gray-300 text-xs mb-2">Detected Themes:</p>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((theme, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs bg-green-900/50 text-green-300"
                  >
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
