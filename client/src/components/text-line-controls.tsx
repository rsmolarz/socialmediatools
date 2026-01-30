import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";
import type { TextLine } from "@shared/schema";

interface TextLineControlsProps {
  lines: TextLine[];
  layout: "centered" | "left-aligned" | "stacked";
  accentColor: "orange" | "blue" | "purple";
  onLinesChange: (lines: TextLine[]) => void;
  onLayoutChange: (layout: "centered" | "left-aligned" | "stacked") => void;
  onAccentColorChange: (color: "orange" | "blue" | "purple") => void;
}

const ACCENT_COLORS = {
  orange: { bg: "bg-orange-500", name: "Orange" },
  blue: { bg: "bg-cyan-400", name: "Blue" },
  purple: { bg: "bg-purple-600", name: "Purple" },
};

export function TextLineControls({
  lines,
  layout,
  accentColor,
  onLinesChange,
  onLayoutChange,
  onAccentColorChange,
}: TextLineControlsProps) {
  const updateLine = (id: string, updates: Partial<TextLine>) => {
    onLinesChange(
      lines.map((line) => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  const toggleHighlight = (id: string) => {
    const line = lines.find((l) => l.id === id);
    if (line) {
      updateLine(id, { highlight: !line.highlight });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Text Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lines.map((line, index) => (
            <div key={line.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Line {index + 1}
                </Label>
                <Button
                  variant={line.highlight ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleHighlight(line.id)}
                  className={line.highlight ? `${ACCENT_COLORS[accentColor].bg} text-white border-0` : ""}
                  data-testid={`button-highlight-${index + 1}`}
                >
                  Highlight
                </Button>
              </div>
              <Input
                value={line.text}
                onChange={(e) => updateLine(line.id, { text: e.target.value })}
                placeholder={`Enter line ${index + 1} text...`}
                className="bg-card"
                data-testid={`input-line-${index + 1}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Style Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Layout</Label>
              <Select value={layout} onValueChange={(v) => onLayoutChange(v as typeof layout)}>
                <SelectTrigger data-testid="select-layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centered">Centered Text</SelectItem>
                  <SelectItem value="left-aligned">Left Aligned</SelectItem>
                  <SelectItem value="stacked">Stacked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Accent Color</Label>
              <div className="flex gap-2">
                {(Object.keys(ACCENT_COLORS) as Array<keyof typeof ACCENT_COLORS>).map((color) => (
                  <button
                    key={color}
                    onClick={() => onAccentColorChange(color)}
                    className={`w-10 h-10 rounded-md ${ACCENT_COLORS[color].bg} transition-all ${
                      accentColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""
                    }`}
                    title={ACCENT_COLORS[color].name}
                    data-testid={`button-accent-${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
