import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Target } from "lucide-react";
import type { TextLine } from "@shared/schema";

const QUICK_HEADLINES = [
  { line1: "the future of", line2: "physician", line3: "wealth" },
  { line1: "how doctors", line2: "build", line3: "wealth" },
  { line1: "real estate", line2: "for", line3: "doctors" },
  { line1: "passive income", line2: "secrets", line3: "revealed" },
  { line1: "retire early", line2: "as a", line3: "doctor" },
  { line1: "financial", line2: "freedom", line3: "guide" },
  { line1: "tax strategies", line2: "for", line3: "physicians" },
  { line1: "investing", line2: "like a", line3: "pro" },
];

type LayoutType = "centered" | "twoFace" | "soloLeft" | "soloRight" | "left-aligned" | "stacked";

interface TextLineControlsProps {
  lines: TextLine[];
  layout: LayoutType;
  accentColor: "orange" | "blue" | "purple";
  onLinesChange: (lines: TextLine[]) => void;
  onLayoutChange: (layout: LayoutType) => void;
  onAccentColorChange: (color: "orange" | "blue" | "purple") => void;
}

const normalizeLayout = (layout: LayoutType): "centered" | "twoFace" | "soloLeft" | "soloRight" => {
  if (layout === "left-aligned") return "soloLeft";
  if (layout === "stacked") return "centered";
  return layout as "centered" | "twoFace" | "soloLeft" | "soloRight";
};

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

  const applyQuickHeadline = (headline: typeof QUICK_HEADLINES[0]) => {
    const newLines = lines.map((line, index) => {
      if (index === 0) return { ...line, text: headline.line1 };
      if (index === 1) return { ...line, text: headline.line2 };
      if (index === 2) return { ...line, text: headline.line3 };
      return line;
    });
    onLinesChange(newLines);
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
                  <SelectItem value="twoFace">Two Faces (Guest)</SelectItem>
                  <SelectItem value="soloLeft">Solo Left</SelectItem>
                  <SelectItem value="soloRight">Solo Right</SelectItem>
                </SelectContent>
                {/* Note: legacy "left-aligned" and "stacked" values are auto-normalized */}
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quick Headlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_HEADLINES.map((headline, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs text-left justify-start h-auto py-2 px-3"
                onClick={() => applyQuickHeadline(headline)}
                data-testid={`button-headline-${index}`}
              >
                <span className="truncate">{headline.line1} {headline.line2}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
