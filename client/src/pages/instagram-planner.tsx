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
  Hash,
  MessageSquare,
  Clock,
  Calendar,
  Loader2,
  Copy,
  Check,
  Instagram,
  Sparkles,
} from "lucide-react";

export default function InstagramPlanner() {
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
            <Instagram className="h-6 w-6 text-pink-500" />
            <h1 className="text-xl font-bold">Instagram Content Planner</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="hashtags" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="hashtags" data-testid="tab-hashtags"><Hash className="h-4 w-4 mr-1" />Hashtags</TabsTrigger>
            <TabsTrigger value="captions" data-testid="tab-captions"><MessageSquare className="h-4 w-4 mr-1" />Captions</TabsTrigger>
            <TabsTrigger value="best-time" data-testid="tab-best-time"><Clock className="h-4 w-4 mr-1" />Best Time</TabsTrigger>
            <TabsTrigger value="calendar" data-testid="tab-calendar"><Calendar className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="hashtags"><HashtagResearch copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="captions"><CaptionGenerator copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="best-time"><BestTimeToPost /></TabsContent>
          <TabsContent value="calendar"><ContentCalendar /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function HashtagResearch({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/instagram/hashtags", { topic, niche });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" />Hashtag Research</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Topic / Keyword</Label>
              <Input placeholder="e.g., fitness motivation, real estate investing" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-hashtag-topic" />
            </div>
            <div>
              <Label>Niche (optional)</Label>
              <Input placeholder="e.g., health & wellness, business" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-hashtag-niche" />
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-research-hashtags">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Researching...</> : <><Sparkles className="h-4 w-4 mr-2" />Research Hashtags</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {[
            { title: "High Volume", data: result.primaryHashtags, color: "text-red-500" },
            { title: "Niche Specific", data: result.nicheHashtags, color: "text-blue-500" },
            { title: "Low Competition", data: result.lowCompetition, color: "text-green-500" },
            { title: "Branded", data: result.branded, color: "text-purple-500" },
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg ${section.color}`}>{section.title}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(section.data?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" ") || "", section.title)} data-testid={`button-copy-${section.title.toLowerCase().replace(/\s/g, "-")}`}>
                    {copiedField === section.title ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {section.data?.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => copyToClipboard(tag.startsWith("#") ? tag : `#${tag}`, `tag-${i}`)}>
                      {tag.startsWith("#") ? tag : `#${tag}`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {result.hashtagSets?.map((set: any, i: number) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{set.name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(set.tags?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" ") || "", `set-${i}`)} data-testid={`button-copy-set-${i}`}>
                    {copiedField === `set-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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

          {result.tips && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Strategy Tips</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.tips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-yellow-500 shrink-0" /><span>{tip}</span></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function CaptionGenerator({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [type, setType] = useState("feed post");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/instagram/caption", { topic, tone, type });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Caption Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Topic / Subject</Label>
            <Input placeholder="What's your post about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-caption-topic" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger data-testid="select-tone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Post Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed post">Feed Post</SelectItem>
                  <SelectItem value="reel">Reel</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-captions">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Captions</>}
          </Button>
        </CardContent>
      </Card>

      {result?.captions?.map((caption: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="secondary">{caption.style}</Badge>
                <Badge variant={caption.estimatedEngagement === "high" ? "default" : "outline"}>{caption.estimatedEngagement} engagement</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(caption.caption + "\n\n" + caption.hashtags?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" "), `caption-${i}`)} data-testid={`button-copy-caption-${i}`}>
                {copiedField === `caption-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg text-sm font-medium text-primary">Hook: {caption.hook}</div>
            <p className="whitespace-pre-line text-sm">{caption.caption}</p>
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

function BestTimeToPost() {
  const [niche, setNiche] = useState("");
  const [timezone, setTimezone] = useState("EST");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/instagram/best-time", { niche, timezone });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Best Time to Post</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Your Niche</Label>
              <Input placeholder="e.g., fitness, business, food" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-niche" />
            </div>
            <div>
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger data-testid="select-timezone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EST">Eastern (EST)</SelectItem>
                  <SelectItem value="CST">Central (CST)</SelectItem>
                  <SelectItem value="MST">Mountain (MST)</SelectItem>
                  <SelectItem value="PST">Pacific (PST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-analyze-time">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="h-4 w-4 mr-2" />Analyze Best Times</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.weeklySchedule && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Weekly Posting Schedule</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Day</th>
                        <th className="text-left p-2">Feed Post</th>
                        <th className="text-left p-2">Reels</th>
                        <th className="text-left p-2">Stories</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.weeklySchedule).map(([day, times]: [string, any]) => (
                        <tr key={day} className="border-b">
                          <td className="p-2 font-medium">{day}</td>
                          <td className="p-2">{times.feed}</td>
                          <td className="p-2">{times.reels}</td>
                          <td className="p-2">{times.stories}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {result.bestTimes && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Best Times by Day</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.bestTimes.map((item: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="font-medium">{item.day}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.times?.map((time: string, j: number) => (
                          <Badge key={j} variant={item.engagement === "high" ? "default" : "secondary"}>{time}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.insights && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Insights</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.insights.map((insight: string, i: number) => (
                    <li key={i} className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-yellow-500 shrink-0" /><span>{insight}</span></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ContentCalendar() {
  const [niche, setNiche] = useState("");
  const [weeks, setWeeks] = useState("2");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/instagram/content-calendar", { niche, weeks: parseInt(weeks) });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Content Calendar Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Your Niche</Label>
              <Input placeholder="e.g., fitness coaching, real estate" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-calendar-niche" />
            </div>
            <div>
              <Label>Number of Weeks</Label>
              <Select value={weeks} onValueChange={setWeeks}>
                <SelectTrigger data-testid="select-weeks"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Week</SelectItem>
                  <SelectItem value="2">2 Weeks</SelectItem>
                  <SelectItem value="4">4 Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-generate-calendar">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Calendar</>}
          </Button>
        </CardContent>
      </Card>

      {result?.calendar?.map((week: any, wi: number) => (
        <Card key={wi}>
          <CardHeader><CardTitle className="text-lg">Week {week.week}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {week.days?.map((day: any, di: number) => (
                <div key={di} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">{day.day}</span>
                    <Badge variant="secondary">{day.contentType}</Badge>
                    <Badge variant="outline">{day.contentPillar}</Badge>
                  </div>
                  <p className="text-sm font-medium">{day.topic}</p>
                  <p className="text-xs text-muted-foreground mt-1">{day.caption}</p>
                  {day.visualNotes && <p className="text-xs text-muted-foreground italic mt-1">Visual: {day.visualNotes}</p>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {day.hashtags?.map((tag: string, j: number) => (
                      <Badge key={j} variant="outline" className="text-xs">{tag.startsWith("#") ? tag : `#${tag}`}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {result?.contentMix && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Content Mix</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(result.contentMix).map(([key, value]: [string, any]) => (
                <div key={key} className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-sm text-muted-foreground capitalize">{key}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
