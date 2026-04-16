import { useState } from "react";
import { Scissors, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Clip {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  aspectRatio: string;
  status: string;
  thumbnailUrl?: string;
  storageUrl?: string;
}

interface Props {
  sessionId: string;
  clips: Clip[];
  currentTimeMs: number;
  durationMs: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  onCreateClip: (data: { title: string; startMs: number; endMs: number; aspectRatio: "16:9" | "9:16" | "1:1" }) => Promise<void>;
  isCreating: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  ready:      "bg-green-100 text-green-800",
  failed:     "bg-red-100 text-red-800",
};

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

export function ClipSelector({
  clips, selectionStart, selectionEnd,
  onCreateClip, isCreating,
}: Props) {
  const [title, setTitle] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");

  const handleCreate = async () => {
    if (!title.trim() || selectionStart === null || selectionEnd === null) return;
    await onCreateClip({ title: title.trim(), startMs: selectionStart, endMs: selectionEnd, aspectRatio });
    setTitle("");
  };

  return (
    <div className="flex flex-col gap-4">
      {selectionStart !== null && selectionEnd !== null && (
        <div className="rounded-lg border border-border p-3 flex flex-col gap-2 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">
            Selection: {fmt(selectionStart)} !’ {fmt(selectionEnd)} ({fmt(selectionEnd - selectionStart)})
          </p>
          <Input
            placeholder="Clip title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as any)}>
              <SelectTrigger className="text-sm h-8 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9   Landscape</SelectItem>
                <SelectItem value="9:16">9:16   Portrait / Reels</SelectItem>
                <SelectItem value="1:1">1:1   Square</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleCreate} disabled={!title.trim() || isCreating} className="gap-1.5 h-8">
              {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scissors className="w-3 h-3" />}
              Create clip
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Clips ({clips.length})</p>
        {clips.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a region on the timeline and create a clip
          </p>
        ) : clips.map(clip => (
          <Card key={clip.id} className="overflow-hidden">
            <CardContent className="p-3 flex items-start gap-3">
              {clip.thumbnailUrl ? (
                <img src={clip.thumbnailUrl} alt={clip.title} className="w-20 h-12 rounded object-cover shrink-0" />
              ) : (
                <div className="w-20 h-12 rounded bg-muted shrink-0 flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{clip.title}</p>
                <p className="text-xs text-muted-foreground font-mono">{fmt(clip.startMs)} !’ {fmt(clip.endMs)}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge className={`text-xs h-4 ${STATUS_COLORS[clip.status] || ""}`}>{clip.status}</Badge>
                  <Badge variant="outline" className="text-xs h-4">{clip.aspectRatio}</Badge>
                </div>
              </div>
              {clip.storageUrl && clip.status === "ready" && (
                <a href={clip.storageUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">Download</Button>
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}