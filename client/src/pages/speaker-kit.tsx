import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import type { SpeakerKit, SpeakerOpportunity } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  FileText,
  Mic,
  MessageSquareQuote,
  Podcast,
  Palette,
  Tags,
  Check,
  CloudOff,
  Loader2,
  X,
  Search,
  Briefcase,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  ExternalLink,
  Sparkles,
  Copy,
  BookOpen,
  Target,
  Send,
  ClipboardList,
} from "lucide-react";

interface SpeakerKitFormState {
  name: string;
  title: string;
  headshot: string;
  bio: string;
  website: string;
  email: string;
  phone: string;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
  };
  programs: Array<{
    id: string;
    title: string;
    format: string;
    bio: string;
    takeaways: string[];
  }>;
  topics: string[];
  testimonials: Array<{
    id: string;
    quote: string;
    author: string;
    role: string;
  }>;
  featuredPodcasts: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  brandColors: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

const DEFAULT_FORM: SpeakerKitFormState = {
  name: "",
  title: "",
  headshot: "",
  bio: "",
  website: "",
  email: "",
  phone: "",
  socialLinks: {},
  programs: [],
  topics: [],
  testimonials: [],
  featuredPodcasts: [],
  brandColors: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#f59e0b" },
};

const PROGRAM_FORMATS = [
  "Keynote",
  "Virtual Presentation",
  "Half-Day Workshop",
  "Full-Day Workshop",
  "Panel",
];

const ACTION_VERBS = ["Learn", "Understand", "Develop", "Know", "Adopt", "Master", "Discover", "Implement"];

interface SearchResult {
  title: string;
  organization: string;
  type: string;
  description: string;
  location: string;
  date: string;
  deadline: string;
  compensation: string;
  audienceSize: string;
  requirements: string;
  contactEmail: string;
  url: string;
  source: string;
}

