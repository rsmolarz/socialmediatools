import { useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Paragraph } from "@/hooks/useTranscript";

interface Props {
  paragraphs: Paragraph[];
  filteredParagraphs: Paragraph[];
  currentTimeSeconds: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  speakers: string[];
  activeSpeaker: string | null;
  onSpeakerFilter: (s: string | null) => void;
  onSeek: (seconds: number) => void;
  formatTime: (s: number) => string;
}

export function TranscriptEditor({
  filteredParagraphs, currentTimeSeconds,
  searchQuery, onSearchChange,
  speakers, activeSpeaker, onSpeakerFilter,
  onSeek, formatTime,
}: Props) {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentTimeSeconds]);

  const isActive = (p: Paragraph) =>
    p.start <= currentTimeSeconds && p.end >= currentTimeSeconds;

  const highlight = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-2 px-4 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8 text-sm"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        {speakers.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <Button
              variant={activeSpeaker === null ? "default" : "outline"}
              size="sm" className="h-6 text-xs px-2"
              onClick={() => onSpeakerFilter(null)}
            >All</Button>
            {speakers.map(s => (
              <Button
                key={s} size="sm" className="h-6 text-xs px-2"
                variant={activeSpeaker === s ? "default" : "outline"}
                onClick={() => onSpeakerFilter(s)}
              >{s}</Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {filteredParagraphs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No results</p>
        ) : filteredParagraphs.map((p, i) => (
          <div
            key={i}
            ref={isActive(p) ? activeRef : undefined}
            onClick={() => onSeek(p.start)}
            className={`rounded-lg p-3 cursor-pointer transition-colors group
              ${isActive(p)
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-muted/50"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {p.speaker && (
                <Badge variant="secondary" className="text-xs h-4">{p.speaker}</Badge>
              )}
              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(p.start)}
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              {highlight(p.text, searchQuery)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}