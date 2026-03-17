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
  ArrowLeft, Loader2, Copy, Check, Sparkles, TrendingUp, MessageSquare, Zap, Target,
} from "lucide-react";
import { SiX } from "react-icons/si";

export default function TwitterSuite() {
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
            <SiX className="h-5 w-5" />
            <h1 className="text-xl font-bold">X / Twitter Growth Suite</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="threads" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="threads" data-testid="tab-threads"><MessageSquare className="h-4 w-4 mr-1" />Threads</TabsTrigger>
            <TabsTrigger value="tweets" data-testid="tab-tweets"><Zap className="h-4 w-4 mr-1" />Viral Tweets</TabsTrigger>
            <TabsTrigger value="engagement" data-testid="tab-engagement"><Target className="h-4 w-4 mr-1" />Growth</TabsTrigger>
            <TabsTrigger value="trending" data-testid="tab-trending"><TrendingUp className="h-4 w-4 mr-1" />Trend Hijack</TabsTrigger>
          </TabsList>
          <TabsContent value="threads"><ThreadWriter copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="tweets"><ViralTweets copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="engagement"><EngagementStrategy /></TabsContent>
          <TabsContent value="trending"><TrendHijacker copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ThreadWriter({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [tweetCount, setTweetCount] = useState("7");
  const [style, setStyle] = useState("educational");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/twitter/thread", { topic, tweetCount: parseInt(tweetCount), style }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Thread Writer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Thread Topic</Label><Input placeholder="What should the thread be about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-thread-topic" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Number of Tweets</Label>
              <Select value={tweetCount} onValueChange={setTweetCount}><SelectTrigger data-testid="select-tweet-count"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="5">5 Tweets</SelectItem><SelectItem value="7">7 Tweets</SelectItem><SelectItem value="10">10 Tweets</SelectItem><SelectItem value="15">15 Tweets</SelectItem></SelectContent></Select></div>
            <div><Label>Style</Label>
              <Select value={style} onValueChange={setStyle}><SelectTrigger data-testid="select-thread-style"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="educational">Educational</SelectItem><SelectItem value="storytelling">Storytelling</SelectItem><SelectItem value="controversial">Controversial</SelectItem><SelectItem value="listicle">Listicle</SelectItem><SelectItem value="how-to">How-To</SelectItem></SelectContent></Select></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-thread">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing...</> : <><MessageSquare className="h-4 w-4 mr-2" />Write Thread</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <>
          <Card>
            <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">Opening Tweet</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.hookTweet, "hook")}>{copiedField === "hook" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div></CardHeader>
            <CardContent><div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border"><p className="font-bold text-lg">{result.hookTweet}</p></div></CardContent>
          </Card>
          <Card>
            <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">Full Thread</CardTitle>
              <Button variant="outline" size="sm" onClick={() => { const full = [result.hookTweet, ...result.thread?.map((t: any) => t.tweet) || [], result.closingCTA].filter(Boolean).map((t, i) => `${i + 1}/ ${t}`).join("\n\n"); copyToClipboard(full, "full-thread"); }} data-testid="button-copy-full-thread">
                {copiedField === "full-thread" ? <><Check className="h-4 w-4 mr-1" />Copied</> : <><Copy className="h-4 w-4 mr-1" />Copy All</>}</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.thread?.map((t: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 border-l-2 border-primary/30 pl-4">
                    <Badge variant="outline" className="text-xs shrink-0">{t.number || i + 2}</Badge>
                    <div className="flex-1"><p className="text-sm">{t.tweet}</p>{t.mediaNote && <p className="text-xs text-primary mt-1">{t.mediaNote}</p>}</div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(t.tweet, `t-${i}`)} className="shrink-0">{copiedField === `t-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
                  </div>
                ))}
                {result.closingCTA && (
                  <div className="p-3 border-l-2 border-green-500/50 pl-4 bg-green-500/5 rounded-r-lg"><Badge variant="default" className="text-xs mb-1">CTA</Badge><p className="text-sm font-medium">{result.closingCTA}</p></div>
                )}
              </div>
            </CardContent>
          </Card>
          {result.alternativeHooks && (
            <Card><CardHeader><CardTitle className="text-lg">Alternative Hooks</CardTitle></CardHeader><CardContent>
              <div className="space-y-2">{result.alternativeHooks.map((h: string, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg"><p className="text-sm">{h}</p>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(h, `alt-${i}`)}>{copiedField === `alt-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button></div>
              ))}</div></CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}

function ViralTweets({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("mixed");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/twitter/viral-tweets", { topic, style }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Viral Tweet Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Topic</Label><Input placeholder="What topic to tweet about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-tweet-topic" /></div>
          <div><Label>Style</Label>
            <Select value={style} onValueChange={setStyle}><SelectTrigger data-testid="select-tweet-style"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="mixed">Mixed Styles</SelectItem><SelectItem value="hot takes">Hot Takes</SelectItem><SelectItem value="educational">Educational</SelectItem><SelectItem value="humorous">Humorous</SelectItem><SelectItem value="inspirational">Inspirational</SelectItem></SelectContent></Select></div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-tweets">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Zap className="h-4 w-4 mr-2" />Generate Viral Tweets</>}
          </Button>
        </CardContent>
      </Card>
      {result?.tweets?.map((tweet: any, i: number) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex gap-2 mb-2"><Badge variant="secondary">{tweet.style}</Badge><Badge variant={tweet.estimatedEngagement === "high" ? "default" : "outline"}>{tweet.estimatedEngagement}</Badge><Badge variant="outline">{tweet.bestFormat}</Badge></div>
                <p className="text-sm font-medium mb-2">{tweet.tweet}</p>
                <p className="text-xs text-muted-foreground">Reply bait: {tweet.replyBait}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(tweet.tweet, `vt-${i}`)} className="shrink-0">{copiedField === `vt-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {result?.tweetFormulas && (
        <Card><CardHeader><CardTitle className="text-lg">Tweet Formulas</CardTitle></CardHeader><CardContent>
          <div className="space-y-3">{result.tweetFormulas.map((f: any, i: number) => (
            <div key={i} className="p-3 border rounded-lg"><p className="font-medium text-sm">{f.formula}</p><p className="text-xs text-muted-foreground mt-1">Example: {f.example}</p><p className="text-xs text-primary mt-1">{f.whyItWorks}</p></div>
          ))}</div></CardContent></Card>
      )}
    </div>
  );
}

function EngagementStrategy() {
  const [niche, setNiche] = useState("");
  const [goals, setGoals] = useState("");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/twitter/engagement", { niche, goals }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Growth Strategy Builder</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Your Niche</Label><Input placeholder="e.g., tech, finance, health" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-growth-niche" /></div>
            <div><Label>Goals</Label><Input placeholder="e.g., 10K followers, thought leadership" value={goals} onChange={(e) => setGoals(e.target.value)} data-testid="input-growth-goals" /></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-build-strategy">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Building...</> : <><Target className="h-4 w-4 mr-2" />Build Growth Strategy</>}
          </Button>
        </CardContent>
      </Card>
      {result && (
        <>
          {result.dailyRoutine && (
            <Card><CardHeader><CardTitle className="text-lg">Daily Routine</CardTitle></CardHeader><CardContent>
              <div className="space-y-2">{result.dailyRoutine.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3"><Badge variant="outline">{item.time}</Badge><span className="text-sm">{item.action}</span></div>
                  <div className="flex gap-2"><Badge variant="secondary">{item.duration}</Badge><Badge variant={item.impact === "high" ? "default" : "outline"}>{item.impact}</Badge></div>
                </div>
              ))}</div></CardContent></Card>
          )}
          {result.growthTactics && (
            <Card><CardHeader><CardTitle className="text-lg">Growth Tactics</CardTitle></CardHeader><CardContent>
              <div className="space-y-3">{result.growthTactics.map((tactic: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1"><span className="font-medium text-sm">{tactic.tactic}</span><Badge variant={tactic.effort === "easy" ? "default" : "secondary"}>{tactic.effort}</Badge></div>
                  <p className="text-xs text-muted-foreground">{tactic.description}</p><p className="text-xs text-primary mt-1">Expected: {tactic.expectedResult}</p>
                </div>
              ))}</div></CardContent></Card>
          )}
          {result.profileOptimization && (
            <Card><CardHeader><CardTitle className="text-lg">Profile Optimization</CardTitle></CardHeader><CardContent className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Suggested Bio</Label><p className="text-sm bg-muted/50 p-3 rounded-lg">{result.profileOptimization.bio}</p></div>
              <div><Label className="text-xs text-muted-foreground">Pinned Tweet Idea</Label><p className="text-sm">{result.profileOptimization.pinnedTweet}</p></div>
              <div><Label className="text-xs text-muted-foreground">Header Image</Label><p className="text-sm">{result.profileOptimization.headerIdea}</p></div>
            </CardContent></Card>
          )}
          {result.weeklySchedule && (
            <Card><CardHeader><CardTitle className="text-lg">Weekly Schedule</CardTitle></CardHeader><CardContent>
              <div className="space-y-2">{result.weeklySchedule.map((day: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg"><div className="font-medium text-sm">{day.day}</div><p className="text-xs text-muted-foreground">Content: {day.content}</p><p className="text-xs text-primary">Engage: {day.engagement}</p></div>
              ))}</div></CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}

function TrendHijacker({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [niche, setNiche] = useState("");
  const [trendTopic, setTrendTopic] = useState("");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/twitter/trending-hijack", { niche, trendTopic }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Trend Hijacker</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Your Niche</Label><Input placeholder="e.g., tech, business" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-hijack-niche" /></div>
            <div><Label>Trending Topic (optional)</Label><Input placeholder="Paste a trending topic to hijack" value={trendTopic} onChange={(e) => setTrendTopic(e.target.value)} data-testid="input-trend-topic" /></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-hijack-trends">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><TrendingUp className="h-4 w-4 mr-2" />Find & Hijack Trends</>}
          </Button>
        </CardContent>
      </Card>
      {result?.hijackTweets?.map((item: any, i: number) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex gap-2 mb-2"><Badge variant="secondary">{item.trend}</Badge><Badge variant={item.viralPotential === "high" ? "default" : "outline"}>{item.viralPotential}</Badge></div>
                <p className="text-sm font-medium mb-1">{item.tweet}</p>
                <p className="text-xs text-muted-foreground">Angle: {item.angle}</p>
                <div className="flex flex-wrap gap-1 mt-2">{item.hashtags?.map((h: string, j: number) => <Badge key={j} variant="outline" className="text-xs">{h}</Badge>)}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(item.tweet, `hj-${i}`)}>{copiedField === `hj-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {result?.warnings && (
        <Card><CardHeader><CardTitle className="text-lg text-amber-500">Warnings</CardTitle></CardHeader><CardContent>
          <ul className="space-y-1">{result.warnings.map((w: string, i: number) => <li key={i} className="text-sm text-muted-foreground">- {w}</li>)}</ul></CardContent></Card>
      )}
    </div>
  );
}
