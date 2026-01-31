import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  FileImage,
  Archive,
  Loader2,
  CheckCircle,
  Image,
  Settings2
} from "lucide-react";
import type { Thumbnail } from "@shared/schema";

interface BatchExportProps {
  thumbnails?: Thumbnail[];
  onExportComplete?: () => void;
}

export function BatchExport({ thumbnails: externalThumbnails, onExportComplete }: BatchExportProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<"png" | "jpg" | "webp">("png");
  const [quality, setQuality] = useState(90);
  const [includeConfig, setIncludeConfig] = useState(false);

  const { data: thumbnails = [], isLoading } = useQuery<Thumbnail[]>({
    queryKey: ["/api/thumbnails"],
    enabled: !externalThumbnails,
  });

  const allThumbnails = externalThumbnails || thumbnails;

  const batchExportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/export/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thumbnailIds: Array.from(selectedIds),
          format,
          includeConfig,
        }),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thumbnails-export.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({ title: "Export complete", description: "Your thumbnails have been downloaded" });
      onExportComplete?.();
    },
    onError: () => {
      toast({ title: "Export failed", description: "Unable to export thumbnails", variant: "destructive" });
    },
  });

  const singleExportMutation = useMutation({
    mutationFn: async (thumbnail: Thumbnail) => {
      if (!thumbnail.previewUrl) throw new Error("No preview available");

      const response = await apiRequest("/api/export/single", {
        method: "POST",
        body: JSON.stringify({
          imageData: thumbnail.previewUrl,
          format,
          quality,
        }),
      });

      const data = await response;
      const link = document.createElement("a");
      link.href = data.data;
      link.download = `${thumbnail.title || "thumbnail"}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onSuccess: () => {
      toast({ title: "Downloaded", description: "Thumbnail exported successfully" });
    },
  });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === allThumbnails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allThumbnails.map(t => t.id)));
    }
  };

  const formatInfo = {
    png: { name: "PNG", desc: "Lossless, transparent backgrounds", icon: FileImage },
    jpg: { name: "JPG", desc: "Smaller files, no transparency", icon: Image },
    webp: { name: "WebP", desc: "Modern format, best compression", icon: Image },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Export Settings
          </CardTitle>
          <CardDescription>Configure your export preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(formatInfo) as Array<keyof typeof formatInfo>).map((fmt) => {
              const info = formatInfo[fmt];
              return (
                <div
                  key={fmt}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    format === fmt 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setFormat(fmt)}
                  data-testid={`format-${fmt}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <info.icon className="w-5 h-5" />
                    <span className="font-medium">{info.name}</span>
                    {format === fmt && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{info.desc}</p>
                </div>
              );
            })}
          </div>

          {format !== "png" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Quality</Label>
                <span className="text-sm text-muted-foreground">{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                min={10}
                max={100}
                step={5}
                data-testid="slider-quality"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="includeConfig"
              checked={includeConfig}
              onCheckedChange={(v) => setIncludeConfig(!!v)}
              data-testid="checkbox-include-config"
            />
            <Label htmlFor="includeConfig" className="cursor-pointer">
              Include configuration files (JSON)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Select Thumbnails
              </CardTitle>
              <CardDescription>
                {selectedIds.size} of {allThumbnails.length} selected
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                {selectedIds.size === allThumbnails.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                size="sm"
                disabled={selectedIds.size === 0 || batchExportMutation.isPending}
                onClick={() => batchExportMutation.mutate()}
                data-testid="button-batch-export"
              >
                {batchExportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export {selectedIds.size} as ZIP
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : allThumbnails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No thumbnails available</p>
              <p className="text-sm">Create some thumbnails first</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allThumbnails.map((thumbnail) => (
                <div
                  key={thumbnail.id}
                  className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedIds.has(thumbnail.id)
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleSelection(thumbnail.id)}
                  data-testid={`thumbnail-select-${thumbnail.id}`}
                >
                  <div className="aspect-video bg-muted">
                    {thumbnail.previewUrl ? (
                      <img
                        src={thumbnail.previewUrl}
                        alt={thumbnail.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedIds.has(thumbnail.id)}
                      className="bg-background"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs truncate">{thumbnail.title}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); singleExportMutation.mutate(thumbnail); }}
                    disabled={singleExportMutation.isPending}
                    data-testid={`button-download-${thumbnail.id}`}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