function OpportunityFinder({ speakerKits }: { speakerKits: SpeakerKit[] }) {
  const { toast } = useToast();
  const [searchPrompt, setSearchPrompt] = useState("");
  const [selectedKitId, setSelectedKitId] = useState<number | null>(speakerKits[0]?.id || null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [savedOpportunities, setSavedOpportunities] = useState<SpeakerOpportunity[]>([]);
  const [activeView, setActiveView] = useState<"search" | "saved" | "application">("search");
  const [selectedOpp, setSelectedOpp] = useState<SpeakerOpportunity | null>(null);
  const [applicationData, setApplicationData] = useState<Record<string, any> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const { data: opportunities = [], refetch: refetchOpps } = useQuery<SpeakerOpportunity[]>({
    queryKey: ["/api/speaker-opportunities"],
  });

  useEffect(() => {
    setSavedOpportunities(opportunities);
  }, [opportunities]);

  const handleSearch = async () => {
    if (!searchPrompt.trim()) return;
    setIsSearching(true);
    try {
      const res = await apiRequest("POST", "/api/speaker-opportunities/search", {
        prompt: searchPrompt,
        speakerKitId: selectedKitId,
      });
      const data = await res.json();
      setSearchResults(data.opportunities || []);
      if ((data.opportunities || []).length === 0) {
        toast({ title: "No results", description: "Try a different search prompt." });
      }
    } catch (error) {
      toast({ title: "Search failed", description: "Could not search for opportunities.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const saveOpportunity = async (result: SearchResult) => {
    try {
      await apiRequest("POST", "/api/speaker-opportunities", {
        title: result.title,
        organization: result.organization,
        type: result.type,
        url: result.url,
        description: result.description,
        location: result.location,
        date: result.date,
        deadline: result.deadline,
        compensation: result.compensation,
        audienceSize: result.audienceSize,
        requirements: result.requirements,
        contactEmail: result.contactEmail,
        source: result.source,
        status: "discovered",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/speaker-opportunities"] });
      toast({ title: "Saved!", description: `"${result.title}" added to your opportunities.` });
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    }
  };

  const updateOppStatus = async (id: number, status: string) => {
    try {
      await apiRequest("PATCH", `/api/speaker-opportunities/${id}`, { status });
      queryClient.invalidateQueries({ queryKey: ["/api/speaker-opportunities"] });
      toast({ title: "Status updated" });
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const deleteOpp = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/speaker-opportunities/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/speaker-opportunities"] });
      if (selectedOpp?.id === id) setSelectedOpp(null);
      toast({ title: "Opportunity removed" });
    } catch (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleAutoFill = async (opp: SpeakerOpportunity) => {
    if (!selectedKitId) {
      toast({ title: "Select a speaker kit first", description: "Choose which speaker kit to use for the application.", variant: "destructive" });
      return;
    }
    setIsAutoFilling(true);
    setSelectedOpp(opp);
    setActiveView("application");
    try {
      const res = await apiRequest("POST", "/api/speaker-opportunities/auto-fill", {
        opportunityId: opp.id,
        speakerKitId: selectedKitId,
      });
      const data = await res.json();
      setApplicationData(data.applicationData);
    } catch (error) {
      toast({ title: "Auto-fill failed", description: "Could not generate application data.", variant: "destructive" });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const typeIcons: Record<string, any> = {
    conference: Briefcase,
    podcast: Podcast,
    summit: Target,
    workshop: BookOpen,
    webinar: Globe,
    panel: Users,
  };

  const statusColors: Record<string, string> = {
    discovered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    applied: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    completed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Find Speaking Opportunities</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Describe the type of speaking opportunities you're looking for. AI will find conferences, podcasts, summits, and more that match your expertise.
            </p>

            {speakerKits.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Use profile:</Label>
                <Select value={selectedKitId?.toString() || ""} onValueChange={(v) => setSelectedKitId(parseInt(v))}>
                  <SelectTrigger className="w-64" data-testid="select-kit-for-search">
                    <SelectValue placeholder="Select speaker kit" />
                  </SelectTrigger>
                  <SelectContent>
                    {speakerKits.map((kit) => (
                      <SelectItem key={kit.id} value={kit.id.toString()}>{kit.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                data-testid="search-prompt-input"
                placeholder='e.g., "Healthcare conferences in the US looking for speakers on physician finance and wellness" or "Podcasts about medical entrepreneurship accepting guest applications"'
                value={searchPrompt}
                onChange={(e) => setSearchPrompt(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !searchPrompt.trim()} className="self-end" data-testid="search-opportunities-btn">
              {isSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isSearching ? "Searching..." : "Find Opportunities"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList>
          <TabsTrigger value="search" data-testid="tab-search-results">
            <Search className="h-4 w-4 mr-1" /> Results ({searchResults.length})
          </TabsTrigger>
          <TabsTrigger value="saved" data-testid="tab-saved-opportunities">
            <Briefcase className="h-4 w-4 mr-1" /> Saved ({opportunities.length})
          </TabsTrigger>
          {applicationData && (
            <TabsTrigger value="application" data-testid="tab-application">
              <ClipboardList className="h-4 w-4 mr-1" /> Application
            </TabsTrigger>
          )}
        </TabsList>

        {/* Search Results */}
        <TabsContent value="search">
          {searchResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Enter a search prompt above to discover speaking opportunities.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((result, i) => {
                const TypeIcon = typeIcons[result.type] || Briefcase;
                return (
                  <Card key={i} className="hover:shadow-md transition-shadow" data-testid={`search-result-${i}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <TypeIcon className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold text-lg">{result.title}</h4>
                            <Badge variant="outline" className="capitalize">{result.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{result.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{result.organization}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{result.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{result.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{result.compensation}</span>
                            </div>
                          </div>

                          {result.audienceSize && (
                            <div className="flex items-center gap-1.5 mt-2 text-sm">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Audience: {result.audienceSize}</span>
                            </div>
                          )}

                          {result.requirements && (
                            <p className="text-xs text-muted-foreground mt-2 italic">Requirements: {result.requirements}</p>
                          )}

                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Source: {result.source}</span>
                            {result.deadline && <span>| Deadline: {result.deadline}</span>}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button size="sm" onClick={() => saveOpportunity(result)} data-testid={`save-result-${i}`}>
                            <Plus className="h-4 w-4 mr-1" /> Save
                          </Button>
                          {result.url && (
                            <Button size="sm" variant="outline" onClick={() => window.open(result.url, "_blank")} data-testid={`open-result-${i}`}>
                              <ExternalLink className="h-4 w-4 mr-1" /> Visit
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Saved Opportunities */}
        <TabsContent value="saved">
          {opportunities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No saved opportunities yet. Search and save opportunities to track them here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {opportunities.map((opp) => {
                const TypeIcon = typeIcons[opp.type || "conference"] || Briefcase;
                return (
                  <Card key={opp.id} className="hover:shadow-md transition-shadow" data-testid={`saved-opp-${opp.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <TypeIcon className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold">{opp.title}</h4>
                            <Badge className={`capitalize text-xs ${statusColors[opp.status || "discovered"]}`}>
                              {opp.status}
                            </Badge>
                          </div>
                          {opp.organization && <p className="text-sm font-medium mb-1">{opp.organization}</p>}
                          {opp.description && <p className="text-sm text-muted-foreground mb-2">{opp.description}</p>}

                          <div className="flex flex-wrap gap-4 text-sm">
                            {opp.location && (
                              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {opp.location}</span>
                            )}
                            {opp.date && (
                              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {opp.date}</span>
                            )}
                            {opp.compensation && (
                              <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {opp.compensation}</span>
                            )}
                            {opp.contactEmail && (
                              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {opp.contactEmail}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Select value={opp.status || "discovered"} onValueChange={(v) => updateOppStatus(opp.id, v)}>
                            <SelectTrigger className="w-32" data-testid={`status-select-${opp.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="discovered">Discovered</SelectItem>
                              <SelectItem value="applied">Applied</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" onClick={() => handleAutoFill(opp)} disabled={isAutoFilling} data-testid={`auto-fill-${opp.id}`}>
                            {isAutoFilling && selectedOpp?.id === opp.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-1" />
                            )}
                            Auto-Fill
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteOpp(opp.id)} data-testid={`delete-opp-${opp.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Application Auto-Fill */}
        <TabsContent value="application">
          {isAutoFilling ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generating your application...</p>
                <p className="text-sm text-muted-foreground mt-2">AI is crafting a personalized application using your speaker kit.</p>
              </CardContent>
            </Card>
          ) : applicationData ? (
            <div className="space-y-4">
              {selectedOpp && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-1">Application for: {selectedOpp.title}</h3>
                    <p className="text-sm text-muted-foreground">{selectedOpp.organization} | {selectedOpp.type}</p>
                  </CardContent>
                </Card>
              )}

              {Object.entries(applicationData).map(([key, value]) => {
                const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                const content = Array.isArray(value) ? value.join("\n- ") : String(value);
                return (
                  <Card key={key} data-testid={`app-field-${key}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{label}</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(Array.isArray(value) ? `- ${value.join("\n- ")}` : String(value), label)} data-testid={`copy-${key}`}>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {Array.isArray(value) ? (
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {value.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{String(value)}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  const allText = Object.entries(applicationData).map(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                    const content = Array.isArray(value) ? `- ${value.join("\n- ")}` : String(value);
                    return `## ${label}\n${content}`;
                  }).join("\n\n");
                  copyToClipboard(allText, "Full application");
                }} data-testid="copy-full-application">
                  <Copy className="h-4 w-4 mr-2" /> Copy Full Application
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Select a saved opportunity and click "Auto-Fill" to generate an application.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SpeakerKitPage() {
  const { toast } = useToast();
  const [activeMainTab, setActiveMainTab] = useState("builder");
  const [selectedKitId, setSelectedKitId] = useState<number | null>(null);
  const [form, setForm] = useState<SpeakerKitFormState>(DEFAULT_FORM);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [topicInput, setTopicInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [docFileName, setDocFileName] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(DEFAULT_FORM));

  const { data: kits = [], isLoading: kitsLoading } = useQuery<SpeakerKit[]>({
    queryKey: ["/api/speaker-kits"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SpeakerKitFormState>) => {
      const payload = {
        name: data.name || "Untitled Kit",
        title: data.title,
        headshot: data.headshot || null,
        bio: data.bio,
        website: data.website,
        email: data.email,
        phone: data.phone,
        socialLinks: data.socialLinks,
        programs: data.programs,
        topics: data.topics,
        testimonials: data.testimonials,
        featuredPodcasts: data.featuredPodcasts,
        brandColors: data.brandColors,
        status: "draft",
      };

      if (selectedKitId) {
        const res = await apiRequest("PATCH", `/api/speaker-kits/${selectedKitId}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/speaker-kits", payload);
        return res.json();
      }
    },
    onSuccess: (savedKit: SpeakerKit) => {
      queryClient.invalidateQueries({ queryKey: ["/api/speaker-kits"] });
      setSelectedKitId(savedKit.id);
      lastSavedRef.current = JSON.stringify(form);
      setSaveStatus("saved");
      toast({ title: "Saved", description: "Speaker kit saved successfully." });
    },
    onError: () => {
      setSaveStatus("unsaved");
      toast({ title: "Error", description: "Failed to save speaker kit.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/speaker-kits/${id}`);
      return id;
    },
    onSuccess: (deletedId: number) => {
      queryClient.invalidateQueries({ queryKey: ["/api/speaker-kits"] });
      if (selectedKitId === deletedId) {
        setSelectedKitId(null);
        setForm(DEFAULT_FORM);
        lastSavedRef.current = JSON.stringify(DEFAULT_FORM);
        setSaveStatus("saved");
      }
      toast({ title: "Deleted", description: "Speaker kit deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete kit.", variant: "destructive" });
    },
  });

  const scheduleAutoSave = useCallback(() => {
    const currentForm = JSON.stringify(form);
    if (currentForm === lastSavedRef.current) return;
    setSaveStatus("unsaved");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (!saveMutation.isPending) {
        setSaveStatus("saving");
        saveMutation.mutate(form);
      }
    }, 2000);
  }, [form, saveMutation]);

  const handleFieldBlur = useCallback(() => {
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const updateForm = useCallback((updates: Partial<SpeakerKitFormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = () => {
    if (saveMutation.isPending) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setSaveStatus("saving");
    saveMutation.mutate(form);
  };

  const handleNewKit = () => {
    setSelectedKitId(null);
    setForm(DEFAULT_FORM);
    lastSavedRef.current = JSON.stringify(DEFAULT_FORM);
    setSaveStatus("saved");
  };

  const handleLoadKit = (kit: SpeakerKit) => {
    setSelectedKitId(kit.id);
    const loaded: SpeakerKitFormState = {
      name: kit.name || "",
      title: kit.title || "",
      headshot: kit.headshot || "",
      bio: kit.bio || "",
      website: kit.website || "",
      email: kit.email || "",
      phone: kit.phone || "",
      socialLinks: kit.socialLinks || {},
      programs: (kit.programs as SpeakerKitFormState["programs"]) || [],
      topics: kit.topics || [],
      testimonials: (kit.testimonials as SpeakerKitFormState["testimonials"]) || [],
      featuredPodcasts: (kit.featuredPodcasts as SpeakerKitFormState["featuredPodcasts"]) || [],
      brandColors: kit.brandColors || { primary: "#6366f1", secondary: "#8b5cf6", accent: "#f59e0b" },
    };
    setForm(loaded);
    lastSavedRef.current = JSON.stringify(loaded);
    setSaveStatus("saved");
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Please upload a PDF, Word document (.docx), or text file.", variant: "destructive" });
      return;
    }

    setIsParsingDoc(true);
    setDocFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("document", file);

      const res = await fetch("/api/speaker-kits/parse-document", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      const ext = data.extracted;

      if (ext) {
        const updates: Partial<SpeakerKitFormState> = {};
        if (ext.name) updates.name = ext.name;
        if (ext.title) updates.title = ext.title;
        if (ext.bio) updates.bio = ext.bio;
        if (ext.email) updates.email = ext.email;
        if (ext.phone) updates.phone = ext.phone;
        if (ext.website) updates.website = ext.website;
        if (ext.socialLinks) {
          updates.socialLinks = { ...form.socialLinks };
          if (ext.socialLinks.linkedin) updates.socialLinks.linkedin = ext.socialLinks.linkedin;
          if (ext.socialLinks.twitter) updates.socialLinks.twitter = ext.socialLinks.twitter;
          if (ext.socialLinks.instagram) updates.socialLinks.instagram = ext.socialLinks.instagram;
          if (ext.socialLinks.facebook) updates.socialLinks.facebook = ext.socialLinks.facebook;
          if (ext.socialLinks.youtube) updates.socialLinks.youtube = ext.socialLinks.youtube;
        }
        if (ext.programs?.length > 0) {
          updates.programs = ext.programs.slice(0, 3).map((p: any) => ({
            id: crypto.randomUUID(),
            title: p.title || "",
            format: p.format || "Keynote",
            bio: p.bio || p.description || "",
            takeaways: p.takeaways || [],
          }));
        }
        if (ext.topics?.length > 0) {
          updates.topics = Array.from(new Set([...form.topics, ...ext.topics]));
        }
        if (ext.testimonials?.length > 0) {
          updates.testimonials = ext.testimonials.map((t: any) => ({
            id: crypto.randomUUID(),
            quote: t.quote || "",
            author: t.author || "",
            role: t.role || "",
          }));
        }
        if (ext.featuredPodcasts?.length > 0) {
          updates.featuredPodcasts = ext.featuredPodcasts.map((p: any) => ({
            id: crypto.randomUUID(),
            name: p.name || "",
            url: p.url || "",
          }));
        }

        updateForm(updates);
        setSaveStatus("unsaved");
        toast({ title: "Document parsed!", description: "Fields have been auto-populated from your document. Review and save when ready." });
      }
    } catch (error: any) {
      toast({ title: "Parse failed", description: error.message || "Could not extract data from the document.", variant: "destructive" });
    } finally {
      setIsParsingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const addProgram = () => {
    if (form.programs.length >= 3) {
      toast({ title: "Limit Reached", description: "Maximum 3 signature programs.", variant: "destructive" });
      return;
    }
    updateForm({
      programs: [...form.programs, { id: crypto.randomUUID(), title: "", format: "Keynote", bio: "", takeaways: [] }],
    });
  };

  const updateProgram = (id: string, updates: Partial<SpeakerKitFormState["programs"][0]>) => {
    updateForm({
      programs: form.programs.map(p => (p.id === id ? { ...p, ...updates } : p)),
    });
  };

  const removeProgram = (id: string) => {
    updateForm({ programs: form.programs.filter(p => p.id !== id) });
  };

  const addTakeaway = (programId: string) => {
    updateForm({
      programs: form.programs.map(p =>
        p.id === programId ? { ...p, takeaways: [...p.takeaways, ""] } : p
      ),
    });
  };

  const updateTakeaway = (programId: string, index: number, value: string) => {
    updateForm({
      programs: form.programs.map(p =>
        p.id === programId
          ? { ...p, takeaways: p.takeaways.map((t, i) => (i === index ? value : t)) }
          : p
      ),
    });
  };

  const removeTakeaway = (programId: string, index: number) => {
    updateForm({
      programs: form.programs.map(p =>
        p.id === programId ? { ...p, takeaways: p.takeaways.filter((_, i) => i !== index) } : p
      ),
    });
  };

  const addTopic = () => {
    const trimmed = topicInput.trim();
    if (!trimmed) return;
    if (form.topics.includes(trimmed)) {
      toast({ title: "Duplicate", description: "Topic already added." });
      return;
    }
    updateForm({ topics: [...form.topics, trimmed] });
    setTopicInput("");
  };

  const removeTopic = (topic: string) => {
    updateForm({ topics: form.topics.filter(t => t !== topic) });
  };

  const addTestimonial = () => {
    updateForm({
      testimonials: [...form.testimonials, { id: crypto.randomUUID(), quote: "", author: "", role: "" }],
    });
  };

  const updateTestimonial = (id: string, updates: Partial<SpeakerKitFormState["testimonials"][0]>) => {
    updateForm({
      testimonials: form.testimonials.map(t => (t.id === id ? { ...t, ...updates } : t)),
    });
  };

  const removeTestimonial = (id: string) => {
    updateForm({ testimonials: form.testimonials.filter(t => t.id !== id) });
  };

  const addPodcast = () => {
    updateForm({
      featuredPodcasts: [...form.featuredPodcasts, { id: crypto.randomUUID(), name: "", url: "" }],
    });
  };

  const updatePodcast = (id: string, updates: Partial<SpeakerKitFormState["featuredPodcasts"][0]>) => {
    updateForm({
      featuredPodcasts: form.featuredPodcasts.map(p => (p.id === id ? { ...p, ...updates } : p)),
    });
  };

  const removePodcast = (id: string) => {
    updateForm({ featuredPodcasts: form.featuredPodcasts.filter(p => p.id !== id) });
  };

  const handleHeadshotDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateForm({ headshot: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeadshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateForm({ headshot: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background" data-testid="speaker-kit-page">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg leading-tight">Speaker Kit Builder</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleNewKit} data-testid="button-new-kit">
              <Plus className="h-4 w-4 mr-2" />
              New Kit
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-kit">
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <span className="flex items-center gap-1 text-xs" data-testid="save-status">
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <CloudOff className="h-3 w-3" />
                  Unsaved
                </span>
              )}
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
            </span>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="builder" data-testid="tab-builder" className="gap-2">
              <FileText className="h-4 w-4" />
              Kit Builder
            </TabsTrigger>
            <TabsTrigger value="opportunities" data-testid="tab-opportunities" className="gap-2">
              <Search className="h-4 w-4" />
              Opportunity Finder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-0">
            <div className="flex gap-6">
              <aside className="w-80 shrink-0">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-base">Saved Kits</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleNewKit} data-testid="button-sidebar-new-kit">
                      <Plus className="h-3 w-3 mr-1" />
                      New
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {kitsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : kits.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No kits yet. Create your first speaker kit!
                      </p>
                    ) : (
                      <ScrollArea className="max-h-[calc(100vh-280px)]">
                        <div className="space-y-2">
                          {kits.map((kit) => (
                            <div
                              key={kit.id}
                              className={`flex items-center justify-between gap-2 p-3 rounded-md cursor-pointer transition-colors hover-elevate ${
                                selectedKitId === kit.id
                                  ? "bg-primary/10 border border-primary/20"
                                  : "border border-transparent"
                              }`}
                              onClick={() => handleLoadKit(kit)}
                              data-testid={`kit-item-${kit.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{kit.name || "Untitled Kit"}</p>
                                <p className="text-xs text-muted-foreground truncate">{kit.title || "No title"}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(kit.id);
                                }}
                                data-testid={`button-delete-kit-${kit.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </aside>

              <main className="flex-1 min-w-0">
                <div className="space-y-6">
                  <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Import from Document</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Upload a speaker kit, bio, resume, or media sheet (PDF, Word, or text file) and AI will auto-populate the fields below.
                          </p>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              onClick={() => docInputRef.current?.click()}
                              disabled={isParsingDoc}
                              data-testid="button-upload-document"
                            >
                              {isParsingDoc ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Analyzing...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload Document
                                </>
                              )}
                            </Button>
                            {docFileName && !isParsingDoc && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-500" />
                                {docFileName}
                              </span>
                            )}
                            {isParsingDoc && (
                              <span className="text-sm text-muted-foreground">
                                Reading and extracting data from {docFileName}...
                              </span>
                            )}
                          </div>
                          <input
                            ref={docInputRef}
                            type="file"
                            accept=".pdf,.docx,.doc,.txt"
                            className="hidden"
                            onChange={handleDocumentUpload}
                            data-testid="input-document-file"
                          />
                        </div>
                        <div className="hidden md:flex flex-col items-center text-center text-xs text-muted-foreground gap-1">
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">PDF</Badge>
                            <Badge variant="secondary" className="text-xs">DOCX</Badge>
                            <Badge variant="secondary" className="text-xs">TXT</Badge>
                          </div>
                          <span>Max 10MB</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Speaker Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="speaker-name">Speaker Name</Label>
                            <Input
                              id="speaker-name"
                              placeholder="Your full name"
                              value={form.name}
                              onChange={(e) => updateForm({ name: e.target.value })}
                              onBlur={handleFieldBlur}
                              data-testid="input-speaker-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="speaker-title">Title / Tagline</Label>
                            <Input
                              id="speaker-title"
                              placeholder="e.g. Keynote Speaker & Author"
                              value={form.title}
                              onChange={(e) => updateForm({ title: e.target.value })}
                              onBlur={handleFieldBlur}
                              data-testid="input-speaker-title"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Headshot</Label>
                          <div
                            className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleHeadshotDrop}
                            onClick={() => document.getElementById("headshot-upload")?.click()}
                            data-testid="headshot-dropzone"
                          >
                            {form.headshot ? (
                              <div className="relative inline-block">
                                <img
                                  src={form.headshot}
                                  alt="Headshot"
                                  className="w-24 h-24 rounded-md object-cover mx-auto"
                                  data-testid="img-headshot-preview"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-2 -right-2"
                                  onClick={(e) => { e.stopPropagation(); updateForm({ headshot: "" }); }}
                                  data-testid="button-remove-headshot"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  Drag & drop or click to upload
                                </p>
                              </div>
                            )}
                            <input
                              id="headshot-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleHeadshotChange}
                              data-testid="input-headshot-file"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="speaker-email" className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> Email
                          </Label>
                          <Input
                            id="speaker-email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => updateForm({ email: e.target.value })}
                            onBlur={handleFieldBlur}
                            data-testid="input-speaker-email"
                          />
                        </div>
                        <div>
                          <Label htmlFor="speaker-phone" className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Phone
                          </Label>
                          <Input
                            id="speaker-phone"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={form.phone}
                            onChange={(e) => updateForm({ phone: e.target.value })}
                            onBlur={handleFieldBlur}
                            data-testid="input-speaker-phone"
                          />
                        </div>
                        <div>
                          <Label htmlFor="speaker-website" className="flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Website
                          </Label>
                          <Input
                            id="speaker-website"
                            type="url"
                            placeholder="https://yourwebsite.com"
                            value={form.website}
                            onChange={(e) => updateForm({ website: e.target.value })}
                            onBlur={handleFieldBlur}
                            data-testid="input-speaker-website"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Social Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label className="flex items-center gap-1">
                            <Linkedin className="h-3 w-3" /> LinkedIn
                          </Label>
                          <Input
                            placeholder="linkedin.com/in/yourname"
                            value={form.socialLinks.linkedin || ""}
                            onChange={(e) => updateForm({ socialLinks: { ...form.socialLinks, linkedin: e.target.value } })}
                            onBlur={handleFieldBlur}
                            data-testid="input-social-linkedin"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1">
                            <Twitter className="h-3 w-3" /> Twitter / X
                          </Label>
                          <Input
                            placeholder="@yourhandle"
                            value={form.socialLinks.twitter || ""}
                            onChange={(e) => updateForm({ socialLinks: { ...form.socialLinks, twitter: e.target.value } })}
                            onBlur={handleFieldBlur}
                            data-testid="input-social-twitter"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1">
                            <Instagram className="h-3 w-3" /> Instagram
                          </Label>
                          <Input
                            placeholder="@yourhandle"
                            value={form.socialLinks.instagram || ""}
                            onChange={(e) => updateForm({ socialLinks: { ...form.socialLinks, instagram: e.target.value } })}
                            onBlur={handleFieldBlur}
                            data-testid="input-social-instagram"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1">
                            <Facebook className="h-3 w-3" /> Facebook
                          </Label>
                          <Input
                            placeholder="facebook.com/yourpage"
                            value={form.socialLinks.facebook || ""}
                            onChange={(e) => updateForm({ socialLinks: { ...form.socialLinks, facebook: e.target.value } })}
                            onBlur={handleFieldBlur}
                            data-testid="input-social-facebook"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1">
                            <Youtube className="h-3 w-3" /> YouTube
                          </Label>
                          <Input
                            placeholder="youtube.com/@yourchannel"
                            value={form.socialLinks.youtube || ""}
                            onChange={(e) => updateForm({ socialLinks: { ...form.socialLinks, youtube: e.target.value } })}
                            onBlur={handleFieldBlur}
                            data-testid="input-social-youtube"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Expert Bio
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Write your speaker biography here. Include your expertise, experience, achievements, and what makes you unique as a speaker..."
                        value={form.bio}
                        onChange={(e) => updateForm({ bio: e.target.value })}
                        onBlur={handleFieldBlur}
                        rows={8}
                        className="resize-y"
                        data-testid="textarea-bio"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Signature Programs
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addProgram}
                        disabled={form.programs.length >= 3}
                        data-testid="button-add-program"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Program ({form.programs.length}/3)
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {form.programs.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No programs yet. Add up to 3 signature programs.
                        </p>
                      )}
                      {form.programs.map((program, pIndex) => (
                        <Card key={program.id} className="border">
                          <CardHeader className="flex flex-row items-start justify-between gap-2">
                            <CardTitle className="text-base">Program {pIndex + 1}</CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeProgram(program.id)}
                              data-testid={`button-remove-program-${program.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Program Title</Label>
                                <Input
                                  placeholder="e.g. The Future of Healthcare"
                                  value={program.title}
                                  onChange={(e) => updateProgram(program.id, { title: e.target.value })}
                                  onBlur={handleFieldBlur}
                                  data-testid={`input-program-title-${program.id}`}
                                />
                              </div>
                              <div>
                                <Label>Format</Label>
                                <Select
                                  value={program.format}
                                  onValueChange={(val) => updateProgram(program.id, { format: val })}
                                >
                                  <SelectTrigger data-testid={`select-program-format-${program.id}`}>
                                    <SelectValue placeholder="Select format" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PROGRAM_FORMATS.map((fmt) => (
                                      <SelectItem key={fmt} value={fmt}>
                                        {fmt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                placeholder="Describe what this program covers..."
                                value={program.bio}
                                onChange={(e) => updateProgram(program.id, { bio: e.target.value })}
                                onBlur={handleFieldBlur}
                                rows={4}
                                className="resize-y"
                                data-testid={`textarea-program-bio-${program.id}`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label>Key Takeaways</Label>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addTakeaway(program.id)}
                                  data-testid={`button-add-takeaway-${program.id}`}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Takeaway
                                </Button>
                              </div>
                              {program.takeaways.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Start with action verbs: {ACTION_VERBS.join(", ")}
                                </p>
                              )}
                              <div className="space-y-2">
                                {program.takeaways.map((takeaway, tIndex) => (
                                  <div key={tIndex} className="flex items-center gap-2">
                                    <Input
                                      placeholder={`e.g. ${ACTION_VERBS[tIndex % ACTION_VERBS.length]} how to...`}
                                      value={takeaway}
                                      onChange={(e) => updateTakeaway(program.id, tIndex, e.target.value)}
                                      onBlur={handleFieldBlur}
                                      data-testid={`input-takeaway-${program.id}-${tIndex}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeTakeaway(program.id, tIndex)}
                                      data-testid={`button-remove-takeaway-${program.id}-${tIndex}`}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tags className="h-5 w-5" />
                        Topics Available
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Topics available for panels & interview-style presentations
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Type a topic and press Enter or Add"
                          value={topicInput}
                          onChange={(e) => setTopicInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
                          data-testid="input-topic"
                        />
                        <Button variant="outline" onClick={addTopic} data-testid="button-add-topic">
                          Add
                        </Button>
                      </div>
                      {form.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {form.topics.map((topic) => (
                            <Badge
                              key={topic}
                              variant="secondary"
                              className="gap-1"
                              data-testid={`badge-topic-${topic}`}
                            >
                              {topic}
                              <button
                                onClick={() => removeTopic(topic)}
                                className="ml-1"
                                data-testid={`button-remove-topic-${topic}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquareQuote className="h-5 w-5" />
                        Testimonials
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={addTestimonial} data-testid="button-add-testimonial">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Testimonial
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {form.testimonials.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No testimonials yet. Add quotes from past event organizers or attendees.
                        </p>
                      )}
                      {form.testimonials.map((testimonial) => (
                        <Card key={testimonial.id} className="border">
                          <CardContent className="pt-6 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <Textarea
                                placeholder="&quot;This speaker completely transformed our perspective on...&quot;"
                                value={testimonial.quote}
                                onChange={(e) => updateTestimonial(testimonial.id, { quote: e.target.value })}
                                onBlur={handleFieldBlur}
                                rows={3}
                                className="resize-y flex-1"
                                data-testid={`textarea-testimonial-quote-${testimonial.id}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                onClick={() => removeTestimonial(testimonial.id)}
                                data-testid={`button-remove-testimonial-${testimonial.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Author Name</Label>
                                <Input
                                  placeholder="John Smith"
                                  value={testimonial.author}
                                  onChange={(e) => updateTestimonial(testimonial.id, { author: e.target.value })}
                                  onBlur={handleFieldBlur}
                                  data-testid={`input-testimonial-author-${testimonial.id}`}
                                />
                              </div>
                              <div>
                                <Label>Role / Title</Label>
                                <Input
                                  placeholder="CEO, Acme Corp"
                                  value={testimonial.role}
                                  onChange={(e) => updateTestimonial(testimonial.id, { role: e.target.value })}
                                  onBlur={handleFieldBlur}
                                  data-testid={`input-testimonial-role-${testimonial.id}`}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2">
                        <Podcast className="h-5 w-5" />
                        Featured Podcasts
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={addPodcast} data-testid="button-add-podcast">
                        <Plus className="h-3 w-3 mr-1" />
                        Add Podcast
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {form.featuredPodcasts.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No podcast appearances yet. Showcase your podcast features here.
                        </p>
                      )}
                      {form.featuredPodcasts.map((podcast) => (
                        <div key={podcast.id} className="flex items-center gap-3">
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Podcast Name"
                              value={podcast.name}
                              onChange={(e) => updatePodcast(podcast.id, { name: e.target.value })}
                              onBlur={handleFieldBlur}
                              data-testid={`input-podcast-name-${podcast.id}`}
                            />
                            <Input
                              placeholder="https://podcast-url.com/episode"
                              value={podcast.url}
                              onChange={(e) => updatePodcast(podcast.id, { url: e.target.value })}
                              onBlur={handleFieldBlur}
                              data-testid={`input-podcast-url-${podcast.id}`}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePodcast(podcast.id)}
                            data-testid={`button-remove-podcast-${podcast.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Brand Colors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Primary</Label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={form.brandColors.primary || "#6366f1"}
                              onChange={(e) => updateForm({ brandColors: { ...form.brandColors, primary: e.target.value } })}
                              onBlur={handleFieldBlur}
                              className="w-10 h-10 rounded-md border cursor-pointer"
                              data-testid="input-color-primary"
                            />
                            <Input
                              value={form.brandColors.primary || "#6366f1"}
                              onChange={(e) => updateForm({ brandColors: { ...form.brandColors, primary: e.target.value } })}
                              onBlur={handleFieldBlur}
                              className="font-mono text-sm"
                              data-testid="input-color-primary-hex"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Secondary</Label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={form.brandColors.secondary || "#8b5cf6"}
                              onChange={(e) => updateForm({ brandColors: { ...form.brandColors, secondary: e.target.value } })}
                              onBlur={handleFieldBlur}
                              className="w-10 h-10 rounded-md border cursor-pointer"
                              data-testid="input-color-secondary"
                            />
                            <Input
                              value={form.brandColors.secondary || "#8b5cf6"}
                              onChange={(e) => updateForm({ brandColors: { ...form.brandColors, secondary: e.target.value } })}
                              onBlur={handleFieldBlur}
                              className="font-mono text-sm"
                              data-testid="input-color-secondary-hex"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Accent</Label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={form.brandColors.accent || "#f59e0b"}
                              onChange={(e) => updateForm({ brandColors: { ...form.brandColors, accent: e.target.value } })}
                              onBlur={handleFieldBlur}
                              className="w-10 h-10 rounded-md border cursor-pointer"
                              data-testid="input-color-accent"
                            />
                            <Input
                              value={form.brandColors.accent || "#f59e0b"}
                              onChange={(e) => updateForm({ brandColors: { ...form.brandColors, accent: e.target.value } })}
                              onBlur={handleFieldBlur}
                              className="font-mono text-sm"
                              data-testid="input-color-accent-hex"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <div
                          className="h-8 flex-1 rounded-md"
                          style={{ backgroundColor: form.brandColors.primary || "#6366f1" }}
                          data-testid="color-preview-primary"
                        />
                        <div
                          className="h-8 flex-1 rounded-md"
                          style={{ backgroundColor: form.brandColors.secondary || "#8b5cf6" }}
                          data-testid="color-preview-secondary"
                        />
                        <div
                          className="h-8 flex-1 rounded-md"
                          style={{ backgroundColor: form.brandColors.accent || "#f59e0b" }}
                          data-testid="color-preview-accent"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </main>
            </div>
          </TabsContent>

          <TabsContent value="opportunities" className="mt-0">
            <OpportunityFinder speakerKits={kits} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
