import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  FileImage, 
  Loader2, 
  Zap, 
  Settings2,
  ImageIcon,
  FileType,
  Maximize2,
  Info
} from "lucide-react";

type ExportFormat = "png" | "jpg" | "webp" | "avif";
type ExportPreset = "youtube" | "instagram" | "twitter" | "linkedin" | "custom";

interface ExportSettings {
  format: ExportFormat;
  quality: number;
  width: number;
  height: number;
  preserveTransparency: boolean;
  optimizeForWeb: boolean;
  stripMetadata: boolean;
}

interface ExportOptimizerProps {
  onExport: (settings: ExportSettings) => void;
  thumbnailDataUrl?: string;
}

const FORMAT_INFO: Record<ExportFormat, { name: string; extension: string; description: string; supportsTransparency: boolean; maxQuality: number }> = {
  png: { name: "PNG", extension: ".png", description: "Lossless, best for graphics with transparency", supportsTransparency: true, maxQuality: 100 },
  jpg: { name: "JPEG", extension: ".jpg", description: "Great for photos, smaller file size", supportsTransparency: false, maxQuality: 100 },
  webp: { name: "WebP", extension: ".webp", description: "Modern format, excellent compression", supportsTransparency: true, maxQuality: 100 },
  avif: { name: "AVIF", extension: ".avif", description: "Next-gen format, best compression", supportsTransparency: true, maxQuality: 100 },
};

const PRESETS: Record<ExportPreset, { name: string; width: number; height: number; description: string }> = {
  youtube: { name: "YouTube Thumbnail", width: 1280, height: 720, description: "Standard YouTube thumbnail size" },
  instagram: { name: "Instagram Post", width: 1080, height: 1080, description: "Square format for feed posts" },
  twitter: { name: "Twitter/X Card", width: 1200, height: 675, description: "Optimized for Twitter cards" },
  linkedin: { name: "LinkedIn Post", width: 1200, height: 627, description: "Best size for LinkedIn posts" },
  custom: { name: "Custom Size", width: 1280, height: 720, description: "Set your own dimensions" },
};

