import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft, Loader2, Copy, Check, Sparkles, Image, Zap, Trophy, Target,
} from "lucide-react";

export default function ABTester() {
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
            <Target className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold">AI A/B Tester</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="thumbnails" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="thumbnails" data-testid="tab-thumbnails"><Image className="h-4 w-4 mr-1" />Thumbnails & Titles</TabsTrigger>
            <TabsTrigger value="hooks" data-testid="tab-test-hooks"><Zap className="h-4 w-4 mr-1" />Hooks</TabsTrigger>
          </TabsList>
          <TabsContent value="thumbnails"><ThumbnailTester copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="hooks"><HookTester copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? "bg-green-500" : score >= 6 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-32 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score * 10}%` }} /></div>
      <span className="text-xs font-bold w-8 text-right">{score}/10</span>
    </div>
  );
}

function ThumbnailTester({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/ab-test/thumbnails", { topic, currentTitle }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" />Thumbnail & Title A/B Tester</CardTitle>
          <p className="text-sm text-muted-foreground">Generate and score multiple thumbnail/title variations side-by-side</p></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Video Topic</Label><Input placeholder="What's the video about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-ab-topic" /></div>
          <div><Label>Current Title (optional)</Label><Input placeholder="Your existing title to improve" value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} data-testid="input-current-title" /></div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-run-ab-test" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating & Scoring...</> : <><Target className="h-4 w-4 mr-2" />Run A/B Test</>}
          </Button>
        </CardContent>
      </Card>

      {result?.winner && (
        <Card className="border-2 border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3"><Trophy className="h-8 w-8 text-yellow-500" />
              <div><p className="font-bold text-lg text-green-600 dark:text-green-400">Winner: {result.winner.label}</p><p className="text-sm text-muted-foreground">{result.winner.reason}</p></div>
            </div>
            {result.ctrPredictions && (
              <div className="flex gap-4 mt-3"><Badge variant="default">Best CTR: {result.ctrPredictions.bestCase}</Badge><Badge variant="outline">Worst CTR: {result.ctrPredictions.worstCase}</Badge></div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {result?.variations?.map((v: any, i: number) => {
          const isWinner = result.winner?.label === v.label;
          return (
            <Card key={i} className={isWinner ? "border-2 border-green-500/50" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">{v.label}{isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                    <Badge variant={v.scores?.overall >= 8 ? "default" : "secondary"}>{v.scores?.overall}/10</Badge></CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`Title: ${v.title}\nThumbnail: ${v.thumbnailText}\nHook: ${v.hookLine}`, `ab-${i}`)}>
                    {copiedField === `ab-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-xs text-muted-foreground">Title</Label><p className="font-medium">{v.title}</p></div>
                <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 p-3 rounded-lg border">
                  <Label className="text-xs text-muted-foreground">Thumbnail Text</Label><p className="font-bold text-xl">{v.thumbnailText}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Thumbnail Concept</Label><p className="text-sm text-muted-foreground">{v.thumbnailConcept}</p></div>
                <div><Label className="text-xs text-muted-foreground">Opening Hook</Label><p className="text-sm italic">"{v.hookLine}"</p></div>
                <div className="space-y-2">
                  {v.scores && Object.entries(v.scores).filter(([k]) => k !== "overall").map(([key, score]: [string, any]) => (
                    <ScoreBar key={key} label={key.replace(/([A-Z])/g, " $1").trim()} score={score} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs text-green-500">Strengths</Label><ul className="text-xs mt-1">{v.strengths?.map((s: string, j: number) => <li key={j}>+ {s}</li>)}</ul></div>
                  <div><Label className="text-xs text-red-500">Weaknesses</Label><ul className="text-xs mt-1">{v.weaknesses?.map((w: string, j: number) => <li key={j}>- {w}</li>)}</ul></div>
                </div>
                <p className="text-xs text-muted-foreground">Best for: {v.targetAudience}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {result?.psychologyInsights && (
        <Card><CardHeader><CardTitle className="text-lg">Psychology Insights</CardTitle></CardHeader><CardContent>
          <ul className="space-y-2">{result.psychologyInsights.map((p: string, i: number) => (
            <li key={i} className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-yellow-500 shrink-0" /><span className="text-sm">{p}</span></li>
          ))}</ul></CardContent></Card>
      )}
    </div>
  );
}

function HookTester({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("YouTube");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/ab-test/hooks", { topic, platform }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Hook A/B Tester</CardTitle>
          <p className="text-sm text-muted-foreground">Generate and score multiple opening hooks for maximum retention</p></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Content Topic</Label><Input placeholder="What's the content about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-hook-ab-topic" /></div>
          <div><Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}><SelectTrigger data-testid="select-hook-platform"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="YouTube">YouTube</SelectItem><SelectItem value="TikTok">TikTok</SelectItem><SelectItem value="Instagram Reels">Instagram Reels</SelectItem><SelectItem value="Podcast">Podcast</SelectItem></SelectContent></Select></div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-test-hooks" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing Hooks...</> : <><Zap className="h-4 w-4 mr-2" />A/B Test Hooks</>}
          </Button>
        </CardContent>
      </Card>

      {result?.winner && (
        <Card className="border-2 border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3"><Trophy className="h-8 w-8 text-yellow-500" />
              <div><p className="font-bold text-lg text-green-600 dark:text-green-400">Winner: {result.winner.label}</p><p className="text-sm text-muted-foreground">{result.winner.reason}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {result?.hooks?.map((hook: any, i: number) => {
        const isWinner = result.winner?.label === hook.label;
        return (
          <Card key={i} className={isWinner ? "border-2 border-green-500/50" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">{hook.label}{isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                  <Badge variant="secondary">{hook.hookType}</Badge><Badge variant={hook.scores?.overall >= 8 ? "default" : "outline"}>{hook.scores?.overall}/10</Badge></CardTitle>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(hook.hookText + "\n\n" + hook.script, `hk-${i}`)}>
                  {copiedField === `hk-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4 rounded-lg border"><p className="font-bold text-lg">"{hook.hookText}"</p></div>
              <div><Label className="text-xs text-muted-foreground">First 15 Seconds</Label><p className="text-sm mt-1">{hook.script}</p></div>
              <div className="space-y-2">
                {hook.scores && Object.entries(hook.scores).filter(([k]) => k !== "overall").map(([key, score]: [string, any]) => (
                  <ScoreBar key={key} label={key.replace(/([A-Z])/g, " $1").trim()} score={score} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{hook.whyItWorks}</p>
              <p className="text-xs text-primary">Best for: {hook.bestFor}</p>
            </CardContent>
          </Card>
        );
      })}

      {result?.hookFormulas && (
        <Card><CardHeader><CardTitle className="text-lg">Hook Formulas</CardTitle></CardHeader><CardContent>
          <div className="space-y-3">{result.hookFormulas.map((f: any, i: number) => (
            <div key={i} className="p-3 border rounded-lg"><p className="font-medium text-sm">{f.formula}</p><p className="text-xs text-muted-foreground mt-1">Example: "{f.example}"</p></div>
          ))}</div></CardContent></Card>
      )}
    </div>
  );
}
