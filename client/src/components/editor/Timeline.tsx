import { useRef, useCallback } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EditPoint } from "@/hooks/useEditor";

interface Props {
  durationMs: number;
  currentTimeMs: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  editPoints: EditPoint[];
  onSeek: (ms: number) => void;
  onSelectionChange: (start: number, end: number) => void;
  onAddCut: () => void;
}

export function Timeline({
  durationMs, currentTimeMs,
  selectionStart, selectionEnd,
  editPoints, onSeek, onSelectionChange, onAddCut,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const getMs = useCallback((e: React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(durationMs, ((e.clientX - rect.left) / rect.width) * durationMs));
  }, [durationMs]);

  const pct = (ms: number) => `${(ms / durationMs) * 100}%`;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const startMs = getMs(e);
    onSeek(startMs);
    const onMove = (ev: MouseEvent) => {
      const endMs = Math.max(0, Math.min(durationMs, startMs + ((ev.clientX - e.clientX) / (trackRef.current?.offsetWidth || 1)) * durationMs));
      if (Math.abs(endMs - startMs) > 500) onSelectionChange(Math.min(startMs, endMs), Math.max(startMs, endMs));
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [getMs, durationMs, onSeek, onSelectionChange]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Timeline</span>
        {selectionStart !== null && selectionEnd !== null && (
          <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={onAddCut}>
            <Scissors className="w-3 h-3" />
            Mark cut
          </Button>
        )}
      </div>

      <div
        ref={trackRef}
        className="relative h-12 bg-muted rounded-lg cursor-crosshair overflow-hidden select-none"
        onMouseDown={handleMouseDown}
      >
        {editPoints.filter(ep => ep.type === "cut").map((ep, i) => (
          <div key={i} className="absolute top-0 h-full bg-red-500/30 border-x border-red-500/60"
            style={{ left: pct(ep.startMs), width: pct(ep.endMs - ep.startMs) }} />
        ))}

        {selectionStart !== null && selectionEnd !== null && (
          <div className="absolute top-0 h-full bg-blue-500/20 border-x border-blue-500/60"
            style={{ left: pct(selectionStart), width: pct(selectionEnd - selectionStart) }} />
        )}

        <div className="absolute top-0 h-full w-0.5 bg-primary z-10 pointer-events-none"
          style={{ left: pct(currentTimeMs) }} />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground font-mono">
        <span>0:00</span>
        <span>{Math.floor(durationMs / 60000)}:{String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0")}</span>
      </div>
    </div>
  );
}