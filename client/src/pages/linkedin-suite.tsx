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
  ArrowLeft,
  PenLine,
  Layers,
  FileText,
  Hash,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Linkedin,
} from "lucide-react";

export default function LinkedInSuite() {
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
            <Linkedin className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold">LinkedIn Content Suite</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="posts" data-testid="tab-posts"><PenLine className="h-4 w-4 mr-1" />Posts</TabsTrigger>
            <TabsTrigger value="carousel" data-testid="tab-carousel"><Layers className="h-4 w-4 mr-1" />Carousel</TabsTrigger>
            <TabsTrigger value="article" data-testid="tab-article"><FileText className="h-4 w-4 mr-1" />Articles</TabsTrigger>
            <TabsTrigger value="hashtags" data-testid="tab-li-hashtags"><Hash className="h-4 w-4 mr-1" />Hashtags</TabsTrigger>
          </TabsList>

          <TabsContent value="posts"><PostWriter copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="carousel"><CarouselGenerator copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="article"><ArticleOptimizer copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="hashtags"><LinkedInHashtags copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PostWriter({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [type, setType] = useState("thought leadership");
  const [audience, setAudience] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/linkedin/post", { topic, tone, type, audience });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><PenLine className="h-5 w-5" />LinkedIn Post Writer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Topic / Subject</Label>
            <Input placeholder="What do you want to post about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-li-post-topic" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger data-testid="select-li-tone"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Post Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger data-testid="select-li-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="thought leadership">Thought Leadership</SelectItem>
                  <SelectItem value="personal story">Personal Story</SelectItem>
                  <SelectItem value="how-to">How-To</SelectItem>
                  <SelectItem value="industry news">Industry News</SelectItem>
                  <SelectItem value="case study">Case Study</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Input placeholder="e.g., C-suite, marketers" value={audience} onChange={(e) => setAudience(e.target.value)} data-testid="input-li-audience" />
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-li-posts">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing...</> : <><PenLine className="h-4 w-4 mr-2" />Write Posts</>}
          </Button>
        </CardContent>
      </Card>

      {result?.posts?.map((post: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="secondary">{post.style}</Badge>
                <Badge variant={post.estimatedReach === "high" ? "default" : "outline"}>{post.estimatedReach} reach</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(post.post + "\n\n" + post.hashtags?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" "), `lipost-${i}`)} data-testid={`button-copy-lipost-${i}`}>
                {copiedField === `lipost-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
              <p className="font-bold">Hook: {post.hook}</p>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg whitespace-pre-line text-sm">{post.post}</div>
            <div className="flex flex-wrap gap-1">
              {post.hashtags?.map((tag: string, j: number) => (
                <Badge key={j} variant="outline" className="text-xs">{tag.startsWith("#") ? tag : `#${tag}`}</Badge>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Best time: {post.bestTimeToPost}</span>
              <span>Tip: {post.engagementTip}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CarouselGenerator({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState("10");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/linkedin/carousel", { topic, slides: parseInt(slides) });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Carousel Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Carousel Topic</Label>
            <Input placeholder="What should the carousel teach?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-carousel-topic" />
          </div>
          <div>
            <Label>Number of Slides</Label>
            <Select value={slides} onValueChange={setSlides}>
              <SelectTrigger data-testid="select-slides"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Slides</SelectItem>
                <SelectItem value="8">8 Slides</SelectItem>
                <SelectItem value="10">10 Slides</SelectItem>
                <SelectItem value="12">12 Slides</SelectItem>
                <SelectItem value="15">15 Slides</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-carousel">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Layers className="h-4 w-4 mr-2" />Generate Carousel</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">{result.title}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.slides?.map((slide: any) => (
                  <div key={slide.slideNumber} className={`p-4 border rounded-lg ${slide.type === "cover" ? "bg-blue-500/10 border-blue-500/30" : slide.type === "cta" ? "bg-green-500/10 border-green-500/30" : ""}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">Slide {slide.slideNumber}</Badge>
                      <Badge variant="secondary" className="text-xs">{slide.type}</Badge>
                    </div>
                    <p className="font-bold text-sm">{slide.headline}</p>
                    <p className="text-xs text-muted-foreground mt-1">{slide.body}</p>
                    {slide.designNote && <p className="text-xs text-primary mt-2 italic">{slide.designNote}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Carousel Caption</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.caption + "\n\n" + result.hashtags?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" "), "carousel-caption")} data-testid="button-copy-carousel-caption">
                  {copiedField === "carousel-caption" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{result.caption}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {result.hashtags?.map((tag: string, j: number) => (
                  <Badge key={j} variant="outline" className="text-xs">{tag.startsWith("#") ? tag : `#${tag}`}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ArticleOptimizer({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState("medium (800-1200 words)");
  const [audience, setAudience] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/linkedin/article", { topic, length, audience });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Article Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Article Topic</Label>
            <Input placeholder="What should the article cover?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-article-topic" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger data-testid="select-article-length"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short (500-800 words)">Short (500-800 words)</SelectItem>
                  <SelectItem value="medium (800-1200 words)">Medium (800-1200 words)</SelectItem>
                  <SelectItem value="long (1200-2000 words)">Long (1200-2000 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Input placeholder="e.g., executives, entrepreneurs" value={audience} onChange={(e) => setAudience(e.target.value)} data-testid="input-article-audience" />
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-generate-article">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing...</> : <><FileText className="h-4 w-4 mr-2" />Generate Article</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{result.title}</CardTitle>
                  {result.subtitle && <p className="text-sm text-muted-foreground mt-1">{result.subtitle}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.article || "", "article")} data-testid="button-copy-article">
                  {copiedField === "article" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">{result.article}</div>
            </CardContent>
          </Card>

          {result.promotionPost && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Promotion Post</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.promotionPost, "promo-post")} data-testid="button-copy-promo-post">
                    {copiedField === "promo-post" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{result.promotionPost}</p>
              </CardContent>
            </Card>
          )}

          {result.seoKeywords && (
            <Card>
              <CardHeader><CardTitle className="text-lg">SEO Keywords</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.seoKeywords.map((kw: string, i: number) => (
                    <Badge key={i} variant="secondary">{kw}</Badge>
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

function LinkedInHashtags({ copyToClipboard, copiedField }: { copyToClipboard: (text: string, field: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/linkedin/hashtags", { topic });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" />LinkedIn Hashtag Research</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Topic / Industry</Label>
            <Input placeholder="e.g., leadership, SaaS, healthcare" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-li-hashtag-topic" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!topic || mutation.isPending} data-testid="button-research-li-hashtags">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Researching...</> : <><Hash className="h-4 w-4 mr-2" />Research Hashtags</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {[
            { title: "Top Hashtags", data: result.topHashtags },
            { title: "Niche Hashtags", data: result.nicheHashtags },
            { title: "Trending", data: result.trendingHashtags },
          ].map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(section.data?.map((t: string) => t.startsWith("#") ? t : `#${t}`).join(" ") || "", section.title)} data-testid={`button-copy-li-${section.title.toLowerCase().replace(/\s/g, "-")}`}>
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

          {result.engagementTips && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Engagement Tips</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.engagementTips.map((tip: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">{tip.tip}</span>
                      <div className="flex gap-2">
                        <Badge variant={tip.impact === "high" ? "default" : "secondary"}>{tip.impact} impact</Badge>
                        <Badge variant="outline">{tip.effort}</Badge>
                      </div>
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
