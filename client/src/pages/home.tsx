import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ThumbnailCanvas, ThumbnailCanvasRef } from "@/components/thumbnail-canvas";
import { TextControls } from "@/components/text-controls";
import { TextLineControls } from "@/components/text-line-controls";
import { BackgroundControls } from "@/components/background-controls";
import { SavedThumbnails } from "@/components/saved-thumbnails";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobilePreview } from "@/components/mobile-preview";
import { PresetBackgrounds } from "@/components/preset-backgrounds";
import { PhotoControls, PhotoConfig } from "@/components/photo-controls";
import { TranscriptAnalyzer } from "@/components/transcript-analyzer";
import { ViralTitleHelper } from "@/components/viral-title-helper";
import { LayerPanel } from "@/components/layer-panel";
import { SocialMediaDashboard } from "@/components/social-media-dashboard";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useHistory } from "@/hooks/use-history";
import { useTheme } from "@/lib/theme-provider";
import {
  Plus,
  Download,
  Save,
  Type,
  Image as ImageIcon,
  FolderOpen,
  Sparkles,
  Layers,
  RotateCcw,
  Users,
  TrendingUp,
  Wrench,
  Undo2,
  Redo2,
  Keyboard,
  Shield,
} from "lucide-react";
import type { ThumbnailConfig, TextOverlay, TextLine, BackgroundEffects, Thumbnail, InsertThumbnail, PhotoConfig as PhotoConfigType } from "@shared/schema";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const DEFAULT_TEXT_LINES: TextLine[] = [
  { id: "line1", text: "the future of", highlight: true },
  { id: "line2", text: "physician", highlight: false },
  { id: "line3", text: "wealth", highlight: false },
];

const DEFAULT_EFFECTS: BackgroundEffects = {
  darkOverlay: 40,
  vignetteIntensity: 50,
  colorTint: "none",
};

const DEFAULT_PHOTO: PhotoConfigType = {
  url: null,
  scale: 100,
  offsetX: 0,
  offsetY: 0,
};

const DEFAULT_CONFIG: ThumbnailConfig = {
  backgroundColor: "#000000",
  backgroundOpacity: 50,
  overlays: [],
  width: 1280,
  height: 720,
  textLines: DEFAULT_TEXT_LINES,
  layout: "centered",
  accentColor: "orange",
  backgroundEffects: DEFAULT_EFFECTS,
  elementOpacity: 70,
  hostPhoto: DEFAULT_PHOTO,
  guestPhoto: DEFAULT_PHOTO,
};

