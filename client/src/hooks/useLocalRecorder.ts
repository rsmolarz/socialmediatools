import { useRef, useState, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "stopped" | "uploading" | "done" | "error";

interface UseLocalRecorderOptions {
  sessionId: string;
  participantId: string;
  displayName: string;
  onUploadComplete?: (recordingId: string) => void;
}

export function useLocalRecorder({ sessionId, participantId, displayName, onUploadComplete }: UseLocalRecorderOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const start = useCallback(async (stream: MediaStream) => {
    try {
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setState("uploading");
        setProgress(0);
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });

          const { recordingId, uploadUrl } = await fetch(
            "/api/studio/sessions/" + sessionId + "/recordings/presign",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ participantId, displayName, trackType: "video", mimeType }),
            }
          ).then((r) => r.json());

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
            xhr.onerror = () => reject(new Error("Upload error"));
            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", mimeType);
            xhr.send(blob);
          });

          await fetch(`/api/studio/recordings/${recordingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "uploaded",
              fileSizeBytes: blob.size,
              durationMs: chunksRef.current.length * 1000,
            }),
          });

          setState("done");
          setProgress(100);
          onUploadComplete?.(recordingId);
        } catch (e: any) {
          setError(e.message);
          setState("error");
        }
      };

      recorder.start(5000);
      setState("recording");
    } catch (e: any) {
      setError(e.message);
      setState("error");
    }
  }, [sessionId, participantId, displayName, onUploadComplete]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setState("stopped");
    }
  }, []);

  return { state, error, progress, start, stop };
}
