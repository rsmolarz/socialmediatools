import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, X, Mic } from "lucide-react";

interface TranscriptAnalysis {
  themes: string[];
  backgroundPrompt: string;
  style: string;
  mood: string;
  suggestedHeadline: string[];
}

interface TranscriptAnalyzerProps {
  onAnalysisComplete: (analysis: TranscriptAnalysis) => void;
  onGenerateBackground?: (prompt: string, style: string, mood: string) => void;
}

export function TranscriptAnalyzer({ 
  onAnalysisComplete, 
  onGenerateBackground 
}: TranscriptAnalyzerProps) {
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [detectedThemes, setDetectedThemes] = useState<string[]>([]);

  const analyzeTranscript = async () => {
    if (!transcript.trim()) {
      setStatus("⚠️ Please paste a transcript first!");
      setTimeout(() => setStatus(null), 2000);
      return;
    }

    setIsAnalyzing(true);
    setStatus("🔍 Reading transcript...");

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

      const analysis: TranscriptAnalysis = await response.json();

      setStatus("✨ Generating background from themes...");

      // Show detected themes
      setDetectedThemes(analysis.themes || []);

      // Notify parent of analysis results
      onAnalysisComplete(analysis);

      // Trigger background generation if callback provided
      if (onGenerateBackground && analysis.backgroundPrompt) {
        onGenerateBackground(
          analysis.backgroundPrompt,
          analysis.style || "cinematic",
          analysis.mood || "professional"
        );
      }

      setStatus("✅ Transcript analyzed & background generated!");
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error("Transcript analysis error:", error);
      setStatus("⚠️ Analysis failed. Try manual generation.");
      setTimeout(() => setStatus(null), 2000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setDetectedThemes([]);
    setStatus(null);
  };

  return (
    <div className="bg-gradient-to-br from-green-900/40 to-teal-900/40 rounded-xl p-5 border border-green-500/30">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Mic className="w-4 h-4" />
        Podcast Transcript
      </h3>
      <p className="text-gray-400 text-xs mb-3">
        Paste your episode transcript below. AI will analyze key themes to generate a relevant background.
      </p>

      <Textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={5}
        placeholder={`Paste your podcast transcript here... 

Example: 'Today we're discussing how doctors can leverage real estate investments, the power of compound interest, and why medical professionals should start thinking about passive income streams early in their careers...'`}
        className="w-full bg-gray-800/80 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none text-sm resize-y border-gray-700"
      />

      <div className="flex gap-2 mt-3">
        <Button
          onClick={analyzeTranscript}
          disabled={isAnalyzing}
          className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-2 rounded-lg transition-all"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze & Generate
            </>
          )}
        </Button>
        <Button
          onClick={clearTranscript}
          variant="secondary"
          className="px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {status && (
        <div className="mt-2 text-center text-sm text-gray-400">
          {status}
        </div>
      )}

      {/* Detected Themes */}
      {detectedThemes.length > 0 && (
        <div className="mt-3">
          <p className="text-gray-300 text-xs mb-2">📌 Detected Themes:</p>
          <div className="flex flex-wrap gap-2">
            {detectedThemes.map((theme, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded-full"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
