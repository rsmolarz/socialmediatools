import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Crop,
  Maximize,
  SlidersHorizontal,
  Layers,
  Droplet,
  Sun,
  Contrast,
  Palette,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Image as ImageIcon
} from "lucide-react";

interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  opacity: number;
}

interface ImageTransform {
  rotation: number;
  scaleX: number;
  scaleY: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

interface AdvancedImageEditorProps {
  imageUrl?: string;
  onSave?: (dataUrl: string) => void;
}

const FILTER_PRESETS = [
  { name: "None", filters: { brightness: 100, contrast: 100, saturation: 100, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, opacity: 100 } },
  { name: "Vivid", filters: { brightness: 110, contrast: 120, saturation: 130, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, opacity: 100 } },
  { name: "Muted", filters: { brightness: 95, contrast: 90, saturation: 70, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, opacity: 100 } },
  { name: "Warm", filters: { brightness: 105, contrast: 105, saturation: 110, blur: 0, grayscale: 0, sepia: 30, hueRotate: 0, opacity: 100 } },
  { name: "Cool", filters: { brightness: 100, contrast: 100, saturation: 90, blur: 0, grayscale: 0, sepia: 0, hueRotate: 180, opacity: 100 } },
  { name: "B&W", filters: { brightness: 100, contrast: 110, saturation: 0, blur: 0, grayscale: 100, sepia: 0, hueRotate: 0, opacity: 100 } },
  { name: "Vintage", filters: { brightness: 110, contrast: 85, saturation: 80, blur: 0, grayscale: 20, sepia: 40, hueRotate: 0, opacity: 100 } },
  { name: "Drama", filters: { brightness: 90, contrast: 140, saturation: 120, blur: 0, grayscale: 0, sepia: 0, hueRotate: 0, opacity: 100 } },
];

const OVERLAY_COLORS = [
  { name: "None", color: "transparent" },
  { name: "Dark", color: "rgba(0,0,0,0.5)" },
  { name: "Light", color: "rgba(255,255,255,0.3)" },
  { name: "Blue", color: "rgba(0,100,200,0.3)" },
  { name: "Red", color: "rgba(200,50,50,0.3)" },
  { name: "Gold", color: "rgba(200,150,50,0.3)" },
  { name: "Purple", color: "rgba(100,50,150,0.3)" },
  { name: "Green", color: "rgba(50,150,100,0.3)" },
];

export function AdvancedImageEditor({ imageUrl, onSave }: AdvancedImageEditorProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl || "");
  const [activeTab, setActiveTab] = useState("filters");
  const [overlay, setOverlay] = useState("transparent");

