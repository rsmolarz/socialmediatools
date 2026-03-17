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
  ArrowLeft, Loader2, Copy, Check, Sparkles, FileText, Gift, Mail, Megaphone,
} from "lucide-react";

export default function FunnelBuilder() {
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
            <Megaphone className="h-6 w-6 text-emerald-500" />
            <h1 className="text-xl font-bold">Email List & Funnel Builder</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="landing" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="landing" data-testid="tab-landing"><FileText className="h-4 w-4 mr-1" />Landing Page</TabsTrigger>
            <TabsTrigger value="lead-magnet" data-testid="tab-lead-magnet"><Gift className="h-4 w-4 mr-1" />Lead Magnets</TabsTrigger>
            <TabsTrigger value="email-sequence" data-testid="tab-email-seq"><Mail className="h-4 w-4 mr-1" />Email Sequence</TabsTrigger>
          </TabsList>
          <TabsContent value="landing"><LandingPageCopy copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="lead-magnet"><LeadMagnetGenerator copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
          <TabsContent value="email-sequence"><EmailSequenceWriter copyToClipboard={copyToClipboard} copiedField={copiedField} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function LandingPageCopy({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("email signups");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/funnel/landing-page", { product, audience, goal }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Landing Page Copy Generator</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Product / Offer / Lead Magnet</Label><Input placeholder="e.g., Free investing guide for doctors" value={product} onChange={(e) => setProduct(e.target.value)} data-testid="input-lp-product" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Target Audience</Label><Input placeholder="e.g., physicians, entrepreneurs" value={audience} onChange={(e) => setAudience(e.target.value)} data-testid="input-lp-audience" /></div>
            <div><Label>Goal</Label>
              <Select value={goal} onValueChange={setGoal}><SelectTrigger data-testid="select-lp-goal"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="email signups">Email Signups</SelectItem><SelectItem value="product sales">Product Sales</SelectItem><SelectItem value="webinar registration">Webinar Registration</SelectItem><SelectItem value="free trial">Free Trial</SelectItem><SelectItem value="consultation booking">Consultation Booking</SelectItem></SelectContent></Select></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!product || mutation.isPending} data-testid="button-generate-landing" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating copy...</> : <><FileText className="h-4 w-4 mr-2" />Generate Landing Page Copy</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className="border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-2xl">{result.headline}</CardTitle><p className="text-muted-foreground mt-1">{result.subheadline}</p></div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${result.headline}\n${result.subheadline}`, "hero")}>
                  {copiedField === "hero" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
              </div>
            </CardHeader>
            {result.heroSection && (
              <CardContent className="space-y-3">
                <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20 text-center">
                  <p className="font-bold text-lg">{result.heroSection.headline}</p>
                  <p className="text-sm text-muted-foreground mt-1">{result.heroSection.subtext}</p>
                  <Badge variant="default" className="mt-3 text-sm px-6 py-1">{result.heroSection.ctaButton}</Badge>
                  {result.heroSection.socialProof && <p className="text-xs text-muted-foreground mt-2">{result.heroSection.socialProof}</p>}
                </div>
              </CardContent>
            )}
          </Card>

          {result.painPoints && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Pain Points (Problem → Agitation → Solution)</CardTitle></CardHeader>
              <CardContent><div className="space-y-4">{result.painPoints.map((p: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <div><Badge variant="destructive" className="text-xs">Pain</Badge><p className="text-sm mt-1">{p.pain}</p></div>
                  <div><Badge variant="secondary" className="text-xs">Agitation</Badge><p className="text-sm mt-1">{p.agitation}</p></div>
                  <div><Badge variant="default" className="text-xs">Solution</Badge><p className="text-sm mt-1">{p.solution}</p></div>
                </div>
              ))}</div></CardContent>
            </Card>
          )}

          {result.benefits && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Benefits</CardTitle></CardHeader>
              <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{result.benefits.map((b: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg"><p className="font-medium text-sm">{b.benefit}</p><p className="text-xs text-muted-foreground mt-1">{b.description}</p></div>
              ))}</div></CardContent>
            </Card>
          )}

          {result.testimonials && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Testimonial Templates</CardTitle></CardHeader>
              <CardContent><div className="space-y-3">{result.testimonials.map((t: any, i: number) => (
                <div key={i} className="p-3 border-l-4 border-primary pl-4">
                  <p className="text-sm italic">"{t.quote}"</p>
                  <p className="text-xs text-muted-foreground mt-1">— {t.name}, {t.title}</p>
                </div>
              ))}</div></CardContent>
            </Card>
          )}

          {result.faq && (
            <Card>
              <CardHeader><CardTitle className="text-lg">FAQ Section</CardTitle></CardHeader>
              <CardContent><div className="space-y-3">{result.faq.map((f: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg"><p className="font-medium text-sm">{f.question}</p><p className="text-xs text-muted-foreground mt-1">{f.answer}</p></div>
              ))}</div></CardContent>
            </Card>
          )}

          {result.ctaSections && (
            <Card>
              <CardHeader><CardTitle className="text-lg">CTA Sections</CardTitle></CardHeader>
              <CardContent><div className="space-y-3">{result.ctaSections.map((cta: any, i: number) => (
                <div key={i} className="p-4 bg-primary/5 rounded-lg border text-center">
                  <p className="font-bold">{cta.headline}</p>
                  <p className="text-sm text-muted-foreground mt-1">{cta.body}</p>
                  <Badge variant="default" className="mt-2">{cta.buttonText}</Badge>
                </div>
              ))}</div></CardContent>
            </Card>
          )}

          {result.urgencyElement && (
            <Card><CardContent className="pt-6"><div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg"><p className="text-sm font-medium text-red-600 dark:text-red-400">{result.urgencyElement}</p></div></CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}

function LeadMagnetGenerator({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/funnel/lead-magnet", { niche, audience }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" />Lead Magnet Ideas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Your Niche</Label><Input placeholder="e.g., physician finance" value={niche} onChange={(e) => setNiche(e.target.value)} data-testid="input-lm-niche" /></div>
            <div><Label>Target Audience</Label><Input placeholder="e.g., new doctors" value={audience} onChange={(e) => setAudience(e.target.value)} data-testid="input-lm-audience" /></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-generate-lead-magnets" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating ideas...</> : <><Gift className="h-4 w-4 mr-2" />Generate Lead Magnet Ideas</>}
          </Button>
        </CardContent>
      </Card>

      {result?.leadMagnets?.map((lm: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">{lm.title}
                <Badge variant="secondary">{lm.type}</Badge>
                <Badge variant={lm.effort === "easy" ? "default" : "outline"}>{lm.effort}</Badge></CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${lm.title}\n\n${lm.description}\n\nOutline:\n${lm.outline?.join("\n")}`, `lm-${i}`)}>
                {copiedField === `lm-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{lm.description}</p>
            <div><Label className="text-xs text-muted-foreground">Content Outline</Label>
              <ul className="text-sm mt-1 space-y-1">{lm.outline?.map((s: string, j: number) => <li key={j}>• {s}</li>)}</ul></div>
            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              <p className="text-xs text-muted-foreground">Landing Page Headline</p><p className="font-medium text-sm">{lm.landingPageHeadline}</p>
              <Badge variant="default" className="mt-2">{lm.ctaText}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Expected conversion: {lm.expectedConversionRate}</p>
          </CardContent>
        </Card>
      ))}

      {result?.optInFormCopy && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Opt-In Form Copy</CardTitle></CardHeader>
          <CardContent><div className="space-y-3">{result.optInFormCopy.map((form: any, i: number) => (
            <div key={i} className="p-4 border rounded-lg text-center">
              <p className="font-bold">{form.headline}</p>
              <p className="text-sm text-muted-foreground mt-1">{form.subtext}</p>
              <Badge variant="default" className="mt-2">{form.buttonText}</Badge>
              <p className="text-xs text-muted-foreground mt-2">{form.privacyText}</p>
            </div>
          ))}</div></CardContent>
        </Card>
      )}

      {result?.deliverySequence && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Delivery Sequence</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">{Object.entries(result.deliverySequence).map(([key, val]: [string, any]) => (
            <div key={key} className="flex items-start gap-3 p-3 border rounded-lg"><Badge variant="outline" className="capitalize shrink-0">{key}</Badge><p className="text-sm">{val}</p></div>
          ))}</div></CardContent>
        </Card>
      )}
    </div>
  );
}

function EmailSequenceWriter({ copyToClipboard, copiedField }: { copyToClipboard: (t: string, f: string) => void; copiedField: string | null }) {
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [sequenceType, setSequenceType] = useState("welcome");
  const [emailCount, setEmailCount] = useState("7");
  const [result, setResult] = useState<any>(null);
  const mutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/funnel/email-sequence", { product, audience, sequenceType, emails: parseInt(emailCount) }); return res.json(); },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Email Sequence Writer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Product / Offer</Label><Input placeholder="What are you promoting?" value={product} onChange={(e) => setProduct(e.target.value)} data-testid="input-es-product" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Audience</Label><Input placeholder="Target audience" value={audience} onChange={(e) => setAudience(e.target.value)} data-testid="input-es-audience" /></div>
            <div><Label>Sequence Type</Label>
              <Select value={sequenceType} onValueChange={setSequenceType}><SelectTrigger data-testid="select-seq-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="welcome">Welcome Sequence</SelectItem><SelectItem value="nurture">Nurture Sequence</SelectItem><SelectItem value="launch">Launch Sequence</SelectItem><SelectItem value="abandoned cart">Abandoned Cart</SelectItem><SelectItem value="re-engagement">Re-engagement</SelectItem></SelectContent></Select></div>
            <div><Label>Emails</Label>
              <Select value={emailCount} onValueChange={setEmailCount}><SelectTrigger data-testid="select-email-count"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="3">3 Emails</SelectItem><SelectItem value="5">5 Emails</SelectItem><SelectItem value="7">7 Emails</SelectItem><SelectItem value="10">10 Emails</SelectItem></SelectContent></Select></div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!product || mutation.isPending} data-testid="button-generate-emails" className="w-full">
            {mutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Writing sequence...</> : <><Mail className="h-4 w-4 mr-2" />Generate Email Sequence</>}
          </Button>
        </CardContent>
      </Card>

      {result?.sequenceName && (
        <Card><CardContent className="pt-6">
          <div className="text-center"><p className="font-bold text-lg">{result.sequenceName}</p><p className="text-sm text-muted-foreground">{result.goal}</p>
            {result.sequenceStrategy && <p className="text-xs text-primary mt-2">{result.sequenceStrategy}</p>}</div>
        </CardContent></Card>
      )}

      {result?.emails?.map((email: any, i: number) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Badge variant="outline">{email.day}</Badge><Badge variant="secondary">{email.purpose}</Badge></CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`Subject: ${email.subjectLine}\nPreview: ${email.previewText}\n\n${email.body}`, `em-${i}`)}>
                {copiedField === `em-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Subject Line</p><p className="font-medium text-sm">{email.subjectLine}</p>
              {email.previewText && <><p className="text-xs text-muted-foreground mt-2">Preview Text</p><p className="text-xs">{email.previewText}</p></>}
            </div>
            <div className="whitespace-pre-line text-sm">{email.body}</div>
            {email.cta && (
              <div className="text-center p-3 bg-primary/5 rounded-lg border">
                <Badge variant="default">{email.cta.text}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{email.cta.action}</p>
              </div>
            )}
            {email.tips && <p className="text-xs text-primary">{email.tips}</p>}
          </CardContent>
        </Card>
      ))}

      {result?.abTestIdeas && (
        <Card>
          <CardHeader><CardTitle className="text-lg">A/B Test Ideas</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">{result.abTestIdeas.map((ab: any, i: number) => (
            <div key={i} className="grid grid-cols-3 gap-3 p-3 border rounded-lg">
              <div><Label className="text-xs text-muted-foreground">Element</Label><p className="text-sm">{ab.element}</p></div>
              <div><Label className="text-xs text-muted-foreground">Variation A</Label><p className="text-sm">{ab.variationA}</p></div>
              <div><Label className="text-xs text-muted-foreground">Variation B</Label><p className="text-sm">{ab.variationB}</p></div>
            </div>
          ))}</div></CardContent>
        </Card>
      )}
    </div>
  );
}
