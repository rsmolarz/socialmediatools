import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Type, 
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Droplets,
  Check
} from "lucide-react";

const FONTS = [
  { family: "Inter", category: "sans-serif", popular: true },
  { family: "Roboto", category: "sans-serif", popular: true },
  { family: "Montserrat", category: "sans-serif", popular: true },
  { family: "Oswald", category: "sans-serif", popular: true },
  { family: "Poppins", category: "sans-serif", popular: true },
  { family: "Lato", category: "sans-serif", popular: false },
  { family: "Open Sans", category: "sans-serif", popular: false },
  { family: "Playfair Display", category: "serif", popular: true },
  { family: "Merriweather", category: "serif", popular: false },
  { family: "Georgia", category: "serif", popular: false },
  { family: "Bebas Neue", category: "display", popular: true },
  { family: "Impact", category: "display", popular: true },
  { family: "Anton", category: "display", popular: false },
];

const FONT_WEIGHTS = [
  { value: "normal", label: "Regular", numeric: 400 },
  { value: "500", label: "Medium", numeric: 500 },
  { value: "600", label: "Semibold", numeric: 600 },
  { value: "bold", label: "Bold", numeric: 700 },
  { value: "800", label: "Extra Bold", numeric: 800 },
  { value: "900", label: "Black", numeric: 900 },
];

const TEXT_COLORS = [
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#000000" },
  { name: "Yellow", value: "#FFDD00" },
  { name: "Red", value: "#FF3B30" },
  { name: "Orange", value: "#FF9500" },
  { name: "Blue", value: "#007AFF" },
  { name: "Green", value: "#34C759" },
  { name: "Purple", value: "#AF52DE" },
  { name: "Cyan", value: "#5AC8FA" },
];

const TEXT_SHADOWS = [
  { name: "None", value: "none" },
  { name: "Subtle", value: "0 2px 4px rgba(0,0,0,0.3)" },
  { name: "Medium", value: "0 4px 8px rgba(0,0,0,0.5)" },
  { name: "Strong", value: "0 4px 16px rgba(0,0,0,0.7)" },
  { name: "Glow", value: "0 0 20px rgba(255,255,255,0.5)" },
  { name: "Neon", value: "0 0 10px currentColor, 0 0 20px currentColor" },
];

interface FontConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  color: string;
  textShadow: string;
  letterSpacing: number;
  lineHeight: number;
}

interface FontManagementProps {
  config?: Partial<FontConfig>;
  onChange?: (config: FontConfig) => void;
  previewText?: string;
}

