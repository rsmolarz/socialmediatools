import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3X3 } from "lucide-react";

interface PresetBackgroundsProps {
  onSelect: (background: string) => void;
}

const PRESET_BACKGROUNDS = [
  { id: "gradient-1", type: "gradient", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", label: "Purple" },
  { id: "gradient-2", type: "gradient", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", label: "Pink" },
  { id: "gradient-3", type: "gradient", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", label: "Blue" },
  { id: "gradient-4", type: "gradient", value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", label: "Green" },
  { id: "gradient-5", type: "gradient", value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", label: "Sunset" },
  { id: "gradient-6", type: "gradient", value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", label: "Soft" },
  { id: "gradient-7", type: "gradient", value: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)", label: "Coral" },
  { id: "gradient-8", type: "gradient", value: "linear-gradient(135deg, #0c3483 0%, #a2b6df 50%, #6b8cce 100%)", label: "Ocean" },
  { id: "solid-1", type: "solid", value: "#1a1a2e", label: "Dark Navy" },
  { id: "solid-2", type: "solid", value: "#16213e", label: "Deep Blue" },
  { id: "solid-3", type: "solid", value: "#0f0f0f", label: "Near Black" },
  { id: "solid-4", type: "solid", value: "#2d132c", label: "Deep Purple" },
];

export function PresetBackgrounds({ onSelect }: PresetBackgroundsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Grid3X3 className="h-4 w-4" />
          Preset Backgrounds
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_BACKGROUNDS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.value)}
              className="aspect-video rounded-md overflow-hidden border-2 border-transparent hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ background: preset.value }}
              title={preset.label}
              data-testid={`button-preset-${preset.id}`}
            >
              <span className="sr-only">{preset.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
