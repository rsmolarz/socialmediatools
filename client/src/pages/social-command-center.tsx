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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  Rocket,
  Calendar,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Youtube,
  Linkedin,
  Hash,
} from "lucide-react";
import { SiInstagram, SiTiktok, SiX } from "react-icons/si";

const PLATFORMS = [
  { id: "youtube", label: "YouTube", icon: Youtube, color: "text-red-500" },
  { id: "instagram", label: "Instagram", icon: SiInstagram, color: "text-pink-500" },
  { id: "tiktok", label: "TikTok", icon: SiTiktok, color: "text-cyan-500" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-600" },
  { id: "twitter", label: "X / Twitter", icon: SiX, color: "text-foreground" },
];

export default function SocialCommandCenter() {
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
            <Rocket className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold">Social Media Command Center</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="generate" data-testid="tab-generate"><Rocket className="h-4 w-4 mr-1" />Generate All</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-sm-calendar"><Calendar className="h-4 w-4 mr-1" />Content Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="generate"><CrossPlatformGenerator copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="calendar"><CrossPlatformCalendar /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CrossPlatformGenerator({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional yet engaging");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["youtube", "instagram", "tiktok", "linkedin", "twitter"]);
  const [result, setResult] = useState<any>(null);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social/generate-all", { topic, platforms: selectedPlatforms, tone });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5" />Cross-Platform Content Generator</CardTitle>
          <p className="text-sm text-muted-foreground">Enter one topic and get optimized content for every platform</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Content Topic</Label>
            <Input placeholder="e.g., 5 ways to build passive income as a doctor" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-cross-topic" />
          </div>
          <div>
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger data-testid="select-cross-tone"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional yet engaging">Professional Yet Engaging</SelectItem>
                <SelectItem value="casual and fun">Casual and Fun</SelectItem>
                <SelectItem value="authoritative">Authoritative</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="motivational">Motivational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Platforms</Label>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map((platform) => (
                <label key={platform.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                    data-testid={`checkbox-${platform.id}`}
                  />
                  <platform.icon className={`h-4 w-4 ${platform.color}`} />
                  <span className="text-sm">{platform.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || selectedPlatforms.length === 0 || mutation.isPending} data-testid="button-generate-all" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating for {selectedPlatforms.length} platforms...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Content for {selectedPlatforms.length} Platforms</>}
          </Button>
        </CardContent>
      </Card>

      {result?.platforms && (
        <>
          {result.platforms.youtube && (
            <PlatformCard
              platform="YouTube"
              icon={<Youtube className="h-5 w-5 text-red-500" />}
              copyToClipboard={copyToClipboard}
              copiedField={copiedField}
            >
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Title</Label><p className="font-medium">{result.platforms.youtube.title}</p></div>
                <div><Label className="text-xs text-muted-foreground">Thumbnail Text</Label><p className="font-bold text-lg">{result.platforms.youtube.thumbnailText}</p></div>
                <div><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm whitespace-pre-line">{result.platforms.youtube.description}</p></div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">{result.platforms.youtube.tags?.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}</div>
                </div>
                {result.platforms.youtube.contentOutline && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Content Outline</Label>
                    <ul className="text-sm mt-1 space-y-1">{result.platforms.youtube.contentOutline.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
                  </div>
                )}
              </div>
            </PlatformCard>
          )}

          {result.platforms.instagram && (
            <PlatformCard
              platform="Instagram"
              icon={<SiInstagram className="h-5 w-5 text-pink-500" />}
              copyToClipboard={copyToClipboard}
              copiedField={copiedField}
              copyContent={result.platforms.instagram.caption + "\n\n" + result.platforms.instagram.hashtags?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" ")}
            >
              <div className="space-y-3">
                <div><Badge variant="secondary">{result.platforms.instagram.contentType}</Badge></div>
                <div><Label className="text-xs text-muted-foreground">Caption</Label><p className="text-sm whitespace-pre-line">{result.platforms.instagram.caption}</p></div>
                <div><Label className="text-xs text-muted-foreground">Reel Hook</Label><p className="text-sm font-medium">{result.platforms.instagram.reelHook}</p></div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hashtags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">{result.platforms.instagram.hashtags?.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t.startsWith("#") ? t : `#${t}`}</Badge>)}</div>
                </div>
                {result.platforms.instagram.storyIdeas && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Story Ideas</Label>
                    <ul className="text-sm mt-1 space-y-1">{result.platforms.instagram.storyIdeas.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
                  </div>
                )}
              </div>
            </PlatformCard>
          )}

          {result.platforms.tiktok && (
            <PlatformCard
              platform="TikTok"
              icon={<SiTiktok className="h-5 w-5 text-cyan-500" />}
              copyToClipboard={copyToClipboard}
              copiedField={copiedField}
              copyContent={result.platforms.tiktok.script}
            >
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 p-3 rounded-lg border">
                  <p className="font-bold">Hook: "{result.platforms.tiktok.hook}"</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Script</Label><p className="text-sm whitespace-pre-line">{result.platforms.tiktok.script}</p></div>
                <div><Label className="text-xs text-muted-foreground">Caption</Label><p className="text-sm">{result.platforms.tiktok.caption}</p></div>
                <div><Label className="text-xs text-muted-foreground">Sound</Label><p className="text-sm">{result.platforms.tiktok.sound}</p></div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hashtags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">{result.platforms.tiktok.hashtags?.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t.startsWith("#") ? t : `#${t}`}</Badge>)}</div>
                </div>
              </div>
            </PlatformCard>
          )}

          {result.platforms.linkedin && (
            <PlatformCard
              platform="LinkedIn"
              icon={<Linkedin className="h-5 w-5 text-blue-600" />}
              copyToClipboard={copyToClipboard}
              copiedField={copiedField}
              copyContent={result.platforms.linkedin.post + "\n\n" + result.platforms.linkedin.hashtags?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" ")}
            >
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Post</Label><div className="bg-muted/30 p-4 rounded-lg text-sm whitespace-pre-line">{result.platforms.linkedin.post}</div></div>
                <div><Label className="text-xs text-muted-foreground">Engagement Question</Label><p className="text-sm font-medium">{result.platforms.linkedin.engagementQuestion}</p></div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hashtags</Label>
                  <div className="flex flex-wrap gap-1 mt-1">{result.platforms.linkedin.hashtags?.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t.startsWith("#") ? t : `#${t}`}</Badge>)}</div>
                </div>
              </div>
            </PlatformCard>
          )}

          {result.platforms.twitter && (
            <PlatformCard
              platform="X / Twitter"
              icon={<SiX className="h-5 w-5" />}
              copyToClipboard={copyToClipboard}
              copiedField={copiedField}
            >
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tweet Variations</Label>
                  {result.platforms.twitter.tweets?.map((tweet: string, i: number) => (
                    <div key={i} className="flex items-start justify-between p-3 border rounded-lg mt-2">
                      <p className="text-sm flex-1">{tweet}</p>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(tweet, `tweet-${i}`)} className="ml-2 shrink-0">
                        {copiedField === `tweet-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  ))}
                </div>
                {result.platforms.twitter.thread && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Thread</Label>
                    <div className="space-y-2 mt-2">
                      {result.platforms.twitter.thread.map((tweet: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 border-l-2 border-primary/30 pl-4">
                          <Badge variant="outline" className="text-xs shrink-0">{i + 1}/{result.platforms.twitter.thread.length}</Badge>
                          <p className="text-sm">{tweet}</p>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(result.platforms.twitter.thread.map((t: string, i: number) => `${i + 1}/ ${t}`).join("\n\n"), "thread")} data-testid="button-copy-thread">
                      {copiedField === "thread" ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}Copy Thread
                    </Button>
                  </div>
                )}
              </div>
            </PlatformCard>
          )}

          {result.crossPlatformStrategy && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Cross-Platform Strategy</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.crossPlatformStrategy.postingOrder && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Posting Order</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.crossPlatformStrategy.postingOrder.map((p: string, i: number) => (
                        <div key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-foreground">→</span>}
                          <Badge variant="secondary">{p}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.crossPlatformStrategy.timingGap && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Timing Between Posts</Label>
                    <p className="text-sm">{result.crossPlatformStrategy.timingGap}</p>
                  </div>
                )}
                {result.crossPlatformStrategy.adaptationNotes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Adaptation Notes</Label>
                    <ul className="text-sm mt-1 space-y-1">
                      {result.crossPlatformStrategy.adaptationNotes.map((note: string, i: number) => (
                        <li key={i} className="flex items-start gap-2"><Sparkles className="h-3 w-3 mt-1 text-yellow-500 shrink-0" />{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {result.contentCalendarSuggestion && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-primary shrink-0" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Content Calendar Suggestion</Label>
                    <p className="text-sm mt-1">{result.contentCalendarSuggestion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function PlatformCard({ platform, icon, children, copyToClipboard, copiedField, copyContent }: {
  platform: string;
  icon: any;
  children: any;
  copyToClipboard: (t: string, f: string) => void;
  copiedField: string | null;
  copyContent?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">{icon}{platform}</CardTitle>
          {copyContent && (
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(copyContent, `platform-${platform}`)} data-testid={`button-copy-${platform.toLowerCase()}`}>
              {copiedField === `platform-${platform}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function CrossPlatformCalendar() {
  const [niche, setNiche] = useState("");
  const [weeks, setWeeks] = useState("1");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social/content-calendar", { niche, weeks: parseInt(weeks) });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Cross-Platform Content Calendar</CardTitle>
          <p className="text-sm text-muted-foreground">Get a full week planned across all your platforms</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Your Niche</Label>
              <Input placeholder="e.g., physician finance, fitness" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-calendar-niche" />
            </div>
            <div>
              <Label>Weeks</Label>
              <Select value={weeks} onValueChange={setWeeks}>
                <SelectTrigger data-testid="select-calendar-weeks"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Week</SelectItem>
                  <SelectItem value="2">2 Weeks</SelectItem>
                  <SelectItem value="4">4 Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-generate-sm-calendar" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Planning your week...</> : <><Calendar className="h-4 w-4 mr-2" />Generate Content Calendar</>}
          </Button>
        </CardContent>
      </Card>

      {result?.weeklyTheme && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Badge variant="default" className="text-sm px-4 py-1">Weekly Theme: {result.weeklyTheme}</Badge>
            </div>
            {result.contentPillars && (
              <div className="flex justify-center flex-wrap gap-2 mt-3">
                {result.contentPillars.map((pillar: string, i: number) => (
                  <Badge key={i} variant="outline">{pillar}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result?.calendar?.map((day: any, i: number) => (
        <Card key={i}>
          <CardHeader><CardTitle className="text-lg">{day.day}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {day.posts?.map((post: any, j: number) => {
                const platformInfo = PLATFORMS.find((p) => p.label.toLowerCase() === post.platform?.toLowerCase() || p.id === post.platform?.toLowerCase());
                return (
                  <div key={j} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {platformInfo && <platformInfo.icon className={`h-3 w-3 ${platformInfo.color}`} />}
                        {post.platform}
                      </Badge>
                      <Badge variant="outline">{post.contentType}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{post.time}</span>
                    </div>
                    <p className="text-sm font-medium">{post.topic}</p>
                    <p className="text-xs text-muted-foreground mt-1">{post.caption}</p>
                    {post.hashtags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.hashtags.map((tag: string, k: number) => (
                          <Badge key={k} variant="outline" className="text-xs">{tag.startsWith("#") ? tag : `#${tag}`}</Badge>
                        ))}
                      </div>
                    )}
                    {post.notes && <p className="text-xs text-primary mt-1">{post.notes}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {result?.strategy && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Strategy Tips</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.strategy.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-yellow-500 shrink-0" /><span className="text-sm">{tip}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
