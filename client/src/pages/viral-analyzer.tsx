import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft, Loader2, Copy, Check, Sparkles, TrendingUp, Flame, Brain, Lightbulb, BookOpen,
} from "lucide-react";

export default function ViralAnalyzer() {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <Flame className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold">Viral Content Analyzer</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="analyze" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="analyze" data-testid="tab-analyze"><TrendingUp className="h-4 w-4 mr-1" />Analyze Content</TabsTrigger>
            <TabsTrigger value="formulas" data-testid="tab-formulas"><BookOpen className="h-4 w-4 mr-1" />Viral Formulas</TabsTrigger>
          </TabsList>
          <TabsContent value="analyze"><ContentAnalyzer copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="formulas"><ViralFormulas /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="text-center">
      <div className={`text-4xl font-bold ${color}`}>{score}</div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ScoreBar({ label, score, analysis }: { label: string; score: number; analysis?: string }) {
  const color = score >= 8 ? "bg-green-500" : score >= 6 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs w-32 text-muted-foreground capitalize">{label.replace(/([A-Z])/g, " $1")}</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${score * 10}%` }} /></div>
        <span className="text-xs font-bold w-8 text-right">{score}/10</span>
      </div>
      {analysis && <p className="text-xs text-muted-foreground pl-[140px]">{analysis}</p>}
    </div>
  );
}

