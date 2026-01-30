import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { TextOverlay } from "@shared/schema";

interface TextControlsProps {
  overlay: TextOverlay;
  onUpdate: (updates: Partial<TextOverlay>) => void;
  onDelete: () => void;
}

const FONT_FAMILIES = [
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Roboto", label: "Roboto" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Architects Daughter", label: "Architects Daughter" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Outfit", label: "Outfit" },
];

const FONT_WEIGHTS = [
  { value: "normal", label: "Normal" },
  { value: "600", label: "Semi Bold" },
  { value: "bold", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

export function TextControls({ overlay, onUpdate, onDelete }: TextControlsProps) {
  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border" data-testid="text-controls">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">Text Content</Label>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive"
          data-testid="button-delete-text"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Input
        value={overlay.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Enter text..."
        data-testid="input-text-content"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Font</Label>
          <Select
            value={overlay.fontFamily}
            onValueChange={(value) => onUpdate({ fontFamily: value })}
          >
            <SelectTrigger data-testid="select-font-family">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Weight</Label>
          <Select
            value={overlay.fontWeight}
            onValueChange={(value) => onUpdate({ fontWeight: value as TextOverlay["fontWeight"] })}
          >
            <SelectTrigger data-testid="select-font-weight">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHTS.map((weight) => (
                <SelectItem key={weight.value} value={weight.value}>
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Font Size</Label>
          <span className="text-xs text-muted-foreground">{overlay.fontSize}px</span>
        </div>
        <Slider
          value={[overlay.fontSize]}
          onValueChange={([value]) => onUpdate({ fontSize: value })}
          min={12}
          max={200}
          step={1}
          data-testid="slider-font-size"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Text Color</Label>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md border cursor-pointer"
            style={{ backgroundColor: overlay.color }}
          />
          <Input
            type="color"
            value={overlay.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-full h-8"
            data-testid="input-text-color"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Alignment</Label>
        <div className="flex gap-1">
          <Button
            variant={overlay.textAlign === "left" ? "default" : "secondary"}
            size="icon"
            onClick={() => onUpdate({ textAlign: "left" })}
            data-testid="button-align-left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={overlay.textAlign === "center" ? "default" : "secondary"}
            size="icon"
            onClick={() => onUpdate({ textAlign: "center" })}
            data-testid="button-align-center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={overlay.textAlign === "right" ? "default" : "secondary"}
            size="icon"
            onClick={() => onUpdate({ textAlign: "right" })}
            data-testid="button-align-right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Text Shadow</Label>
        <Switch
          checked={overlay.shadow || false}
          onCheckedChange={(checked) => onUpdate({ shadow: checked })}
          data-testid="switch-text-shadow"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Text Outline</Label>
        <Switch
          checked={overlay.outline || false}
          onCheckedChange={(checked) => onUpdate({ outline: checked })}
          data-testid="switch-text-outline"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">X Position</Label>
          <Input
            type="number"
            value={Math.round(overlay.x)}
            onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
            data-testid="input-position-x"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Y Position</Label>
          <Input
            type="number"
            value={Math.round(overlay.y)}
            onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
            data-testid="input-position-y"
          />
        </div>
      </div>
    </div>
  );
}
