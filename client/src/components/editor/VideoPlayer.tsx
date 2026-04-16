import { useRef, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  src?: string;
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  onTimeUpdate: (ms: number) => void;
  onDurationChange: (ms: number) => void;
  onPlayPause: (playing: boolean) => void;
}

export function VideoPlayer({
  src, currentTimeMs, durationMs, isPlaying,
  onTimeUpdate, onDurationChange, onPlayPause,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => onTimeUpdate(v.currentTime * 1000);
    const onDur = () => onDurationChange(v.duration * 1000);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("loadedmetadata", onDur); };
  }, [onTimeUpdate, onDurationChange]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.play().catch(() => {});
    else v.pause();
  }, [isPlaying]);

  const seek = useCallback((val: number[]) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val[0] / 1000;
    onTimeUpdate(val[0]);
  }, [onTimeUpdate]);

  const skip = useCallback((deltaMs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + deltaMs / 1000));
  }, []);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-3 bg-black rounded-xl overflow-hidden">
      {src ? (
        <video ref={videoRef} src={src} className="w-full aspect-video bg-black" />
      ) : (
        <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center text-zinc-500 text-sm">
          No video available yet
        </div>
      )}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <Slider
          min={0} max={durationMs || 1} step={100}
          value={[currentTimeMs]}
          onValueChange={seek}
          className="w-full"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-mono">{fmt(currentTimeMs)}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white h-8 w-8" onClick={() => skip(-10000)}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white h-9 w-9" onClick={() => onPlayPause(!isPlaying)}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-white h-8 w-8" onClick={() => skip(10000)}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
          <span className="text-xs text-zinc-400 font-mono">{fmt(durationMs)}</span>
        </div>
      </div>
    </div>
  );
}