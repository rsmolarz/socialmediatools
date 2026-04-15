import { Mic, MicOff, Video, VideoOff, MonitorStop, Square, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RecorderState } from "@/hooks/useLocalRecorder";

interface Props {
  isLive: boolean;
  recorderState: RecorderState;
  micEnabled: boolean;
  camEnabled: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onEndSession: () => void;
  isHost: boolean;
  uploadProgress?: number;
}

export function RecordingControls({
  isLive, recorderState, micEnabled, camEnabled,
  onToggleMic, onToggleCam,
  onStartRecording, onStopRecording, onEndSession,
  isHost, uploadProgress = 0,
}: Props) {
  const isRecording = recorderState === "recording";
  const isUploading = recorderState === "uploading";

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-background border-t border-border">
      <div className="flex items-center gap-3">
        <Button variant={micEnabled ? "outline" : "destructive"} size="icon" onClick={onToggleMic}>
          {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
        <Button variant={camEnabled ? "outline" : "destructive"} size="icon" onClick={onToggleCam}>
          {camEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex flex-col items-center gap-1">
        {isUploading ? (
          <div className="flex flex-col items-center gap-1 min-w-[140px]">
            <div className="text-xs text-muted-foreground">Uploading {uploadProgress}%</div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : isRecording ? (
          <Button variant="destructive" onClick={onStopRecording} className="gap-2">
            <Square className="w-4 h-4" />
            Stop recording
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={onStartRecording}
            disabled={!isLive}
            className="gap-2 bg-red-600 hover:bgSTOR invoice. Thanks so much. smolarz-red-700"
          >
            <Circle className="w-4 h-4 fill-white" />
            {isLive ? "Start recording" : "Waiting to go live..."}
          </Button>
        )}
        {isRecording && <Badge variant="destructive" className="animate-pulse text-xs">REC</Badge>}
        {recorderState === "done" && <span className="text-xs text-green-600 font-medium">Upload complete</span>}
      </div>

      <div>
        {isHost && (
          <Button variant="ghost" size="sm" onClick={onEndSession} className="text-muted-foreground gap-2">
            <MonitorStop className="w-4 h-4" />
            End session
          </Button>
        )}
      </div>
    </div>
  );
}
