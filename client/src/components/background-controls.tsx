import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageIcon, Palette, X, Upload } from "lucide-react";
import { useRef } from "react";

interface BackgroundControlsProps {
  backgroundColor: string;
  backgroundImage?: string;
  onColorChange: (color: string) => void;
  onImageChange: (imageUrl: string | undefined) => void;
}

const PRESET_COLORS = [
  { value: "#1a1a2e", label: "Dark Navy" },
  { value: "#16213e", label: "Deep Blue" },
  { value: "#0f0f23", label: "Midnight" },
  { value: "#1e1e1e", label: "Dark Gray" },
  { value: "#2d2d44", label: "Slate" },
  { value: "#3d1a4a", label: "Purple Dark" },
  { value: "#1a3a3a", label: "Teal Dark" },
  { value: "#3a1a1a", label: "Red Dark" },
];

const GRADIENT_PRESETS = [
  { value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", label: "Purple Dream" },
  { value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", label: "Pink Sunset" },
  { value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", label: "Ocean Blue" },
  { value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", label: "Mint Fresh" },
  { value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", label: "Warm Glow" },
  { value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", label: "Soft Pink" },
  { value: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)", label: "Coral" },
  { value: "linear-gradient(135deg, #0c0c0c 0%, #1e1e1e 100%)", label: "Dark Void" },
];

export function BackgroundControls({
  backgroundColor,
  backgroundImage,
  onColorChange,
  onImageChange,
}: BackgroundControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImageChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4" data-testid="background-controls">
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Background Color
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.value}
              className="w-full aspect-square rounded-md border-2 transition-all hover:scale-105"
              style={{
                backgroundColor: color.value,
                borderColor: backgroundColor === color.value ? "hsl(var(--primary))" : "transparent",
              }}
              onClick={() => {
                onColorChange(color.value);
                onImageChange(undefined);
              }}
              title={color.label}
              data-testid={`button-preset-color-${color.label.toLowerCase().replace(" ", "-")}`}
            />
          ))}
        </div>
        <Input
          type="color"
          value={backgroundColor.startsWith("#") ? backgroundColor : "#1a1a2e"}
          onChange={(e) => {
            onColorChange(e.target.value);
            onImageChange(undefined);
          }}
          className="h-10 cursor-pointer"
          data-testid="input-background-color"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Gradient Presets</Label>
        <div className="grid grid-cols-4 gap-2">
          {GRADIENT_PRESETS.map((gradient, index) => (
            <button
              key={index}
              className="w-full aspect-square rounded-md border-2 transition-all hover:scale-105"
              style={{
                background: gradient.value,
                borderColor: backgroundColor === gradient.value ? "hsl(var(--primary))" : "transparent",
              }}
              onClick={() => {
                onColorChange(gradient.value);
                onImageChange(undefined);
              }}
              title={gradient.label}
              data-testid={`button-gradient-${index}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Background Image
        </Label>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          data-testid="input-background-image-file"
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-image"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          {backgroundImage && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onImageChange(undefined)}
              data-testid="button-remove-image"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {backgroundImage && (
          <div className="relative w-full aspect-video rounded-md overflow-hidden border">
            <img
              src={backgroundImage}
              alt="Background preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Or paste image URL</Label>
          <Input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={backgroundImage || ""}
            onChange={(e) => onImageChange(e.target.value || undefined)}
            data-testid="input-background-image-url"
          />
        </div>
      </div>
    </div>
  );
}