function ContentAnalyzer({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("social media post");
  const [platform, setPlatform] = useState("Twitter");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/viral-analyzer/analyze", { content, contentType, platform }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Analyze Viral Content</CardTitle>
          <p className="text-sm text-muted-foreground">Paste any viral content and learn exactly WHY it went viral</p></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Content to Analyze</Label>
            <Textarea placeholder="Paste the viral post, tweet, video title+description, or any content..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[150px]" data-testid="input-analyze-content" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}><SelectTrigger data-testid="select-analyze-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="social media post">Social Media Post</SelectItem><SelectItem value="video">Video</SelectItem><SelectItem value="tweet">Tweet/Thread</SelectItem><SelectItem value="article">Article/Blog</SelectItem><SelectItem value="reel/tiktok">Reel/TikTok</SelectItem></SelectContent></Select></div>
            <div><Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}><SelectTrigger data-testid="select-analyze-platform"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Twitter">X/Twitter</SelectItem><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="TikTok">TikTok</SelectItem><SelectItem value="YouTube">YouTube</SelectItem><SelectItem value="LinkedIn">LinkedIn</SelectItem></SelectContent></Select></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!content || mutation.isPending} data-testid="button-analyze-viral" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Flame className="h-4 w-4 mr-2" />Analyze Why It Went Viral</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className="border-2 border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-red-500/5">
            <CardContent className="pt-6"><div className="flex items-center justify-center"><ScoreRing score={result.viralScore || 0} label="Viral Score" /></div></CardContent>
          </Card>

          {result.breakdown && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Detailed Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(result.breakdown).map(([key, data]: [string, any]) => (
                  <ScoreBar key={key} label={key} score={data.score} analysis={data.analysis} />
                ))}
              </CardContent>
            </Card>
          )}

          {result.whyItWentViral && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" />Why It Went Viral</CardTitle></CardHeader>
              <CardContent><ul className="space-y-2">{result.whyItWentViral.map((reason: string, i: number) => (
                <li key={i} className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-orange-500 shrink-0" /><span className="text-sm">{reason}</span></li>
              ))}</ul></CardContent>
            </Card>
          )}

          {result.psychologyPrinciples && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />Psychology Principles</CardTitle></CardHeader>
              <CardContent><div className="space-y-3">{result.psychologyPrinciples.map((p: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg"><p className="font-medium text-sm">{p.principle}</p><p className="text-xs text-muted-foreground mt-1">{p.howItsApplied}</p></div>
              ))}</div></CardContent>
            </Card>
          )}

          {result.contentStructure && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Content Structure</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(result.contentStructure).map(([key, val]: [string, any]) => (
                  <div key={key}><Label className="text-xs text-muted-foreground capitalize">{key}</Label><p className="text-sm">{val}</p></div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.replicateIdeas && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-yellow-500" />Content Ideas Inspired By This</CardTitle></CardHeader>
              <CardContent><div className="space-y-4">{result.replicateIdeas.map((idea: any, i: number) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{idea.idea}</p>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`Title: ${idea.title}\nHook: ${idea.hook}\nAngle: ${idea.angle}`, `idea-${i}`)}>
                      {copiedField === `idea-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
                  </div>
                  <p className="text-xs"><span className="text-muted-foreground">Title: </span>{idea.title}</p>
                  <p className="text-xs"><span className="text-muted-foreground">Hook: </span>"{idea.hook}"</p>
                  <p className="text-xs"><span className="text-muted-foreground">Angle: </span>{idea.angle}</p>
                  <Badge variant="outline" className="text-xs mt-2">{idea.platform}</Badge>
                </div>
              ))}</div></CardContent>
            </Card>
          )}

          {result.lessonsLearned && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Key Takeaways</CardTitle></CardHeader>
              <CardContent><ul className="space-y-2">{result.lessonsLearned.map((lesson: string, i: number) => (
                <li key={i} className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-yellow-500 shrink-0" /><span className="text-sm">{lesson}</span></li>
              ))}</ul></CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ViralFormulas() {
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("all platforms");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/viral-analyzer/formula", { niche, platform }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Viral Content Formulas</CardTitle>
          <p className="text-sm text-muted-foreground">Get proven formulas and frameworks for creating viral content</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Your Niche</Label><Input placeholder="e.g., health, finance, tech" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-formula-niche" /></div>
            <div><Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}><SelectTrigger data-testid="select-formula-platform"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all platforms">All Platforms</SelectItem><SelectItem value="YouTube">YouTube</SelectItem><SelectItem value="TikTok">TikTok</SelectItem><SelectItem value="Twitter">X/Twitter</SelectItem><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="LinkedIn">LinkedIn</SelectItem></SelectContent></Select></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-get-formulas" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading formulas...</> : <><BookOpen className="h-4 w-4 mr-2" />Get Viral Formulas</>}
          </Button>
        </CardContent>
      </Card>

      {result?.formulas?.map((f: any, i: number) => (
        <Card key={i}>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2">{f.name}
            <Badge variant={f.viralPotential === "high" ? "default" : "secondary"}>{f.viralPotential} potential</Badge>
            <Badge variant={f.difficulty === "easy" ? "default" : "outline"}>{f.difficulty}</Badge>
            <Badge variant="outline">{f.bestPlatform}</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg"><Label className="text-xs text-muted-foreground">Template</Label><p className="text-sm font-medium mt-1">{f.template}</p></div>
            <div><Label className="text-xs text-muted-foreground">Example</Label><p className="text-sm mt-1">{f.example}</p></div>
            <p className="text-xs text-muted-foreground">{f.whyItWorks}</p>
          </CardContent>
        </Card>
      ))}

      {result?.contentFrameworks?.map((fw: any, i: number) => (
        <Card key={i}>
          <CardHeader><CardTitle className="text-lg">{fw.framework}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label className="text-xs text-muted-foreground">Steps</Label>
              <ol className="text-sm mt-1 space-y-1">{fw.steps?.map((s: string, j: number) => <li key={j}>{j + 1}. {s}</li>)}</ol></div>
            <div><Label className="text-xs text-muted-foreground">Example</Label><p className="text-sm">{fw.example}</p></div>
          </CardContent>
        </Card>
      ))}

      {result?.mistakesToAvoid && (
        <Card>
          <CardHeader><CardTitle className="text-lg text-red-500">Mistakes That Kill Virality</CardTitle></CardHeader>
          <CardContent><ul className="space-y-1">{result.mistakesToAvoid.map((m: string, i: number) => <li key={i} className="text-sm">- {m}</li>)}</ul></CardContent>
        </Card>
      )}
    </div>
  );
}
