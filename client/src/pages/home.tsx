import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { BackgroundControls } from "@/components/background-controls";
import { SavedThumbnails } from "@/components/saved-thumbnails";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Plus,
  Download,
  Save,
  Type,
  Image as ImageIcon,
  FolderOpen,
  Sparkles,
  Layers,
} from "lucide-react";
import type { ThumbnailConfig, TextOverlay, Thumbnail, InsertThumbnail } from "@shared/schema";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const DEFAULT_CONFIG: ThumbnailConfig = {
  backgroundColor: "#1a1a2e",
  overlays: [],
  width: 1280,
  height: 720,
};

export default function Home() {
  const { toast } = useToast();
  const canvasRef = useRef<ThumbnailCanvasRef>(null);
  
  const [config, setConfig] = useState<ThumbnailConfig>(DEFAULT_CONFIG);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [thumbnailTitle, setThumbnailTitle] = useState("My Thumbnail");
  const [editingId, setEditingId] = useState<string | null>(null);

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
              onClick={handleDownload}
              data-testid="button-download"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Save"}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

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

            {/* Text Layers */}
            {config.overlays.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text Layers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {config.overlays.map((overlay) => (
                      <Button
                        key={overlay.id}
                        variant={selectedTextId === overlay.id ? "default" : "secondary"}
                        size="sm"
                        onClick={() => setSelectedTextId(overlay.id)}
                        data-testid={`button-layer-${overlay.id}`}
                      >
                        {overlay.text.substring(0, 20)}
                        {overlay.text.length > 20 ? "..." : ""}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Controls Sidebar */}
          <div className="space-y-4">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="text" data-testid="tab-text">
                  <Type className="h-4 w-4 mr-2" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="background" data-testid="tab-background">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  BG
                </TabsTrigger>
                <TabsTrigger value="saved" data-testid="tab-saved">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Saved
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  {selectedOverlay ? (
                    <TextControls
                      overlay={selectedOverlay}
                      onUpdate={(updates) => updateTextOverlay(selectedOverlay.id, updates)}
                      onDelete={() => deleteTextOverlay(selectedOverlay.id)}
                    />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Type className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Select a text layer to edit</p>
                      <p className="text-xs mt-1">or add a new text layer</p>
                      <Button
                        className="mt-4"
                        onClick={addTextOverlay}
                        data-testid="button-add-text-empty"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Text
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="background" className="mt-4">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <BackgroundControls
                    backgroundColor={config.backgroundColor}
                    backgroundImage={config.backgroundImage}
                    onColorChange={(color) =>
                      setConfig((prev) => ({ ...prev, backgroundColor: color }))
                    }
                    onImageChange={(image) =>
                      setConfig((prev) => ({ ...prev, backgroundImage: image }))
                    }
                  />
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
