import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Palette,
  Type,
  Image,
  Plus,
  Trash2,
  Check,
  Loader2,
  Edit,
  Save,
  Sparkles,
  Copy
} from "lucide-react";

interface BrandKit {
  id: number;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    accent: string;
  };
  logos: Array<{ url: string; variant: string }>;
  createdAt: string;
}

interface BrandKitManagementProps {
  onApplyKit?: (kit: BrandKit) => void;
}

const FONT_OPTIONS = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Lato", "Poppins",
  "Oswald", "Raleway", "Nunito", "Playfair Display", "Bebas Neue", "Anton"
];

const COLOR_PRESETS = [
  { name: "Professional Blue", colors: { primary: "#0066CC", secondary: "#003366", accent: "#66B2FF", bg: "#F5F8FA" } },
  { name: "Medical Trust", colors: { primary: "#0077B6", secondary: "#023E8A", accent: "#48CAE4", bg: "#FFFFFF" } },
  { name: "Wealth Gold", colors: { primary: "#D4AF37", secondary: "#1A1A2E", accent: "#FFD700", bg: "#0D0D0D" } },
  { name: "Modern Dark", colors: { primary: "#6366F1", secondary: "#4F46E5", accent: "#A5B4FC", bg: "#0F172A" } },
  { name: "Fresh Green", colors: { primary: "#22C55E", secondary: "#15803D", accent: "#86EFAC", bg: "#F0FDF4" } },
  { name: "Bold Red", colors: { primary: "#EF4444", secondary: "#B91C1C", accent: "#FCA5A5", bg: "#FEF2F2" } },
];

// Helper to normalize hex color (ensure # prefix and valid format)
const normalizeHex = (color: string): string => {
  let hex = color.trim().toUpperCase();
  if (!hex.startsWith("#")) {
    hex = "#" + hex;
  }
  // Validate hex format
  if (/^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex)) {
    return hex;
  }
  return "#000000"; // fallback
};