  const [filters, setFilters] = useState<ImageFilters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    hueRotate: 0,
    opacity: 100,
  });

  const [transform, setTransform] = useState<ImageTransform>({
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    cropX: 0,
    cropY: 0,
    cropWidth: 100,
    cropHeight: 100,
  });

  useEffect(() => {
    if (currentImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setLoadedImage(img);
        renderImage(img);
      };
      img.src = currentImageUrl;
    }
  }, [currentImageUrl]);

  useEffect(() => {
    if (loadedImage) {
      renderImage(loadedImage);
    }
  }, [filters, transform, overlay]);

  const renderImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.filter = `
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      saturate(${filters.saturation}%)
      blur(${filters.blur}px)
      grayscale(${filters.grayscale}%)
      sepia(${filters.sepia}%)
      hue-rotate(${filters.hueRotate}deg)
      opacity(${filters.opacity}%)
    `;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.drawImage(img, 0, 0);

    if (overlay !== "transparent") {
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCurrentImageUrl(url);
      toast({ title: "Image Loaded" });
    }
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave?.(dataUrl);

    const link = document.createElement("a");
    link.download = "edited-image.png";
    link.href = dataUrl;
    link.click();
    toast({ title: "Image Exported" });
  };

  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      grayscale: 0,
      sepia: 0,
      hueRotate: 0,
      opacity: 100,
    });
  };

  const resetTransform = () => {
    setTransform({
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      cropX: 0,
      cropY: 0,
      cropWidth: 100,
      cropHeight: 100,
    });
  };

  const applyPreset = (preset: typeof FILTER_PRESETS[0]) => {
    setFilters(preset.filters);
    toast({ title: `Applied: ${preset.name}` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Advanced Image Editor
              </CardTitle>
              <CardDescription>Crop, resize, apply filters and overlays</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button onClick={handleExport} disabled={!loadedImage}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-[300px]">
              {loadedImage ? (
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[400px] rounded-lg shadow-lg"
                  data-testid="image-canvas"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Upload an image to start editing</p>
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="filters" className="flex-1">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </TabsTrigger>
                <TabsTrigger value="transform" className="flex-1">
                  <RotateCw className="w-4 h-4 mr-2" />
                  Transform
                </TabsTrigger>
                <TabsTrigger value="overlay" className="flex-1">
                  <Layers className="w-4 h-4 mr-2" />
                  Overlay
                </TabsTrigger>
              </TabsList>

              <TabsContent value="filters" className="mt-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium">Presets</Label>
                      <Button variant="ghost" size="sm" onClick={resetFilters}>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reset
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {FILTER_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          variant="outline"
                          size="sm"
                          onClick={() => applyPreset(preset)}
                          className="text-xs"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-3 pt-4">
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Sun className="w-4 h-4" />
                          Brightness: {filters.brightness}%
                        </Label>
                        <Slider
                          value={[filters.brightness]}
                          onValueChange={([v]) => setFilters({ ...filters, brightness: v })}
                          min={0}
                          max={200}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Contrast className="w-4 h-4" />
                          Contrast: {filters.contrast}%
                        </Label>
                        <Slider
                          value={[filters.contrast]}
                          onValueChange={([v]) => setFilters({ ...filters, contrast: v })}
                          min={0}
                          max={200}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Palette className="w-4 h-4" />
                          Saturation: {filters.saturation}%
                        </Label>
                        <Slider
                          value={[filters.saturation]}
                          onValueChange={([v]) => setFilters({ ...filters, saturation: v })}
                          min={0}
                          max={200}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2 mb-2">
                          <Droplet className="w-4 h-4" />
                          Blur: {filters.blur}px
                        </Label>
                        <Slider
                          value={[filters.blur]}
                          onValueChange={([v]) => setFilters({ ...filters, blur: v })}
                          min={0}
                          max={20}
                        />
                      </div>
                      <div>
                        <Label className="mb-2">Grayscale: {filters.grayscale}%</Label>
                        <Slider
                          value={[filters.grayscale]}
                          onValueChange={([v]) => setFilters({ ...filters, grayscale: v })}
                          min={0}
                          max={100}
                        />
                      </div>
                      <div>
                        <Label className="mb-2">Sepia: {filters.sepia}%</Label>
                        <Slider
                          value={[filters.sepia]}
                          onValueChange={([v]) => setFilters({ ...filters, sepia: v })}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="transform" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Transform Controls</Label>
                    <Button variant="ghost" size="sm" onClick={resetTransform}>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                  </div>

                  <div>
                    <Label className="mb-2">Rotation: {transform.rotation}°</Label>
                    <Slider
                      value={[transform.rotation]}
                      onValueChange={([v]) => setTransform({ ...transform, rotation: v })}
                      min={-180}
                      max={180}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setTransform({ ...transform, rotation: transform.rotation + 90 })}
                    >
                      <RotateCw className="w-4 h-4 mr-2" />
                      Rotate 90°
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTransform({ ...transform, scaleX: transform.scaleX * -1 })}
                    >
                      <FlipHorizontal className="w-4 h-4 mr-2" />
                      Flip H
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTransform({ ...transform, scaleY: transform.scaleY * -1 })}
                    >
                      <FlipVertical className="w-4 h-4 mr-2" />
                      Flip V
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="overlay" className="mt-4">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Color Overlays</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {OVERLAY_COLORS.map((o) => (
                      <Button
                        key={o.name}
                        variant={overlay === o.color ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOverlay(o.color)}
                        className="text-xs"
                      >
                        <div
                          className="w-4 h-4 rounded mr-2 border"
                          style={{ backgroundColor: o.color === "transparent" ? "#fff" : o.color }}
                        />
                        {o.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
