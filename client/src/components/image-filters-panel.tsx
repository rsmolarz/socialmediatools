import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Palette,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Sun,
  Contrast,
  Droplets,
  Circle,
} from "lucide-react";

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  sepia: number;
  grayscale: number;
  opacity: number;
}

interface PresetFilter {
  id: string;
  name: string;
  settings: FilterSettings;
  preview: string;
}

const defaultSettings: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  sepia: 0,
  grayscale: 0,
  opacity: 100,
};

const presetFilters: PresetFilter[] = [
  {
    id: "original",
    name: "Original",
    settings: { ...defaultSettings },
    preview: "none",
  },
  {
    id: "vintage",
    name: "Vintage",
    settings: { ...defaultSettings, sepia: 40, contrast: 10, saturation: -20 },
    preview: "sepia(0.4) contrast(1.1)",
  },
  {
    id: "warm",
    name: "Warm",
    settings: { ...defaultSettings, hue: 20, saturation: 15, brightness: 5 },
    preview: "hue-rotate(20deg) saturate(1.15) brightness(1.05)",
  },
  {
    id: "cool",
    name: "Cool",
    settings: { ...defaultSettings, hue: -20, saturation: 10, brightness: 5 },
    preview: "hue-rotate(-20deg) saturate(1.1) brightness(1.05)",
  },
  {
    id: "dramatic",
    name: "Dramatic",
    settings: { ...defaultSettings, contrast: 30, saturation: 20, brightness: -10 },
    preview: "contrast(1.3) saturate(1.2) brightness(0.9)",
  },
  {
    id: "muted",
    name: "Muted",
    settings: { ...defaultSettings, saturation: -40, contrast: -10 },
    preview: "saturate(0.6) contrast(0.9)",
  },
  {
    id: "blackwhite",
    name: "B&W",
    settings: { ...defaultSettings, grayscale: 100, contrast: 20 },
    preview: "grayscale(1) contrast(1.2)",
  },
  {
    id: "noir",
    name: "Noir",
    settings: { ...defaultSettings, grayscale: 100, contrast: 40, brightness: -20 },
    preview: "grayscale(1) contrast(1.4) brightness(0.8)",
  },
  {
    id: "fade",
    name: "Fade",
    settings: { ...defaultSettings, brightness: 10, contrast: -15, saturation: -20 },
    preview: "brightness(1.1) contrast(0.85) saturate(0.8)",
  },
  {
    id: "punch",
    name: "Punch",
    settings: { ...defaultSettings, saturation: 40, contrast: 20, brightness: 5 },
    preview: "saturate(1.4) contrast(1.2) brightness(1.05)",
  },
  {
    id: "glow",
    name: "Glow",
    settings: { ...defaultSettings, brightness: 20, contrast: -5, saturation: 10 },
    preview: "brightness(1.2) contrast(0.95) saturate(1.1)",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    settings: { ...defaultSettings, contrast: 25, saturation: -10, brightness: -5, hue: 10 },
    preview: "contrast(1.25) saturate(0.9) brightness(0.95) hue-rotate(10deg)",
  },
];

interface ImageFiltersPanelProps {
  onApplyFilter?: (settings: FilterSettings) => void;
}

