import { useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoPlayer } from "@/components/editor/VideoPlayer";
import { TranscriptEditor } from "@/components/editor/TranscriptEditor";
import { Timeline } from "@/components/editor/Timeline";
import { ClipSelector } from "@/components/editor/ClipSelector";
import { ExportPanel } from "@/components/editor/ExportPanel";
import { useSession, useSessionTranscript, useSessionClips } from "@/hooks/useStudio";
import { useEditor } from "@/hooks/useEditor";
import { useTranscript } from "@/hooks/useTranscript";
import { useToast } from "@/hooks/use-toast";
import { SendToBuilder } from "@/components/studio/SendToBuilder";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { toast } = useToast();

  const { data: session } = useSession(sessionId);
  const { data: transcript } = useSessionTranscript(sessionId);
  const { data: clips = [] } = useSessionClips(sessionId);

  const editor = useEditor(sessionId);
  const tx = useTranscript(
    transcript?.paragraphs || [],
    transcript?.words || [],
  );

  const videoUrl = undefined;

  const handleCreateClip = async (data: any) => {
    try {
      await editor.createClip.mutateAsync(data);
      toast({ title: "Clip created", description: "Processing will begin shortly." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSendToBuilder = () => {}; // handled by SendToBuilder component

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <a href="/studio" className="text-sm text-muted-foreground hover:text-foreground">!� Studio</a>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-sm font-medium truncate">{session?.title || "Loading..."}</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col gap-4 p-4 w-[55%] shrink-0 overflow-y-auto border-r border-border">
          <VideoPlayer
            src={videoUrl}
            currentTimeMs={editor.currentTimeMs}
            durationMs={editor.durationMs}
            isPlaying={editor.isPlaying}
            onTimeUpdate={editor.setCurrentTimeMs}
            onDurationChange={editor.setDurationMs}
            onPlayPause={editor.setIsPlaying}
          />
          <Timeline
            durationMs={editor.durationMs}
            currentTimeMs={editor.currentTimeMs}
            selectionStart={editor.selectionStart}
            selectionEnd={editor.selectionEnd}
            editPoints={editor.editPoints}
            onSeek={(ms) => editor.setCurrentTimeMs(ms)}
            onSelectionChange={editor.markSelection}
            onAddCut={editor.addCut}
          />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="transcript" className="flex flex-col h-full">
            <TabsList className="mx-4 mt-3 shrink-0">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="clips">Clips</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="publish">Publish</TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="flex-1 overflow-hidden mt-0">
              <TranscriptEditor
                paragraphs={transcript?.paragraphs || []}
                filteredParagraphs={tx.filteredParagraphs}
                currentTimeSeconds={editor.currentTimeMs / 1000}
                searchQuery={tx.searchQuery}
                onSearchChange={tx.setSearchQuery}
                speakers={tx.speakers}
                activeSpeaker={tx.activeSpeaker}
                onSpeakerFilter={tx.setActiveSpeaker}
                onSeek={(s) => editor.setCurrentTimeMs(s * 1000)}
                formatTime={tx.formatTime}
              />
            </TabsContent>

            <TabsContent value="clips" className="flex-1 overflow-y-auto px-4 py-3">
              <ClipSelector
                sessionId={sessionId}
                clips={clips}
                currentTimeMs={editor.currentTimeMs}
                durationMs={editor.durationMs}
                selectionStart={editor.selectionStart}
                selectionEnd={editor.selectionEnd}
                onCreateClip={handleCreateClip}
                isCreating={editor.createClip.isPending}
              />
            </TabsContent>

            <TabsContent value="publish" className="flex-1 overflow-y-auto px-4 py-3">
              <SendToBuilder
                sessionId={sessionId}
                clips={clips}
                onRefresh={() => {}}
              />
            </TabsContent>

            <TabsContent value="export" className="flex-1 overflow-y-auto px-4 py-3">
              <ExportPanel
                transcript={transcript}
                sessionId={sessionId}
                onSendToBuilder={handleSendToBuilder}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}