export function BrandKitManagement({ onApplyKit }: BrandKitManagementProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingKit, setEditingKit] = useState<BrandKit | null>(null);
  const [newKit, setNewKit] = useState({
    name: "",
    primaryColor: "#0066CC",
    secondaryColor: "#003366",
    accentColor: "#66B2FF",
    backgroundColor: "#FFFFFF",
    primaryFont: "Inter",
    secondaryFont: "Open Sans",
    logoUrl: "",
  });

  const { data: brandKits = [], isLoading } = useQuery<BrandKit[]>({
    queryKey: ["/api/brand-kits"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/brand-kits", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kits"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Brand Kit Created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create brand kit", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest(`/api/brand-kits/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kits"] });
      setEditingKit(null);
      toast({ title: "Brand Kit Updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/brand-kits/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kits"] });
      toast({ title: "Brand Kit Deleted" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/brand-kits/${id}/default`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-kits"] });
      toast({ title: "Default Kit Updated" });
    },
  });

  const resetForm = () => {
    setNewKit({
      name: "",
      primaryColor: "#0066CC",
      secondaryColor: "#003366",
      accentColor: "#66B2FF",
      backgroundColor: "#FFFFFF",
      primaryFont: "Inter",
      secondaryFont: "Open Sans",
      logoUrl: "",
    });
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setNewKit({
      ...newKit,
      primaryColor: preset.colors.primary,
      secondaryColor: preset.colors.secondary,
      accentColor: preset.colors.accent,
      backgroundColor: preset.colors.bg,
    });
  };

  const handleCreate = () => {
    if (!newKit.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    
    // Map internal flat state to the nested structure expected by schema
    const brandKitData = {
      name: newKit.name,
      userId: "user_123", // Placeholder, should ideally come from auth
      colors: {
        primary: newKit.primaryColor,
        secondary: newKit.secondaryColor,
        accent: newKit.accentColor,
        background: newKit.backgroundColor,
        text: "#000000" // Default text color
      },
      fonts: {
        heading: newKit.primaryFont,
        body: newKit.secondaryFont,
        accent: newKit.primaryFont
      },
      logos: newKit.logoUrl ? [{ url: newKit.logoUrl, variant: "primary" }] : []
    };
    
    createMutation.mutate(brandKitData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Kits
              </CardTitle>
              <CardDescription>Manage your brand colors, fonts, and logos</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-kit">
              <Plus className="w-4 h-4 mr-2" />
              New Kit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : brandKits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No brand kits yet. Create one to get started!</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brandKits.map((kit) => (
                  <Card
                    key={kit.id}
                    className="cursor-pointer transition-all"
                    data-testid={`brand-kit-${kit.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {kit.name}
                          </h4>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingKit(kit)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deleteMutation.mutate(kit.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-1 mb-3">
                        {[kit.colors?.primary, kit.colors?.secondary, kit.colors?.accent, kit.colors?.background].filter(Boolean).map((color, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge variant="outline" className="text-xs">
                          <Type className="w-3 h-3 mr-1" />
                          {kit.fonts?.heading || "Inter"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {kit.fonts?.body || "Open Sans"}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => onApplyKit?.(kit)}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Color Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <div
                key={preset.name}
                className="p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  applyPreset(preset);
                  setShowCreateDialog(true);
                }}
                data-testid={`preset-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex gap-1 mb-2">
                  {Object.values(preset.colors).map((color, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <p className="text-sm font-medium">{preset.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Brand Kit</DialogTitle>
            <DialogDescription>Define your brand colors and typography</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kit Name</Label>
              <Input
                placeholder="My Brand Kit"
                value={newKit.name}
                onChange={(e) => setNewKit({ ...newKit, name: e.target.value })}
                data-testid="input-kit-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="primary-color-input"
                    type="color"
                    value={normalizeHex(newKit.primaryColor)}
                    onChange={(e) => setNewKit({ ...newKit, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer shrink-0 p-0"
                  />
                  <Input
                    value={newKit.primaryColor}
                    onChange={(e) => setNewKit({ ...newKit, primaryColor: e.target.value })}
                    onBlur={(e) => setNewKit({ ...newKit, primaryColor: normalizeHex(e.target.value) })}
                    className="flex-1"
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>
              <div>
                <Label>Secondary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="secondary-color-input"
                    type="color"
                    value={normalizeHex(newKit.secondaryColor)}
                    onChange={(e) => setNewKit({ ...newKit, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer shrink-0 p-0"
                  />
                  <Input
                    value={newKit.secondaryColor}
                    onChange={(e) => setNewKit({ ...newKit, secondaryColor: e.target.value })}
                    onBlur={(e) => setNewKit({ ...newKit, secondaryColor: normalizeHex(e.target.value) })}
                    className="flex-1"
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>
              <div>
                <Label>Accent Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="accent-color-input"
                    type="color"
                    value={normalizeHex(newKit.accentColor)}
                    onChange={(e) => setNewKit({ ...newKit, accentColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer shrink-0 p-0"
                  />
                  <Input
                    value={newKit.accentColor}
                    onChange={(e) => setNewKit({ ...newKit, accentColor: e.target.value })}
                    onBlur={(e) => setNewKit({ ...newKit, accentColor: normalizeHex(e.target.value) })}
                    className="flex-1"
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>
              <div>
                <Label>Background</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="bg-color-input"
                    type="color"
                    value={normalizeHex(newKit.backgroundColor)}
                    onChange={(e) => setNewKit({ ...newKit, backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer shrink-0 p-0"
                  />
                  <Input
                    value={newKit.backgroundColor}
                    onChange={(e) => setNewKit({ ...newKit, backgroundColor: e.target.value })}
                    onBlur={(e) => setNewKit({ ...newKit, backgroundColor: normalizeHex(e.target.value) })}
                    className="flex-1"
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Font</Label>
                <Select value={newKit.primaryFont} onValueChange={(v) => setNewKit({ ...newKit, primaryFont: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font} value={font}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Secondary Font</Label>
                <Select value={newKit.secondaryFont} onValueChange={(v) => setNewKit({ ...newKit, secondaryFont: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font} value={font}>{font}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Logo URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={newKit.logoUrl}
                onChange={(e) => setNewKit({ ...newKit, logoUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Kit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