export function ImageFiltersPanel({ onApplyFilter }: ImageFiltersPanelProps) {
  const [settings, setSettings] = useState<FilterSettings>({ ...defaultSettings });
  const [selectedPreset, setSelectedPreset] = useState<string>("original");
  const [activeTab, setActiveTab] = useState<string>("presets");

  const getFilterStyle = (s: FilterSettings): string => {
    const filters: string[] = [];
    if (s.brightness !== 0) filters.push(`brightness(${1 + s.brightness / 100})`);
    if (s.contrast !== 0) filters.push(`contrast(${1 + s.contrast / 100})`);
    if (s.saturation !== 0) filters.push(`saturate(${1 + s.saturation / 100})`);
    if (s.hue !== 0) filters.push(`hue-rotate(${s.hue}deg)`);
    if (s.blur > 0) filters.push(`blur(${s.blur}px)`);
    if (s.sepia > 0) filters.push(`sepia(${s.sepia / 100})`);
    if (s.grayscale > 0) filters.push(`grayscale(${s.grayscale / 100})`);
    return filters.join(" ") || "none";
  };

  const handlePresetSelect = (preset: PresetFilter) => {
    setSelectedPreset(preset.id);
    setSettings({ ...preset.settings });
  };

  const handleSliderChange = (key: keyof FilterSettings, value: number) => {
    setSettings({ ...settings, [key]: value });
    setSelectedPreset("custom");
  };

  const handleReset = () => {
    setSettings({ ...defaultSettings });
    setSelectedPreset("original");
  };

  const handleApply = () => {
    onApplyFilter?.(settings);
  };

  const currentFilterStyle = getFilterStyle(settings);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Image Filters
          </h2>
          <p className="text-muted-foreground">
            Apply Instagram-style filters to enhance your thumbnails
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} data-testid="button-reset-filters">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleApply} data-testid="button-apply-filter">
            <Check className="h-4 w-4 mr-2" />
            Apply Filter
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="relative aspect-video bg-gradient-to-br from-primary/20 via-primary/10 to-background rounded-lg overflow-hidden"
                style={{ filter: currentFilterStyle }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-6 bg-background/80 rounded-lg">
                    <Palette className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <h3 className="text-xl font-bold">THE MEDICINE & MONEY SHOW</h3>
                    <p className="text-muted-foreground">Filter Preview</p>
                  </div>
                </div>
              </div>
              {selectedPreset !== "original" && (
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline">
                    {selectedPreset === "custom" ? "Custom Filter" : presetFilters.find(p => p.id === selectedPreset)?.name}
                  </Badge>
                  <code className="text-xs text-muted-foreground">{currentFilterStyle}</code>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="presets" className="flex-1" data-testid="tab-presets">
                <Palette className="h-4 w-4 mr-2" />
                Presets
              </TabsTrigger>
              <TabsTrigger value="adjust" className="flex-1" data-testid="tab-adjust">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Adjust
              </TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {presetFilters.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset)}
                        className={`relative p-2 rounded-lg border transition-all ${
                          selectedPreset === preset.id
                            ? "ring-2 ring-primary bg-primary/10"
                            : "hover-elevate"
                        }`}
                        data-testid={`filter-preset-${preset.id}`}
                      >
                        <div
                          className="aspect-square rounded bg-gradient-to-br from-primary/30 to-primary/10 mb-1"
                          style={{ filter: preset.preview }}
                        />
                        <p className="text-xs text-center truncate">{preset.name}</p>
                        {selectedPreset === preset.id && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjust" className="mt-4 space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Brightness
                      </Label>
                      <span className="text-sm text-muted-foreground">{settings.brightness}%</span>
                    </div>
                    <Slider
                      value={[settings.brightness]}
                      min={-100}
                      max={100}
                      step={1}
                      onValueChange={([v]) => handleSliderChange("brightness", v)}
                      data-testid="slider-brightness"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Contrast className="h-4 w-4" />
                        Contrast
                      </Label>
                      <span className="text-sm text-muted-foreground">{settings.contrast}%</span>
                    </div>
                    <Slider
                      value={[settings.contrast]}
                      min={-100}
                      max={100}
                      step={1}
                      onValueChange={([v]) => handleSliderChange("contrast", v)}
                      data-testid="slider-contrast"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        Saturation
                      </Label>
                      <span className="text-sm text-muted-foreground">{settings.saturation}%</span>
                    </div>
                    <Slider
                      value={[settings.saturation]}
                      min={-100}
                      max={100}
                      step={1}
                      onValueChange={([v]) => handleSliderChange("saturation", v)}
                      data-testid="slider-saturation"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Circle className="h-4 w-4" />
                        Hue Rotate
                      </Label>
                      <span className="text-sm text-muted-foreground">{settings.hue}°</span>
                    </div>
                    <Slider
                      value={[settings.hue]}
                      min={-180}
                      max={180}
                      step={1}
                      onValueChange={([v]) => handleSliderChange("hue", v)}
                      data-testid="slider-hue"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Sepia</Label>
                      <span className="text-sm text-muted-foreground">{settings.sepia}%</span>
                    </div>
                    <Slider
                      value={[settings.sepia]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => handleSliderChange("sepia", v)}
                      data-testid="slider-sepia"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Grayscale</Label>
                      <span className="text-sm text-muted-foreground">{settings.grayscale}%</span>
                    </div>
                    <Slider
                      value={[settings.grayscale]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => handleSliderChange("grayscale", v)}
                      data-testid="slider-grayscale"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Blur</Label>
                      <span className="text-sm text-muted-foreground">{settings.blur}px</span>
                    </div>
                    <Slider
                      value={[settings.blur]}
                      min={0}
                      max={20}
                      step={0.5}
                      onValueChange={([v]) => handleSliderChange("blur", v)}
                      data-testid="slider-blur"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
