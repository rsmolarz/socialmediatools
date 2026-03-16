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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  Zap,
  TrendingUp,
  MessageSquare,
  FileText,
  Hash,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Music,
  Video,
} from "lucide-react";

export default function TikTokOptimizer() {
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
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Music className="h-6 w-6 text-cyan-500" />
            <h1 className="text-xl font-bold">TikTok Content Optimizer</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="hooks" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="hooks" data-testid="tab-hooks"><Zap className="h-4 w-4 mr-1" />Hooks</TabsTrigger>
            <TabsTrigger value="trending" data-testid="tab-trending"><TrendingUp className="h-4 w-4 mr-1" />Trending</TabsTrigger>
            <TabsTrigger value="captions" data-testid="tab-captions"><MessageSquare className="h-4 w-4 mr-1" />Captions</TabsTrigger>
            <TabsTrigger value="scripts" data-testid="tab-scripts"><FileText className="h-4 w-4 mr-1" />Scripts</TabsTrigger>
            <TabsTrigger value="hashtags" data-testid="tab-hashtags"><Hash className="h-4 w-4 mr-1" />Hashtags</TabsTrigger>
          </TabsList>

          <TabsContent value="hooks"><HookGenerator copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="trending"><TrendingTopics /></TabsContent>
          <TabsContent value="captions"><TikTokCaptions copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="scripts"><ScriptWriter copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="hashtags"><TikTokHashtags copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function HookGenerator({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("educational");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tiktok/hooks", { topic, style });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Viral Hook Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Video Topic</Label>
            <Input placeholder="What's your video about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-hook-topic" />
          </div>
          <div>
            <Label>Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger data-testid="select-hook-style"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="entertaining">Entertaining</SelectItem>
                <SelectItem value="controversial">Controversial</SelectItem>
                <SelectItem value="storytelling">Storytelling</SelectItem>
                <SelectItem value="motivational">Motivational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-hooks">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Zap className="h-4 w-4 mr-2" />Generate Hooks</>}
          </Button>
        </CardContent>
      </Card>

      {result?.hooks?.map((hook: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="secondary">{hook.style}</Badge>
                <Badge variant={hook.estimatedViralPotential === "high" ? "default" : "outline"}>{hook.estimatedViralPotential} viral potential</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(hook.hook + "\n\n" + hook.script, `hook-${i}`)} data-testid={`button-copy-hook-${i}`}>
                {copiedField === `hook-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 p-3 rounded-lg border">
              <p className="font-bold text-lg">"{hook.hook}"</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Full Script:</p>
              <p className="text-sm whitespace-pre-line">{hook.script}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Video className="h-3 w-3" />{hook.visualCues}
            </div>
            <div className="text-xs text-muted-foreground">Best for: {hook.bestFor}</div>
          </CardContent>
        </Card>
      ))}

      {result?.hookFormulas && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Hook Formulas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.hookFormulas.map((formula: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg">
                  <p className="font-medium">{formula.formula}</p>
                  <p className="text-sm text-muted-foreground mt-1">Example: "{formula.example}"</p>
                  <p className="text-xs text-muted-foreground mt-1">Why it works: {formula.why}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TrendingTopics() {
  const [niche, setNiche] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tiktok/trending", { niche });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Trending Topics & Sounds</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Your Niche</Label>
            <Input placeholder="e.g., fitness, finance, comedy" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-trending-niche" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-find-trends">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><TrendingUp className="h-4 w-4 mr-2" />Find Trends</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.trendingTopics && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Trending Topics</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.trendingTopics.map((item: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.topic}</span>
                        <Badge variant={item.difficulty === "easy" ? "default" : "secondary"}>{item.difficulty}</Badge>
                        <Badge variant="outline">{item.estimatedLifespan}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-sm mt-1"><Sparkles className="h-3 w-3 inline mr-1" />{item.contentIdea}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.trendingSounds && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Music className="h-5 w-5" />Trending Sounds</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.trendingSounds.map((sound: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <p className="font-medium">{sound.sound}</p>
                      <p className="text-sm text-muted-foreground">{sound.usage}</p>
                      <p className="text-sm text-primary mt-1">Adaptation: {sound.adaptationIdea}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.contentIdeas && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Content Ideas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.contentIdeas.map((idea: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{idea.idea}</span>
                        <Badge variant="secondary">{idea.format}</Badge>
                        <Badge variant={idea.estimatedReach === "high" ? "default" : "outline"}>{idea.estimatedReach} reach</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Hook: "{idea.hook}"</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TikTokCaptions({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [hook, setHook] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tiktok/caption", { topic, hook });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Caption Writer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Video Topic</Label>
            <Input placeholder="What's the video about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-tiktok-caption-topic" />
          </div>
          <div>
            <Label>Video Hook (optional)</Label>
            <Input placeholder="What's your opening hook?" value={hook} onChange={(e) => setHook(e.target.value)} data-testid="input-tiktok-caption-hook" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-tiktok-captions">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Captions</>}
          </Button>
        </CardContent>
      </Card>

      {result?.captions?.map((caption: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg"><Badge variant="secondary">{caption.style}</Badge></CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(caption.caption + "\n\n" + caption.hashtags?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" "), `tkcap-${i}`)} data-testid={`button-copy-tkcap-${i}`}>
                {copiedField === `tkcap-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{caption.caption}</p>
            <p className="text-xs text-muted-foreground">CTA: {caption.cta}</p>
            <div className="flex flex-wrap gap-1">
              {caption.hashtags?.map((tag: string, j: number) => (
                <Badge key={j} variant="outline" className="text-xs">{tag.startsWith("#") ? tag : `#${tag}`}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScriptWriter({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("60 seconds");
  const [style, setStyle] = useState("educational");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tiktok/script", { topic, duration, style });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Video Script Writer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Video Topic</Label>
            <Input placeholder="What should the video teach/show?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-script-topic" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger data-testid="select-duration"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15 seconds">15 Seconds</SelectItem>
                  <SelectItem value="30 seconds">30 Seconds</SelectItem>
                  <SelectItem value="60 seconds">60 Seconds</SelectItem>
                  <SelectItem value="3 minutes">3 Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger data-testid="select-script-style"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="entertaining">Entertaining</SelectItem>
                  <SelectItem value="storytelling">Storytelling</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-script">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing...</> : <><FileText className="h-4 w-4 mr-2" />Write Script</>}
          </Button>
        </CardContent>
      </Card>

      {result?.scripts?.map((script: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{script.title}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {
                const fullScript = script.script?.map((s: any) => `[${s.timestamp}] ${s.dialogue}\nVisual: ${s.visual}\nText: ${s.text_overlay}`).join("\n\n") || "";
                copyToClipboard(fullScript, `script-${i}`);
              }} data-testid={`button-copy-script-${i}`}>
                {copiedField === `script-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 p-3 rounded-lg border">
              <p className="font-bold">Hook: "{script.hook}"</p>
            </div>
            <div className="space-y-2">
              {script.script?.map((segment: any, j: number) => (
                <div key={j} className="p-3 border rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{segment.timestamp}</Badge>
                  </div>
                  <p className="font-medium">{segment.dialogue}</p>
                  <p className="text-xs text-muted-foreground mt-1">Visual: {segment.visual}</p>
                  {segment.text_overlay && <p className="text-xs text-primary mt-1">Text overlay: {segment.text_overlay}</p>}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Duration: {script.duration}</span>
              <span>Sound: {script.sound}</span>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium">CTA: {script.cta}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TikTokHashtags({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tiktok/hashtags", { topic });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" />TikTok Hashtag Strategy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Topic / Keyword</Label>
            <Input placeholder="e.g., fitness tips, cooking hacks" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-tiktok-hashtag-topic" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-research-tiktok-hashtags">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Researching...</> : <><Hash className="h-4 w-4 mr-2" />Research Hashtags</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {[
            { title: "Viral Hashtags", data: result.viral, color: "text-red-500" },
            { title: "Niche Hashtags", data: result.niche, color: "text-blue-500" },
            { title: "Trending Now", data: result.trending, color: "text-green-500" },
            { title: "FYP Boosters", data: result.fyp, color: "text-purple-500" },
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg ${section.color}`}>{section.title}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(section.data?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" ") || "", section.title)} data-testid={`button-copy-tk-${section.title.toLowerCase().replace(/\s/g, "-")}`}>
                    {copiedField === section.title ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {section.data?.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary">{tag.startsWith("#") ? tag : `#${tag}`}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {result.sets?.map((set: any, i: number) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{set.name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(set.tags?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" ") || "", `tkset-${i}`)} data-testid={`button-copy-tkset-${i}`}>
                    {copiedField === `tkset-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {set.tags?.map((tag: string, j: number) => (
                    <Badge key={j} variant="outline">{tag.startsWith("#") ? tag : `#${tag}`}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
