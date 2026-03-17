import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft, Loader2, Copy, Check, Sparkles, Recycle, Youtube, Linkedin, Mail,
} from "lucide-react";
import { SiX, SiInstagram, SiTiktok } from "react-icons/si";

const PLATFORMS = [
  { id: "twitter", label: "X/Twitter", icon: SiX },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin },
  { id: "instagram", label: "Instagram", icon: SiInstagram },
  { id: "tiktok", label: "TikTok", icon: SiTiktok },
  { id: "email", label: "Email", icon: Mail },
  { id: "blog", label: "Blog", icon: Sparkles },
];

export default function ContentRepurposer() {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("blog post");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["twitter", "linkedin", "instagram", "tiktok", "email", "blog"]);
  const [result, setResult] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/repurpose/generate", { content, contentType, platforms: selectedPlatforms });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <Recycle className="h-6 w-6 text-green-500" />
            <h1 className="text-xl font-bold">Content Repurposing Engine</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Recycle className="h-5 w-5" />Paste Your Content</CardTitle>
            <p className="text-sm text-muted-foreground">Paste one piece of content and get 20+ pieces across every platform</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Original Content</Label>
              <Textarea placeholder="Paste your blog post, video script, podcast transcript, article, or any content..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[200px]" data-testid="input-original-content" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger data-testid="select-content-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog post">Blog Post</SelectItem>
                    <SelectItem value="video script">Video Script</SelectItem>
                    <SelectItem value="podcast transcript">Podcast Transcript</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="speech">Speech / Presentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Platforms</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {PLATFORMS.map((p) => (
                    <label key={p.id} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox checked={selectedPlatforms.includes(p.id)} onCheckedChange={() => togglePlatform(p.id)} data-testid={`checkbox-rp-${p.id}`} />
                      <p.icon className="h-3 w-3" />
                      <span className="text-xs">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={() => mutation.mutate()} disabled={!content || selectedPlatforms.length === 0 || mutation.isPending} className="w-full" data-testid="button-repurpose">
              {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Repurposing into {selectedPlatforms.length * 4}+ pieces...</> : <><Recycle className="h-4 w-4 mr-2" />Repurpose into {selectedPlatforms.length * 4}+ Pieces</>}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <>
            {result.summary && (
              <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{result.summary}</p></CardContent></Card>
            )}

            {result.pieces?.twitter && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><SiX className="h-4 w-4" />X / Twitter</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Standalone Tweets</Label>
                    {result.pieces.twitter.tweets?.map((tweet: string, i: number) => (
                      <div key={i} className="flex items-start justify-between p-3 border rounded-lg mt-2">
                        <p className="text-sm flex-1">{tweet}</p>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(tweet, `rp-tw-${i}`)} className="shrink-0">{copiedField === `rp-tw-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
                      </div>
                    ))}
                  </div>
                  {result.pieces.twitter.thread && (
                    <div>
                      <div className="flex items-center justify-between"><Label className="text-xs text-muted-foreground">Thread</Label>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.pieces.twitter.thread.map((t: string, i: number) => `${i + 1}/ ${t}`).join("\n\n"), "rp-thread")}>{copiedField === "rp-thread" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}Copy</Button></div>
                      <div className="space-y-1 mt-2">{result.pieces.twitter.thread.map((t: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2 border-l-2 border-primary/20 pl-3"><Badge variant="outline" className="text-xs shrink-0">{i + 1}</Badge><p className="text-xs">{t}</p></div>
                      ))}</div>
                    </div>
                  )}
                  {result.pieces.twitter.quoteCards && (
                    <div><Label className="text-xs text-muted-foreground">Quote Cards</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">{result.pieces.twitter.quoteCards.map((q: string, i: number) => (
                        <div key={i} className="p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border text-center cursor-pointer" onClick={() => copyToClipboard(q, `rp-qc-${i}`)}>
                          <p className="text-sm font-medium italic">"{q}"</p>
                        </div>
                      ))}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {result.pieces?.linkedin && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Linkedin className="h-4 w-4 text-blue-600" />LinkedIn</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between"><div className="flex-1"><Label className="text-xs text-muted-foreground">Post</Label><p className="text-sm whitespace-pre-line mt-1">{result.pieces.linkedin.post}</p></div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.pieces.linkedin.post, "rp-li-post")}>{copiedField === "rp-li-post" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button></div>
                  {result.pieces.linkedin.carouselSlides && (
                    <div><Label className="text-xs text-muted-foreground">Carousel Slides</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">{result.pieces.linkedin.carouselSlides.map((s: any, i: number) => (
                        <div key={i} className="p-3 border rounded-lg"><p className="font-medium text-xs">{s.headline}</p><p className="text-xs text-muted-foreground mt-1">{s.body}</p></div>
                      ))}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {result.pieces?.instagram && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><SiInstagram className="h-4 w-4 text-pink-500" />Instagram</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between"><div className="flex-1"><Label className="text-xs text-muted-foreground">Caption</Label><p className="text-sm whitespace-pre-line mt-1">{result.pieces.instagram.caption}</p></div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.pieces.instagram.caption + "\n\n" + result.pieces.instagram.hashtags?.join(" "), "rp-ig-cap")}>{copiedField === "rp-ig-cap" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button></div>
                  {result.pieces.instagram.reelScript && (
                    <div><Label className="text-xs text-muted-foreground">Reel Script</Label><p className="text-sm mt-1">{result.pieces.instagram.reelScript}</p></div>
                  )}
                  {result.pieces.instagram.hashtags && (
                    <div className="flex flex-wrap gap-1">{result.pieces.instagram.hashtags.map((h: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{h.startsWith("#") ? h : `#${h}`}</Badge>)}</div>
                  )}
                </CardContent>
              </Card>
            )}

            {result.pieces?.tiktok && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><SiTiktok className="h-4 w-4 text-cyan-500" />TikTok</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {result.pieces.tiktok.hooks && (
                    <div><Label className="text-xs text-muted-foreground">Hooks</Label>{result.pieces.tiktok.hooks.map((h: string, i: number) => (
                      <div key={i} className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 p-3 rounded-lg border mt-2"><p className="font-bold text-sm">"{h}"</p></div>
                    ))}</div>
                  )}
                  <div className="flex items-start justify-between"><div className="flex-1"><Label className="text-xs text-muted-foreground">60s Script</Label><p className="text-sm mt-1 whitespace-pre-line">{result.pieces.tiktok.script60s}</p></div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.pieces.tiktok.script60s, "rp-tk-60")}>{copiedField === "rp-tk-60" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button></div>
                </CardContent>
              </Card>
            )}

            {result.pieces?.email && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Mail className="h-4 w-4" />Email Newsletter</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs text-muted-foreground">Subject Line</Label><p className="text-sm font-medium">{result.pieces.email.subjectLine}</p></div>
                  <div className="flex items-start justify-between"><div className="flex-1"><Label className="text-xs text-muted-foreground">Newsletter</Label><p className="text-sm whitespace-pre-line mt-1">{result.pieces.email.newsletter}</p></div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.pieces.email.newsletter, "rp-email")}>{copiedField === "rp-email" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button></div>
                </CardContent>
              </Card>
            )}

            {result.bonusContent && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-yellow-500" />Bonus Content Ideas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {result.bonusContent.quoteGraphics && (
                    <div><Label className="text-xs text-muted-foreground">Shareable Quote Graphics</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">{result.bonusContent.quoteGraphics.map((q: string, i: number) => (
                        <div key={i} className="p-4 bg-gradient-to-br from-yellow-500/5 to-orange-500/10 rounded-lg border text-center cursor-pointer" onClick={() => copyToClipboard(q, `rp-bq-${i}`)}>
                          <p className="text-sm font-medium italic">"{q}"</p></div>
                      ))}</div>
                    </div>
                  )}
                  {result.bonusContent.pollIdeas && (
                    <div><Label className="text-xs text-muted-foreground">Poll Ideas</Label>
                      <ul className="mt-1 space-y-1">{result.bonusContent.pollIdeas.map((p: string, i: number) => <li key={i} className="text-sm">- {p}</li>)}</ul></div>
                  )}
                </CardContent>
              </Card>
            )}

            {result.repurposingSchedule && (
              <Card><CardContent className="pt-6"><div className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-1 text-primary shrink-0" /><div><Label className="text-xs text-muted-foreground">2-Week Posting Schedule</Label><p className="text-sm mt-1">{result.repurposingSchedule}</p></div></div></CardContent></Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
