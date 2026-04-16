import { FileText, Mic, BookOpen, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Transcript {
  fullText?: string;
  summary?: string;
  showNotes?: string;
  chapters?: Array<{ title: string; start: number; end: number }>;
  keywords?: string[];
}

interface Props {
  transcript?: Transcript;
  sessionId: string;
  onSendToBuilder: () => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ExportPanel({ transcript, onSendToBuilder }: Props) {
  if (!transcript) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Mic className="w-8 h-8 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Transcript processing</p>
        <p className="text-xs mt-1">Check back once the session has finished processing.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {transcript.summary && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{transcript.summary}</p>
          </CardContent>
        </Card>
      )}

      {transcript.chapters && transcript.chapters.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Chapters
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-1">
            {transcript.chapters.map((ch, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-10 shrink-0">{fmt(ch.start)}</span>
                <span>{ch.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {transcript.keywords && transcript.keywords.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4" /> Keywords
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-wrap gap-1.5">
            {transcript.keywords.map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {transcript.showNotes && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Show notes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {transcript.showNotes}
            </pre>
          </CardContent>
        </Card>
      )}

      <Button className="w-full" onClick={onSendToBuilder}>
        Send to social builder
      </Button>
    </div>
  );
}