export function FontManagement({ 
  config: externalConfig, 
  onChange,
  previewText = "Sample Text"
}: FontManagementProps) {
  const [config, setConfig] = useState<FontConfig>({
    fontFamily: "Inter",
    fontSize: 48,
    fontWeight: "bold",
    fontStyle: "normal",
    textAlign: "center",
    color: "#FFFFFF",
    textShadow: "none",
    letterSpacing: 0,
    lineHeight: 1.2,
    ...externalConfig,
  });

  const updateConfig = (updates: Partial<FontConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange?.(newConfig);
  };

  const fontsByCategory = {
    popular: FONTS.filter(f => f.popular),
    "sans-serif": FONTS.filter(f => f.category === "sans-serif"),
    serif: FONTS.filter(f => f.category === "serif"),
    display: FONTS.filter(f => f.category === "display"),
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div 
          className="h-40 bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center p-4"
        >
          <div
            style={{
              fontFamily: config.fontFamily,
              fontSize: `${Math.min(config.fontSize, 72)}px`,
              fontWeight: config.fontWeight,
              fontStyle: config.fontStyle,
              textAlign: config.textAlign,
              color: config.color,
              textShadow: config.textShadow,
              letterSpacing: `${config.letterSpacing}px`,
              lineHeight: config.lineHeight,
            }}
            className="max-w-full truncate"
            data-testid="font-preview"
          >
            {previewText}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Font Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="popular">
              <TabsList className="w-full">
                <TabsTrigger value="popular" className="flex-1">Popular</TabsTrigger>
                <TabsTrigger value="sans-serif" className="flex-1">Sans</TabsTrigger>
                <TabsTrigger value="serif" className="flex-1">Serif</TabsTrigger>
                <TabsTrigger value="display" className="flex-1">Display</TabsTrigger>
              </TabsList>
              {Object.entries(fontsByCategory).map(([category, fonts]) => (
                <TabsContent key={category} value={category} className="mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    {fonts.map((font) => (
                      <div
                        key={font.family}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          config.fontFamily === font.family
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => updateConfig({ fontFamily: font.family })}
                        data-testid={`font-${font.family.replace(/\s/g, "-").toLowerCase()}`}
                      >
                        <div 
                          className="text-lg truncate"
                          style={{ fontFamily: font.family }}
                        >
                          {font.family}
                        </div>
                        {config.fontFamily === font.family && (
                          <Check className="w-4 h-4 text-primary mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bold className="w-5 h-5" />
              Typography
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Font Size</Label>
                <span className="text-sm text-muted-foreground">{config.fontSize}px</span>
              </div>
              <Slider
                value={[config.fontSize]}
                onValueChange={([v]) => updateConfig({ fontSize: v })}
                min={12}
                max={120}
                step={1}
                data-testid="slider-font-size"
              />
            </div>

            <div>
              <Label className="mb-2 block">Font Weight</Label>
              <Select 
                value={config.fontWeight} 
                onValueChange={(v) => updateConfig({ fontWeight: v })}
              >
                <SelectTrigger data-testid="select-font-weight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      <span style={{ fontWeight: weight.numeric }}>{weight.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Style & Alignment</Label>
              <div className="flex gap-2">
                <Button
                  variant={config.fontStyle === "italic" ? "default" : "outline"}
                  size="icon"
                  onClick={() => updateConfig({ 
                    fontStyle: config.fontStyle === "italic" ? "normal" : "italic" 
                  })}
                  data-testid="button-italic"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={config.textAlign === "left" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-none"
                    onClick={() => updateConfig({ textAlign: "left" })}
                    data-testid="button-align-left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={config.textAlign === "center" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-none"
                    onClick={() => updateConfig({ textAlign: "center" })}
                    data-testid="button-align-center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={config.textAlign === "right" ? "default" : "ghost"}
                    size="icon"
                    className="rounded-none"
                    onClick={() => updateConfig({ textAlign: "right" })}
                    data-testid="button-align-right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Letter Spacing</Label>
                <span className="text-sm text-muted-foreground">{config.letterSpacing}px</span>
              </div>
              <Slider
                value={[config.letterSpacing]}
                onValueChange={([v]) => updateConfig({ letterSpacing: v })}
                min={-5}
                max={20}
                step={0.5}
                data-testid="slider-letter-spacing"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Height</Label>
                <span className="text-sm text-muted-foreground">{config.lineHeight}</span>
              </div>
              <Slider
                value={[config.lineHeight]}
                onValueChange={([v]) => updateConfig({ lineHeight: v })}
                min={0.8}
                max={2}
                step={0.1}
                data-testid="slider-line-height"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Text Color
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110 ${
                    config.color === color.value ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => updateConfig({ color: color.value })}
                  title={color.name}
                  data-testid={`color-${color.name.toLowerCase()}`}
                />
              ))}
            </div>
            <div className="mt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">Custom Color</Label>
              <input
                type="color"
                value={config.color}
                onChange={(e) => updateConfig({ color: e.target.value })}
                className="w-full h-10 rounded-lg cursor-pointer"
                data-testid="input-custom-color"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5" />
              Text Shadow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {TEXT_SHADOWS.map((shadow) => (
                <div
                  key={shadow.name}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    config.textShadow === shadow.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => updateConfig({ textShadow: shadow.value })}
                  data-testid={`shadow-${shadow.name.toLowerCase()}`}
                >
                  <div 
                    className="text-lg font-bold text-center"
                    style={{ textShadow: shadow.value !== "none" ? shadow.value : undefined }}
                  >
                    Aa
                  </div>
                  <div className="text-xs text-center text-muted-foreground mt-1">
                    {shadow.name}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
