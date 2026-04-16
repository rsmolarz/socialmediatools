import { useState } from "react";
import { Send, Check, Loader2, ExternalLink, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Clip {
  id: string;
  title: string;
  status: string;
  thumbnailUrl?: string;
  storageUrl?: string;
  aspectRatio: string;
  durationMs?: number;
  sentToBuilder?: boolean;
}

interface Props {
  sessionId: string;
  clips: Clip[];
  onRefresh: () => void;
}

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

export function SendToBuilder({ sessionId, clips, onRefresh }: Props) {
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const readyClips = clips.filter(c => c.status === "ready");

  const sendToBuilder = async (clipId: string) => {
    setSending(s => ({ ...s, [clipId]: true }));
    try {
      const res = await fetch(`/api/studio/sessions/${sessionId}/clips/${clipId}/send-to-builder`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Sent to builder!", description: "Your clip is now available in the social media builder." });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(s => ({ ...s, [clipId]: false }));
    }
  };

  const generateThumbnails = async (clipId: string) => {
    setGenerating(g => ({ ...g, [clipId]: true }));
    try {
      const res = await fetch(`/api/studio/sessions/${sessionId}/clips/${clipId}/thumbnails`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const { variants } = await res.json();
      toast({ title: "Thumbnails generated!", description: `Created variants for ${Object.keys(variants).join(", ")}` });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(g => ({ ...g, [clipId]: false }));
    }
  };

  if (readyClips.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Send className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No clips ready yet</p>
        <p className="text-xs mt-1">Create and process clips in the editor, then send them here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {readyClips.length} clip{readyClips.length !== 1 ? "s" : ""} ready to send
      </p>
      {readyClips.map(clip => (
        <Card key={clip.id}>
          <CardContent className="p-4 flex gap-3">
            {clip.thumbnailUrl ? (
              <img src={clip.thumbnailUrl} alt={clip.title} className="w-24 h-14 rounded-md object-cover shrink-0" />
            ) : (
              <div className="w-24 h-14 rounded-md bg-muted shrink-0 flex items-center justify-center">
                <Image className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{clip.title}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs h-5">{clip.aspectRatio}</Badge>
                {clip.durationMs && <span className="text-xs text-muted-foreground font-mono">{fmt(clip.durationMs)}</span>}
                {clip.sentToBuilder && (
                  <Badge className="text-xs h-5 bg-green-100 text-green-800">
                    <Check className="w-2.5 h-2.5 mr-1" /> In builder
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {clip.storageUrl && (
                  <a href={clip.storageUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      <ExternalLink className="w-3 h-3" /> Preview
                    </Button>
                  </a>
                )}
                {clip.thumbnailUrl ? null : (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    disabled={generating[clip.id]} onClick={() => generateThumbnails(clip.id)}>
                    {generating[clip.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
                    Generate thumbnails
                  </Button>
                )}
                <Button size="sm" className="h-7 text-xs gap-1"
                  disabled={sending[clip.id] || !!clip.sentToBuilder} onClick={() => sendToBuilder(clip.id)}>
                  {sending[clip.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : clip.sentToBuilder ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                  {clip.sentToBuilder ? "Sent" : "Send to builder"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