export function ExportOptimizer({ onExport, thumbnailDataUrl }: ExportOptimizerProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [activePreset, setActivePreset] = useState<ExportPreset>("youtube");
  const [settings, setSettings] = useState<ExportSettings>({
    format: "png",
    quality: 90,
    width: 1280,
    height: 720,
    preserveTransparency: false,
    optimizeForWeb: true,
    stripMetadata: true,
  });
  const [estimatedSize, setEstimatedSize] = useState<string>("~150 KB");

  const updateSettings = (updates: Partial<ExportSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    
    // Estimate file size based on settings
    const baseSize = (updates.width || settings.width) * (updates.height || settings.height);
    const qualityFactor = (updates.quality || settings.quality) / 100;
    const format = updates.format || settings.format;
    
    let multiplier = 0.5;
    if (format === "png") multiplier = 2;
    else if (format === "jpg") multiplier = 0.3;
    else if (format === "webp") multiplier = 0.25;
    else if (format === "avif") multiplier = 0.15;
    
    const estimatedBytes = baseSize * multiplier * qualityFactor;
    if (estimatedBytes < 1024) {
      setEstimatedSize(`~${Math.round(estimatedBytes)} B`);
    } else if (estimatedBytes < 1024 * 1024) {
      setEstimatedSize(`~${Math.round(estimatedBytes / 1024)} KB`);
    } else {
      setEstimatedSize(`~${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`);
    }
  };

  const handlePresetChange = (preset: ExportPreset) => {
    setActivePreset(preset);
    if (preset !== "custom") {
      updateSettings({
        width: PRESETS[preset].width,
        height: PRESETS[preset].height,
      });
    }
  };

  const handleExport = async () => {
    if (!thumbnailDataUrl) {
      toast({
        title: "No thumbnail to export",
        description: "Please create a thumbnail first",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    
    try {
      // Create a canvas with the specified dimensions
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = thumbnailDataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = settings.width;
      canvas.height = settings.height;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) throw new Error("Could not get canvas context");

      // Fill with white for non-transparent formats
      if (!settings.preserveTransparency || !FORMAT_INFO[settings.format].supportsTransparency) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw the image scaled to fit
      ctx.drawImage(img, 0, 0, settings.width, settings.height);

      // Export based on format
      let mimeType: string;
      let extension: string;

      switch (settings.format) {
        case "jpg":
          mimeType = "image/jpeg";
          extension = "jpg";
          break;
        case "webp":
          mimeType = "image/webp";
          extension = "webp";
          break;
        case "avif":
          mimeType = "image/avif";
          extension = "avif";
          break;
        default:
          mimeType = "image/png";
          extension = "png";
      }

      const quality = settings.format === "png" ? undefined : settings.quality / 100;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      // Download the file
      const link = document.createElement("a");
      link.download = `thumbnail-${settings.width}x${settings.height}.${extension}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onExport(settings);

      toast({
        title: "Export successful",
        description: `Saved as ${FORMAT_INFO[settings.format].name} (${settings.width}x${settings.height})`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Could not export the thumbnail",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Export Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="format" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="format" data-testid="tab-format">
                <FileType className="h-4 w-4 mr-1" />
                Format
              </TabsTrigger>
              <TabsTrigger value="size" data-testid="tab-size">
                <Maximize2 className="h-4 w-4 mr-1" />
                Size
              </TabsTrigger>
              <TabsTrigger value="options" data-testid="tab-options">
                <Zap className="h-4 w-4 mr-1" />
                Options
              </TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Export Format</Label>
                <RadioGroup
                  value={settings.format}
                  onValueChange={(v) => updateSettings({ format: v as ExportFormat })}
                  className="grid grid-cols-2 gap-3"
                >
                  {Object.entries(FORMAT_INFO).map(([key, info]) => (
                    <div key={key} className="relative">
                      <RadioGroupItem
                        value={key}
                        id={`format-${key}`}
                        className="peer sr-only"
                        data-testid={`format-${key}`}
                      />
                      <Label
                        htmlFor={`format-${key}`}
                        className="flex flex-col p-3 border rounded-md cursor-pointer peer-checked:border-primary peer-checked:bg-primary/5 hover-elevate"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{info.name}</span>
                          {info.supportsTransparency && (
                            <Badge variant="outline" className="text-xs">Alpha</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">{info.description}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {settings.format !== "png" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Quality</Label>
                    <span className="text-sm text-muted-foreground">{settings.quality}%</span>
                  </div>
                  <Slider
                    value={[settings.quality]}
                    onValueChange={([v]) => updateSettings({ quality: v })}
                    min={10}
                    max={100}
                    step={5}
                    data-testid="quality-slider"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher quality = larger file size
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="size" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Size Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant={activePreset === key ? "default" : "outline"}
                      className="justify-start h-auto py-2"
                      onClick={() => handlePresetChange(key as ExportPreset)}
                      data-testid={`preset-${key}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs opacity-80">{preset.width}x{preset.height}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {activePreset === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Width (px)</Label>
                    <input
                      type="number"
                      value={settings.width}
                      onChange={(e) => updateSettings({ width: parseInt(e.target.value) || 1280 })}
                      className="w-full px-3 py-2 border rounded-md"
                      min={100}
                      max={4096}
                      data-testid="custom-width"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Height (px)</Label>
                    <input
                      type="number"
                      value={settings.height}
                      onChange={(e) => updateSettings({ height: parseInt(e.target.value) || 720 })}
                      className="w-full px-3 py-2 border rounded-md"
                      min={100}
                      max={4096}
                      data-testid="custom-height"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="options" className="space-y-4 mt-4">
              {FORMAT_INFO[settings.format].supportsTransparency && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Preserve Transparency</Label>
                    <p className="text-xs text-muted-foreground">Keep transparent areas in PNG/WebP/AVIF</p>
                  </div>
                  <Switch
                    checked={settings.preserveTransparency}
                    onCheckedChange={(v) => updateSettings({ preserveTransparency: v })}
                    data-testid="toggle-transparency"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Optimize for Web</Label>
                  <p className="text-xs text-muted-foreground">Compress for faster loading</p>
                </div>
                <Switch
                  checked={settings.optimizeForWeb}
                  onCheckedChange={(v) => updateSettings({ optimizeForWeb: v })}
                  data-testid="toggle-optimize"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Strip Metadata</Label>
                  <p className="text-xs text-muted-foreground">Remove EXIF data for smaller files</p>
                </div>
                <Switch
                  checked={settings.stripMetadata}
                  onCheckedChange={(v) => updateSettings({ stripMetadata: v })}
                  data-testid="toggle-metadata"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Estimated file size:</span>
              </div>
              <Badge variant="secondary">{estimatedSize}</Badge>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <FileImage className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {settings.width} x {settings.height} · {FORMAT_INFO[settings.format].name}
                {settings.format !== "png" && ` · ${settings.quality}% quality`}
              </span>
            </div>

            <Button 
              className="w-full" 
              onClick={handleExport}
              disabled={isExporting || !thumbnailDataUrl}
              data-testid="export-button"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Thumbnail
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