export default function Home() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const canvasRef = useRef<ThumbnailCanvasRef>(null);
  
  const {
    state: config,
    setState: setConfig,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useHistory<ThumbnailConfig>({
    initialState: DEFAULT_CONFIG,
    maxHistorySize: 50,
  });
  
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [thumbnailTitle, setThumbnailTitle] = useState("My Thumbnail");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  useEffect(() => {
    const updatePreview = () => {
      const dataUrl = canvasRef.current?.getDataUrl();
      if (dataUrl) {
        setCanvasDataUrl(dataUrl);
      }
    };
    const timer = setTimeout(updatePreview, 100);
    return () => clearTimeout(timer);
  }, [config]);

  const { data: thumbnails = [], isLoading: thumbnailsLoading } = useQuery<Thumbnail[]>({
    queryKey: ["/api/thumbnails"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertThumbnail): Promise<Thumbnail> => {
      const url = editingId ? `/api/thumbnails/${editingId}` : "/api/thumbnails";
      const method = editingId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      
      return res.json();
    },
    onSuccess: (savedThumbnail: Thumbnail) => {
      queryClient.invalidateQueries({ queryKey: ["/api/thumbnails"] });
      setEditingId(savedThumbnail.id);
      toast({
        title: "Saved!",
        description: "Your thumbnail has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: "Failed to save thumbnail. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/thumbnails/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to delete");
      }
      return id;
    },
    onSuccess: (deletedId: string) => {
      queryClient.invalidateQueries({ queryKey: ["/api/thumbnails"] });
      if (editingId === deletedId) {
        setEditingId(null);
        setConfig(DEFAULT_CONFIG);
        setThumbnailTitle("My Thumbnail");
        setSelectedTextId(null);
      }
      toast({
        title: "Deleted",
        description: "Thumbnail has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete thumbnail.",
        variant: "destructive",
      });
    },
  });

  const addTextOverlay = useCallback(() => {
    const newOverlay: TextOverlay = {
      id: generateId(),
      text: "Your Text Here",
      x: config.width / 2,
      y: config.height / 2,
      fontSize: 72,
      fontFamily: "Inter",
      color: "#ffffff",
      fontWeight: "bold",
      textAlign: "center",
      shadow: true,
      outline: false,
    };

    setConfig((prev) => ({
      ...prev,
      overlays: [...prev.overlays, newOverlay],
    }));
    setSelectedTextId(newOverlay.id);
  }, [config.width, config.height]);

  const updateTextOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
    setConfig((prev) => ({
      ...prev,
      overlays: prev.overlays.map((overlay) =>
        overlay.id === id ? { ...overlay, ...updates } : overlay
      ),
    }));
  }, []);

  const deleteTextOverlay = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      overlays: prev.overlays.filter((overlay) => overlay.id !== id),
    }));
    if (selectedTextId === id) {
      setSelectedTextId(null);
    }
  }, [selectedTextId]);

  const handleTextMove = useCallback((id: string, x: number, y: number) => {
    updateTextOverlay(id, { x, y });
  }, [updateTextOverlay]);

  const handleDownload = () => {
    canvasRef.current?.downloadImage();
    toast({
      title: "Downloaded!",
      description: "Your thumbnail has been downloaded.",
    });
  };

  const handleSave = () => {
    const data: InsertThumbnail = {
      title: thumbnailTitle,
      config,
      previewUrl: canvasRef.current?.getDataUrl() || null,
    };
    saveMutation.mutate(data);
  };

  const handleLoadThumbnail = (thumbnail: Thumbnail) => {
    setConfig(thumbnail.config);
    setThumbnailTitle(thumbnail.title);
    setEditingId(thumbnail.id);
    setSelectedTextId(null);
    toast({
      title: "Loaded",
      description: `"${thumbnail.title}" has been loaded into the editor.`,
    });
  };

  const handleNewThumbnail = () => {
    setConfig(DEFAULT_CONFIG);
    setThumbnailTitle("My Thumbnail");
    setEditingId(null);
    setSelectedTextId(null);
  };

  const handleResetToDefault = () => {
    resetHistory(DEFAULT_CONFIG);
    toast({
      title: "Reset Complete",
      description: "All settings have been reset to defaults.",
    });
  };

  const handleUndo = useCallback(() => {
    if (canUndo) {
      undo();
      toast({
        title: "Undo",
        description: "Previous action undone.",
      });
    }
  }, [canUndo, undo, toast]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      redo();
      toast({
        title: "Redo",
        description: "Action restored.",
      });
    }
  }, [canRedo, redo, toast]);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  useKeyboardShortcuts({
    onExport: handleDownload,
    onSave: handleSave,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onNew: handleNewThumbnail,
    onReset: handleResetToDefault,
    onToggleTheme: handleToggleTheme,
    onShowHelp: () => setShowShortcutsHelp(true),
    enabled: true,
  });

  const handlePresetBackground = (background: string) => {
    if (background.startsWith("linear-gradient")) {
      setConfig((prev) => ({ 
        ...prev, 
        backgroundImage: undefined,
        backgroundColor: background,
      }));
    } else {
      setConfig((prev) => ({ 
        ...prev, 
        backgroundImage: undefined,
        backgroundColor: background,
      }));
    }
    toast({
      title: "Background Applied",
      description: "Preset background has been applied.",
    });
  };

  // Handle transcript analysis results
  const handleTranscriptAnalysis = (analysis: {
    themes: string[];
    backgroundPrompt: string;
    style: string;
    mood: string;
    viralTitle?: string;
    youtubeTitle?: string;
    youtubeDescription?: string;
    tags?: string[];
    suggestedHeadline?: string[];
  }) => {
    // Update first text line with viral title, preserve others
    const title = analysis.viralTitle || analysis.suggestedHeadline?.[0];
    if (title) {
      setConfig((prev) => {
        const currentLines = prev.textLines || DEFAULT_TEXT_LINES;
        const newLines = [...currentLines];
        if (newLines[0]) {
          newLines[0] = { ...newLines[0], text: title };
        }
        return { ...prev, textLines: newLines };
      });
    }
    
    toast({
      title: "Transcript Analyzed",
      description: `Detected ${analysis.themes.length} themes. ${title ? "Title applied!" : "Background generating..."}`,
    });
  };

  // Generate AI background from transcript analysis
  const handleGenerateFromTranscript = async (prompt: string, style: string, mood: string) => {
    try {
      const fullPrompt = `${prompt}, ${style} style, ${mood} mood, abstract background for podcast thumbnail, no text, no people, vibrant colors`;
      
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, size: "1024x1024" }),
      });
      
      if (!response.ok) throw new Error("Failed to generate image");
      
      const data = await response.json();
      const imageUrl = `data:image/png;base64,${data.b64_json}`;
      
      setConfig((prev) => ({ ...prev, backgroundImage: imageUrl }));
      
      toast({
        title: "Background Generated",
        description: "AI background created from transcript themes!",
      });
    } catch (error) {
      console.error("Background generation error:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate background. Try again.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const dataUrl = canvasRef.current?.getDataUrl();
    if (dataUrl) {
      const link = document.createElement("a");
      link.download = `${thumbnailTitle.replace(/\s+/g, "_")}_1280x720.png`;
      link.href = dataUrl;
      link.click();
      toast({
        title: "Exported!",
        description: "Thumbnail exported at 1280×720 resolution.",
      });
    }
  };

  const selectedOverlay = config.overlays.find((o) => o.id === selectedTextId);

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">Thumbnail Generator</h1>
              <p className="text-xs text-muted-foreground">Create stunning thumbnails</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleNewThumbnail}
              data-testid="button-new-thumbnail"
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
            <Button
              variant="outline"
              onClick={handleResetToDefault}
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export 1280×720
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
            <Link href="/tools">
              <Button variant="outline" data-testid="button-tools">
                <Wrench className="h-4 w-4 mr-2" />
                Tools
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" data-testid="button-admin">
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
            <div className="flex items-center gap-1 border-l pl-3 ml-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                data-testid="button-undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                data-testid="button-redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowShortcutsHelp(true)}
                title="Keyboard Shortcuts (Shift+?)"
                data-testid="button-shortcuts"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <KeyboardShortcutsHelp 
        open={showShortcutsHelp} 
        onOpenChange={setShowShortcutsHelp} 
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Input
                      value={thumbnailTitle}
                      onChange={(e) => setThumbnailTitle(e.target.value)}
                      className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
                      placeholder="Thumbnail title..."
                      data-testid="input-thumbnail-title"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {config.width} x {config.height}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ThumbnailCanvas
                  ref={canvasRef}
                  config={config}
                  selectedTextId={selectedTextId}
                  onTextSelect={setSelectedTextId}
                  onTextMove={handleTextMove}
                />

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Button onClick={addTextOverlay} data-testid="button-add-text">
                    <Type className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>
                  <div className="flex-1" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers className="h-4 w-4" />
                    {config.overlays.length} layer{config.overlays.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layer Panel with Drag & Drop */}
            <LayerPanel
              config={config}
              onConfigChange={setConfig}
              selectedLayerId={selectedTextId}
              onLayerSelect={(id) => setSelectedTextId(id)}
            />
          </div>

          {/* Controls Sidebar */}
          <div className="space-y-4">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="text" data-testid="tab-text">
                  <Type className="h-4 w-4 mr-1" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="photos" data-testid="tab-photos">
                  <Users className="h-4 w-4 mr-1" />
                  Photos
                </TabsTrigger>
                <TabsTrigger value="background" data-testid="tab-background">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  BG
                </TabsTrigger>
                <TabsTrigger value="social" data-testid="tab-social">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Social
                </TabsTrigger>
                <TabsTrigger value="saved" data-testid="tab-saved">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Saved
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <div className="space-y-4">
                    <ViralTitleHelper
                      currentTitle={config.textLines?.[0]?.text || ""}
                      onTitleSelect={(title) => {
                        setConfig((prev) => {
                          const currentLines = prev.textLines || DEFAULT_TEXT_LINES;
                          const newLines = [...currentLines];
                          if (newLines[0]) {
                            newLines[0] = { ...newLines[0], text: title };
                          }
                          return { ...prev, textLines: newLines };
                        });
                      }}
                    />
                    <TextLineControls
                      lines={config.textLines || []}
                      layout={config.layout || "centered"}
                      accentColor={config.accentColor || "orange"}
                      onLinesChange={(lines) => setConfig((prev) => ({ ...prev, textLines: lines }))}
                      onLayoutChange={(layout) => setConfig((prev) => ({ ...prev, layout }))}
                      onAccentColorChange={(accentColor) => setConfig((prev) => ({ ...prev, accentColor }))}
                    />
                  </div>
                  
                  {selectedOverlay && (
                    <div className="mt-4">
                      <TextControls
                        overlay={selectedOverlay}
                        onUpdate={(updates) => updateTextOverlay(selectedOverlay.id, updates)}
                        onDelete={() => deleteTextOverlay(selectedOverlay.id)}
                      />
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <div className="space-y-4">
                    <PhotoControls
                      hostPhoto={config.hostPhoto || DEFAULT_PHOTO}
                      guestPhoto={config.guestPhoto || DEFAULT_PHOTO}
                      onHostPhotoChange={(photo) => setConfig((prev) => ({ ...prev, hostPhoto: photo }))}
                      onGuestPhotoChange={(photo) => setConfig((prev) => ({ ...prev, guestPhoto: photo }))}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="background" className="mt-4">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <div className="space-y-4">
                    <TranscriptAnalyzer
                      onAnalysisComplete={handleTranscriptAnalysis}
                      onGenerateBackground={handleGenerateFromTranscript}
                      onApplyViralTitle={(title) => {
                        setConfig((prev) => {
                          const currentLines = prev.textLines || DEFAULT_TEXT_LINES;
                          const newLines = [...currentLines];
                          if (newLines[0]) {
                            newLines[0] = { ...newLines[0], text: title };
                          }
                          return { ...prev, textLines: newLines };
                        });
                      }}
                    />
                    <BackgroundControls
                      backgroundColor={config.backgroundColor}
                      backgroundImage={config.backgroundImage}
                      backgroundOpacity={config.backgroundOpacity}
                      backgroundEffects={config.backgroundEffects}
                      elementOpacity={config.elementOpacity}
                      onColorChange={(color) =>
                        setConfig((prev) => ({ ...prev, backgroundColor: color }))
                      }
                      onImageChange={(image) =>
                        setConfig((prev) => ({ ...prev, backgroundImage: image }))
                      }
                      onBackgroundOpacityChange={(opacity) =>
                        setConfig((prev) => ({ ...prev, backgroundOpacity: opacity }))
                      }
                      onEffectsChange={(effects) =>
                        setConfig((prev) => ({ ...prev, backgroundEffects: effects }))
                      }
                      onElementOpacityChange={(opacity) =>
                        setConfig((prev) => ({ ...prev, elementOpacity: opacity }))
                      }
                    />
                    <PresetBackgrounds onSelect={handlePresetBackground} />
                    <MobilePreview canvasDataUrl={canvasDataUrl} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <SocialMediaDashboard />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="saved" className="mt-4">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <SavedThumbnails
                    thumbnails={thumbnails}
                    isLoading={thumbnailsLoading}
                    onLoad={handleLoadThumbnail}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Footer hint for future features */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur py-3">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Description & Tags Optimizer coming soon!</span>
        </div>
      </footer>
    </div>
  );
}
