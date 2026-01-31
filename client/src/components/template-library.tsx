import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  LayoutTemplate, 
  Plus,
  Trash2,
  Eye,
  Check,
  Loader2,
  Sparkles,
  Heart,
  Briefcase,
  Gamepad2,
  Stethoscope,
  DollarSign
} from "lucide-react";
import type { Template } from "@shared/schema";

const CATEGORIES = [
  { id: "all", name: "All Templates", icon: LayoutTemplate },
  { id: "health", name: "Health & Wellness", icon: Stethoscope },
  { id: "finance", name: "Finance & Money", icon: DollarSign },
  { id: "tech", name: "Technology", icon: Sparkles },
  { id: "lifestyle", name: "Lifestyle", icon: Heart },
  { id: "gaming", name: "Gaming", icon: Gamepad2 },
  { id: "business", name: "Business", icon: Briefcase },
];

const DEFAULT_TEMPLATES: Partial<Template>[] = [
  {
    name: "Medicine & Money Classic",
    description: "The signature look for the Medicine & Money Show",
    category: "health",
    config: {
      backgroundColor: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      layout: "centered",
      accentColor: "orange",
      textLines: [
        { id: "1", text: "YOUR TITLE HERE", highlight: true },
        { id: "2", text: "Subtitle goes here", highlight: false },
        { id: "3", text: "Episode 001", highlight: false },
      ],
    },
    tags: ["podcast", "medicine", "money", "professional"],
  },
  {
    name: "Bold Finance",
    description: "High-impact financial content template",
    category: "finance",
    config: {
      backgroundColor: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      layout: "soloLeft",
      accentColor: "blue",
      textLines: [
        { id: "1", text: "WEALTH SECRETS", highlight: true },
        { id: "2", text: "What experts won't tell you", highlight: false },
        { id: "3", text: "", highlight: false },
      ],
    },
    tags: ["finance", "wealth", "investing", "bold"],
  },
  {
    name: "Tech Innovation",
    description: "Modern tech-focused thumbnail template",
    category: "tech",
    config: {
      backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      layout: "twoFace",
      accentColor: "purple",
      textLines: [
        { id: "1", text: "THE FUTURE IS NOW", highlight: true },
        { id: "2", text: "AI & Technology", highlight: false },
        { id: "3", text: "", highlight: false },
      ],
    },
    tags: ["tech", "innovation", "AI", "futuristic"],
  },
  {
    name: "Health Guru",
    description: "Clean and trustworthy health content",
    category: "health",
    config: {
      backgroundColor: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      layout: "soloRight",
      accentColor: "orange",
      textLines: [
        { id: "1", text: "HEALTH TIPS", highlight: true },
        { id: "2", text: "Doctor's advice", highlight: false },
        { id: "3", text: "", highlight: false },
      ],
    },
    tags: ["health", "wellness", "doctor", "medical"],
  },
  {
    name: "Gaming Epic",
    description: "Vibrant gaming content template",
    category: "gaming",
    config: {
      backgroundColor: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
      layout: "centered",
      accentColor: "orange",
      textLines: [
        { id: "1", text: "EPIC GAMEPLAY", highlight: true },
        { id: "2", text: "Watch Now", highlight: false },
        { id: "3", text: "", highlight: false },
      ],
    },
    tags: ["gaming", "epic", "gameplay", "vibrant"],
  },
  {
    name: "Lifestyle Minimal",
    description: "Clean minimal lifestyle aesthetic",
    category: "lifestyle",
    config: {
      backgroundColor: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
      layout: "soloLeft",
      accentColor: "blue",
      textLines: [
        { id: "1", text: "LIFE HACKS", highlight: true },
        { id: "2", text: "Simplify your day", highlight: false },
        { id: "3", text: "", highlight: false },
      ],
    },
    tags: ["lifestyle", "minimal", "clean", "aesthetic"],
  },
];

interface TemplateLibraryProps {
  onApplyTemplate?: (config: any) => void;
}

export function TemplateLibrary({ onApplyTemplate }: TemplateLibraryProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "health",
    tags: "",
  });

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      const response = await fetch(`/api/templates?${params}`);
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (template: any) => apiRequest("/api/templates", { method: "POST", body: JSON.stringify(template) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setShowCreateDialog(false);
      setNewTemplate({ name: "", description: "", category: "health", tags: "" });
      toast({ title: "Template created", description: "Your template has been saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const allTemplates = [...DEFAULT_TEMPLATES.map((t, i) => ({ ...t, id: -i - 1 } as Template)), ...templates];
  
  const filteredTemplates = allTemplates.filter(t => {
    if (selectedCategory !== "all" && t.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(query) || 
             t.description?.toLowerCase().includes(query) ||
             t.tags?.some(tag => tag.toLowerCase().includes(query));
    }
    return true;
  });

  const handleApplyTemplate = (template: Template) => {
    if (onApplyTemplate && template.config) {
      onApplyTemplate(template.config);
      toast({ title: "Template applied", description: `"${template.name}" has been applied` });
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name) {
      toast({ title: "Name required", description: "Please enter a template name", variant: "destructive" });
      return;
    }

    createTemplateMutation.mutate({
      name: newTemplate.name,
      description: newTemplate.description,
      category: newTemplate.category,
      tags: newTemplate.tags.split(",").map(t => t.trim()).filter(Boolean),
      config: {},
      isPublic: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-template-search"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-template">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="flex items-center gap-1.5"
              data-testid={`tab-category-${cat.id}`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{cat.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
              <p className="text-sm">Try a different category or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="overflow-hidden hover-elevate cursor-pointer group"
                  data-testid={`card-template-${template.id}`}
                >
                  <div 
                    className="h-32 relative"
                    style={{ 
                      background: typeof template.config === 'object' && template.config !== null 
                        ? (template.config as any).backgroundColor || "#1a1a2e" 
                        : "#1a1a2e"
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg opacity-80">
                      {template.name}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); setPreviewTemplate(template); }}
                        data-testid={`button-preview-${template.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleApplyTemplate(template); }}
                        data-testid={`button-apply-${template.id}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      {template.id > 0 && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={(e) => { e.stopPropagation(); deleteTemplateMutation.mutate(template.id); }}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm truncate">{template.name}</h4>
                    <p className="text-xs text-muted-foreground truncate mt-1">{template.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>
          <div 
            className="h-64 rounded-lg flex items-center justify-center text-white"
            style={{ 
              background: previewTemplate?.config 
                ? (previewTemplate.config as any).backgroundColor || "#1a1a2e" 
                : "#1a1a2e"
            }}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold">Preview</h3>
              <p className="text-sm opacity-70">Template preview</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Cancel</Button>
            <Button onClick={() => { handleApplyTemplate(previewTemplate!); setPreviewTemplate(null); }}>
              Apply Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>Save your current design as a reusable template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="My Awesome Template"
                data-testid="input-template-name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Describe your template..."
                data-testid="input-template-description"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}>
                <SelectTrigger data-testid="select-template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c.id !== "all").map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={newTemplate.tags}
                onChange={(e) => setNewTemplate({ ...newTemplate, tags: e.target.value })}
                placeholder="podcast, professional, dark"
                data-testid="input-template-tags"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {createTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
