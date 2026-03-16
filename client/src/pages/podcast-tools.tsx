import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  FileText,
  Clock,
  PenLine,
  Share2,
  Mail,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Mic,
  Video,
} from "lucide-react";

export default function PodcastTools() {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sharedTranscript, setSharedTranscript] = useState("");
  const [sharedShowNotes, setSharedShowNotes] = useState<any>(null);

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
            <Mic className="h-6 w-6 text-purple-500" />
            <h1 className="text-xl font-bold">Podcast Tools</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">Shared Transcript (used across all tabs)</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your podcast transcript here (optional — you can also just enter a topic in each tab)"
              value={sharedTranscript}
              onChange={(e) => setSharedTranscript(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-shared-transcript"
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="show-notes" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="show-notes" data-testid="tab-show-notes"><FileText className="h-4 w-4 mr-1" />Show Notes</TabsTrigger>
            <TabsTrigger value="blog" data-testid="tab-blog"><PenLine className="h-4 w-4 mr-1" />Blog Post</TabsTrigger>
            <TabsTrigger value="clips" data-testid="tab-clips"><Share2 className="h-4 w-4 mr-1" />Social Clips</TabsTrigger>
            <TabsTrigger value="newsletter" data-testid="tab-newsletter"><Mail className="h-4 w-4 mr-1" />Newsletter</TabsTrigger>
          </TabsList>

          <TabsContent value="show-notes">
            <ShowNotesGenerator
              transcript={sharedTranscript}
              copyToClipboard={copyToClipboard}
              copiedField={copiedField}
              onNotesGenerated={setSharedShowNotes}
            />
          </TabsContent>
          <TabsContent value="blog">
            <BlogPostGenerator transcript={sharedTranscript} showNotes={sharedShowNotes} copyToClipboard={copyToClipboard} copiedField={copiedField} />
          </TabsContent>
          <TabsContent value="clips">
            <SocialClips transcript={sharedTranscript} copyToClipboard={copyToClipboard} copiedField={copiedField} />
          </TabsContent>
          <TabsContent value="newsletter">
            <NewsletterGenerator transcript={sharedTranscript} showNotes={sharedShowNotes} copyToClipboard={copyToClipboard} copiedField={copiedField} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ShowNotesGenerator({ transcript, copyToClipboard, copiedField, onNotesGenerated }: { transcript: string; copyToClipboard: (t: string, f: string) => void; copiedField: string | null; onNotesGenerated: (notes: any) => void }) {
  const [topic, setTopic] = useState("");
  const [guestName, setGuestName] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/podcast/show-notes", { transcript: transcript || undefined, topic: topic || undefined, guestName });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      onNotesGenerated(data);
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Show Notes Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Episode Topic {!transcript && "(required if no transcript)"}</Label>
              <Input placeholder="What's this episode about?" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-episode-topic" />
            </div>
            <div>
              <Label>Guest Name (optional)</Label>
              <Input placeholder="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} data-testid="input-guest-name" />
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={(!topic && !transcript) || mutation.isPending} data-testid="button-generate-show-notes">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Show Notes</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{result.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => {
                  const text = `# ${result.title}\n\n${result.summary}\n\n## Description\n${result.description}\n\n## Key Takeaways\n${result.keyTakeaways?.map((t: string) => `- ${t}`).join("\n")}\n\n## Timestamps\n${result.timestamps?.map((t: any) => `${t.time} - ${t.topic}`).join("\n")}`;
                  copyToClipboard(text, "show-notes-all");
                }} data-testid="button-copy-show-notes">
                  {copiedField === "show-notes-all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">Summary</h3>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Description</h3>
                <p className="text-sm whitespace-pre-line">{result.description}</p>
              </div>
            </CardContent>
          </Card>

          {result.timestamps && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5" />Timestamps</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {result.timestamps.map((ts: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                      <Badge variant="outline" className="font-mono text-xs min-w-[60px] justify-center">{ts.time}</Badge>
                      <span className="text-sm">{ts.topic}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.keyTakeaways && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Key Takeaways</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.keyTakeaways.map((takeaway: string, i: number) => (
                    <li key={i} className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-yellow-500 shrink-0" /><span className="text-sm">{takeaway}</span></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.quotes && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Memorable Quotes</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.quotes.map((quote: string, i: number) => (
                    <div key={i} className="border-l-4 border-primary pl-4 py-1">
                      <p className="text-sm italic">"{quote}"</p>
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

function BlogPostGenerator({ transcript, showNotes, copyToClipboard, copiedField }: { transcript: string; showNotes: any; copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/podcast/blog-post", { transcript: transcript || undefined, topic: topic || undefined, showNotes });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><PenLine className="h-5 w-5" />Blog Post Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Topic {!transcript && "(required if no transcript)"}</Label>
            <Input placeholder="Blog post topic" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-blog-topic" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={(!topic && !transcript) || mutation.isPending} data-testid="button-generate-blog">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing...</> : <><PenLine className="h-4 w-4 mr-2" />Generate Blog Post</>}
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
                  {result.metaDescription && <p className="text-xs text-muted-foreground mt-1">{result.metaDescription}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.blogPost || "", "blog-post")} data-testid="button-copy-blog">
                  {copiedField === "blog-post" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">{result.blogPost}</div>
            </CardContent>
          </Card>

          {result.socialSnippets && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Social Media Promotion</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(result.socialSnippets).map(([platform, text]: [string, any]) => (
                  <div key={platform} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="capitalize">{platform}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(text, `social-${platform}`)} data-testid={`button-copy-social-${platform}`}>
                        {copiedField === `social-${platform}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-sm">{text}</p>
                  </div>
                ))}
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

function SocialClips({ transcript, copyToClipboard, copiedField }: { transcript: string; copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/podcast/social-clips", { transcript: transcript || undefined, topic: topic || undefined });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" />Social Clips Identifier</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Topic {!transcript && "(required if no transcript)"}</Label>
            <Input placeholder="Episode topic" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-clips-topic" />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={(!topic && !transcript) || mutation.isPending} data-testid="button-find-clips">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Video className="h-4 w-4 mr-2" />Find Clip-Worthy Moments</>}
          </Button>
        </CardContent>
      </Card>

      {result?.clips?.map((clip: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {clip.title}
                <Badge variant="secondary">{clip.platform}</Badge>
                <Badge variant={clip.viralPotential === "high" ? "default" : "outline"}>{clip.viralPotential}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(clip.caption + "\n\n" + clip.hashtags?.join(" "), `clip-${i}`)} data-testid={`button-copy-clip-${i}`}>
                {copiedField === `clip-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <p className="text-sm italic">"{clip.quote}"</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Hook: </span>{clip.hook}</div>
              <div><span className="text-muted-foreground">Length: </span>{clip.estimatedLength}</div>
            </div>
            <p className="text-sm">{clip.caption}</p>
            <div className="flex flex-wrap gap-1">
              {clip.hashtags?.map((tag: string, j: number) => (
                <Badge key={j} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{clip.why}</p>
          </CardContent>
        </Card>
      ))}

      {result?.repurposingStrategy && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Repurposing Strategy</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.repurposingStrategy.map((strategy: string, i: number) => (
                <li key={i} className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-yellow-500 shrink-0" /><span className="text-sm">{strategy}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NewsletterGenerator({ transcript, showNotes, copyToClipboard, copiedField }: { transcript: string; showNotes: any; copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [topic, setTopic] = useState("");
  const [audienceName, setAudienceName] = useState("");
  const [result, setResult] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/podcast/newsletter", { transcript: transcript || undefined, topic: topic || undefined, showNotes, audienceName });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Email Newsletter Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Topic {!transcript && "(required if no transcript)"}</Label>
              <Input placeholder="Newsletter topic" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-newsletter-topic" />
            </div>
            <div>
              <Label>Audience Name</Label>
              <Input placeholder="e.g., subscribers, community" value={audienceName} onChange={(e) => setAudienceName(e.target.value)} data-testid="input-audience-name" />
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={(!topic && !transcript) || mutation.isPending} data-testid="button-generate-newsletter">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing...</> : <><Mail className="h-4 w-4 mr-2" />Generate Newsletter</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.subjectLines && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Subject Line Options</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.subjectLines.map((subject: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-sm font-medium">{subject}</span>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(subject, `subject-${i}`)} data-testid={`button-copy-subject-${i}`}>
                        {copiedField === `subject-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Newsletter Content</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.newsletter || "", "newsletter")} data-testid="button-copy-newsletter">
                  {copiedField === "newsletter" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">{result.newsletter}</div>
            </CardContent>
          </Card>

          {result.sections && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Section Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.sections.map((section: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{section.title}</span>
                        <Badge variant="outline" className="text-xs">{section.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{section.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.sendTimeSuggestion && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium">Best send time:</span>
                  <span>{result.sendTimeSuggestion}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
