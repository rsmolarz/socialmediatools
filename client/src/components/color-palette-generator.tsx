import { useState } from "react";
import { Palette, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const PALETTES = [
  { name: "Medical Trust", colors: ["#0EA5E9", "#0369A1", "#F0F9FF", "#0F172A"] },
  { name: "Financial Growth", colors: ["#10B981", "#047857", "#ECFDF5", "#064E3B"] },
  { name: "Modern Dark", colors: ["#F43F5E", "#881337", "#1E293B", "#0F172A"] },
  { name: "Vibrant Tech", colors: ["#8B5CF6", "#5B21B6", "#F5F3FF", "#2E1065"] }
];

export function ColorPaletteGenerator() {
  const { toast } = useToast();
  const [activePalette, setActivePalette] = useState(PALETTES[0]);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyToClipboard = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    toast({
      title: "Copied!",
      description: `${color} copied to clipboard.`
    });
    setTimeout(() => setCopiedColor(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Brand Color Palettes
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-suggested color combinations for your brand
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PALETTES.map((palette) => (
          <Card key={palette.name} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{palette.name}</span>
                <Button variant="ghost" size="sm" onClick={() => setActivePalette(palette)}>
                  Select
                </Button>
              </div>
              <div className="flex h-12 w-full rounded-md overflow-hidden">
                {palette.colors.map((color) => (
                  <div
                    key={color}
                    className="flex-1 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center group"
                    style={{ backgroundColor: color }}
                    onClick={() => copyToClipboard(color)}
                  >
                    {copiedColor === color ? (
                      <Check className="w-4 h-4 text-white drop-shadow-md" />
                    ) : (
                      <Copy className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
