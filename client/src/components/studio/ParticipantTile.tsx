import { useEffect, useRef } from "react";
import { MicOff, VideoOff } from "lucide-react";

interface Props {
  displayName: string;
  stream?: MediaStream | null;
  isMuted?: boolean;
  isCamOff?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
}

export function ParticipantTile({ displayName, stream, isMuted, isCamOff, isLocal, isSpeaking }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative rounded-xl overflow-hidden bg-zinc-900 aspect-video flex items-center justify-center ${isSpeaking ? "ring-2 ring-green-400" : "ring-1 ring-white/10"}`}>
      {stream && !isCamOff ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-white/40">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-semibold text-white/60">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {isCamOff && <VideoOff className="w-4 h-4" />}
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
          {displayName}{isLocal ? " (you)" : ""}
        </span>
        {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
      </div>
    </div>
  );
}
