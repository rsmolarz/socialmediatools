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
  ArrowLeft, Loader2, Copy, Check, Sparkles, Users, Search, Mail, Handshake, AlertTriangle,
} from "lucide-react";

export default function CollabFinder() {
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
            <Handshake className="h-6 w-6 text-violet-500" />
            <h1 className="text-xl font-bold">Collaboration Finder</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="find" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="find" data-testid="tab-find"><Search className="h-4 w-4 mr-1" />Find Partners</TabsTrigger>
            <TabsTrigger value="outreach" data-testid="tab-outreach"><Mail className="h-4 w-4 mr-1" />Outreach</TabsTrigger>
          </TabsList>
          <TabsContent value="find"><PartnerFinder copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="outreach"><OutreachWriter copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PartnerFinder({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("all platforms");
  const [audienceSize, setAudienceSize] = useState("");
  const [goals, setGoals] = useState("");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/collab/find", { niche, platform, audienceSize, goals }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Find Collaboration Partners</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Your Niche</Label><Input placeholder="e.g., physician finance, fitness" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-collab-niche" /></div>
            <div><Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}><SelectTrigger data-testid="select-collab-platform"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all platforms">All Platforms</SelectItem><SelectItem value="YouTube">YouTube</SelectItem><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="TikTok">TikTok</SelectItem><SelectItem value="LinkedIn">LinkedIn</SelectItem><SelectItem value="Twitter">X/Twitter</SelectItem><SelectItem value="Podcast">Podcast</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Partner Audience Size</Label><Input placeholder="e.g., 10K-100K" value={audienceSize} onChange={(e) => setAudienceSize(e.target.value)} data-testid="input-audience-size" /></div>
            <div><Label>Collaboration Goals</Label><Input placeholder="e.g., cross-promote, grow audience" value={goals} onChange={(e) => setGoals(e.target.value)} data-testid="input-collab-goals" /></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!niche || mutation.isPending} data-testid="button-find-partners" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Finding partners...</> : <><Search className="h-4 w-4 mr-2" />Find Collaboration Partners</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.idealPartnerProfile && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Ideal Partner Profile</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Complementary Niches</Label>
                  <div className="flex flex-wrap gap-2 mt-1">{result.idealPartnerProfile.niches?.map((n: string, i: number) => <Badge key={i} variant="secondary">{n}</Badge>)}</div></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Audience Size</Label><p className="text-sm">{result.idealPartnerProfile.audienceSizeRange}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Min Engagement</Label><p className="text-sm">{result.idealPartnerProfile.engagementRate}</p></div>
                </div>
                <div><Label className="text-xs text-muted-foreground">Content Style Match</Label><p className="text-sm">{result.idealPartnerProfile.contentStyle}</p></div>
                {result.idealPartnerProfile.redFlags && (
                  <div><Label className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Red Flags</Label>
                    <ul className="text-xs text-muted-foreground mt-1">{result.idealPartnerProfile.redFlags.map((f: string, i: number) => <li key={i}>- {f}</li>)}</ul></div>
                )}
              </CardContent>
            </Card>
          )}

          {result.collabIdeas && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Collaboration Ideas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">{result.collabIdeas.map((idea: any, i: number) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default">{idea.type}</Badge>
                      <Badge variant={idea.effort === "easy" ? "secondary" : "outline"}>{idea.effort}</Badge>
                      {idea.platforms?.map((p: string, j: number) => <Badge key={j} variant="outline" className="text-xs">{p}</Badge>)}
                    </div>
                    <p className="text-sm font-medium">{idea.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Expected reach: {idea.expectedReach}</p>
                    <p className="text-xs text-primary mt-1">Plan: {idea.contentPlan}</p>
                  </div>
                ))}</div>
              </CardContent>
            </Card>
          )}

          {result.outreachTemplates && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Outreach Templates</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {result.outreachTemplates.dm && Object.entries(result.outreachTemplates.dm).map(([type, msg]: [string, any]) => (
                  <div key={type} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1"><Badge variant="secondary">DM - {type}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(msg, `dm-${type}`)}>{copiedField === `dm-${type}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button></div>
                    <p className="text-sm whitespace-pre-line">{msg}</p>
                  </div>
                ))}
                {result.outreachTemplates.email && Object.entries(result.outreachTemplates.email).map(([type, msg]: [string, any]) => (
                  <div key={type} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1"><Badge variant="outline">Email - {type}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(msg, `email-${type}`)}>{copiedField === `email-${type}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button></div>
                    <p className="text-sm whitespace-pre-line">{msg}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.searchStrategy && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Search Strategy</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {["whereToFind", "howToVet", "howToApproach"].map((key) => result.searchStrategy[key] && (
                  <div key={key}><Label className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
                    <ul className="text-sm mt-1 space-y-1">{result.searchStrategy[key].map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><Sparkles className="h-3 w-3 mt-1 text-yellow-500 shrink-0" />{item}</li>
                    ))}</ul></div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function OutreachWriter({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [creatorName, setCreatorName] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [yourNiche, setYourNiche] = useState("");
  const [collabType, setCollabType] = useState("content collaboration");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/collab/outreach", { creatorName, platform, yourNiche, collabType }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Personalized Outreach Writer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Creator Name / Handle</Label><Input placeholder="Who do you want to collab with?" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} data-testid="input-creator-name" /></div>
            <div><Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}><SelectTrigger data-testid="select-outreach-platform"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="YouTube">YouTube</SelectItem><SelectItem value="TikTok">TikTok</SelectItem><SelectItem value="LinkedIn">LinkedIn</SelectItem><SelectItem value="Email">Email</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Your Niche</Label><Input placeholder="Your content niche" value={yourNiche} onChange={(e) => setYourNiche(e.target.value)} data-testid="input-your-niche" /></div>
            <div><Label>Collaboration Type</Label>
              <Select value={collabType} onValueChange={setCollabType}><SelectTrigger data-testid="select-collab-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="content collaboration">Content Collaboration</SelectItem><SelectItem value="guest appearance">Guest Appearance</SelectItem><SelectItem value="challenge">Challenge</SelectItem><SelectItem value="giveaway">Giveaway</SelectItem><SelectItem value="series">Content Series</SelectItem></SelectContent></Select></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!creatorName || mutation.isPending} data-testid="button-write-outreach" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing...</> : <><Mail className="h-4 w-4 mr-2" />Write Outreach Messages</>}
          </Button>
        </CardContent>
      </Card>

      {result?.messages?.map((msg: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Badge variant="secondary">{msg.type}</Badge>{msg.subject && <span className="text-sm text-muted-foreground">{msg.subject}</span>}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(msg.message, `msg-${i}`)}>{copiedField === `msg-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-muted/30 p-4 rounded-lg whitespace-pre-line text-sm">{msg.message}</div>
            {msg.personalizationTips && <p className="text-xs text-primary">Tip: {msg.personalizationTips}</p>}
          </CardContent>
        </Card>
      ))}

      {result?.followUpSequence && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Follow-Up Sequence</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">{result.followUpSequence.map((fu: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge variant="outline">{fu.day}</Badge>
                <div className="flex-1"><p className="text-sm">{fu.message}</p><p className="text-xs text-muted-foreground mt-1">Channel: {fu.channel}</p></div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(fu.message, `fu-${i}`)}>{copiedField === `fu-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
              </div>
            ))}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
