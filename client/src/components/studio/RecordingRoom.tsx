import { useState, useEffect, useCallback, useRef } from "react";
import { Room, RoomEvent, Track, type RemoteParticipant } from "livekit-client";
import { ParticipantTile } from "./ParticipantTile";
import { RecordingControls } from "./RecordingControls";
import { GuestInvite } from "./GuestInvite";
import { useLocalRecorder } from "@/hooks/useLocalRecorder";
import { useEndSession } from "@/hooks/useStudio";
import { useToast } from "@/hooks/use-toast";

interface Props {
  sessionId: string;
  sessionTitle: string;
  guestToken: string;
  livekitToken: string;
  livekitUrl: string;
  isHost: boolean;
  userId: string;
  displayName: string;
}

interface ParticipantState {
  identity: string;
  name: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isCamOff: boolean;
  isSpeaking: boolean;
}

export function RecordingRoom({
  sessionId, sessionTitle, guestToken, livekitToken, livekitUrl,
  isHost, userId, displayName,
}: Props) {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map());
  const { toast } = useToast();
  const endSession = useEndSession();

  const recorder = useLocalRecorder({
    sessionId,
    participantId: userId,
    displayName,
    onUploadComplete: (id) => toast({ title: "Recording uploaded", description: `Recording ID: ${id}` }),
  });

  const updateParticipants = useCallback((room: Room) => {
    const map = new Map<string, ParticipantState>();
    room.remoteParticipants.forEach((p) => {
      const camPub = p.getTrackPublication(Track.Source.Camera);
      const micPub = p.getTrackPublication(Track.Source.Microphone);
      const stream = camPub?.track?.mediaStream || null;
      map.set(p.identity, {
        identity: p.identity,
        name: p.name || p.identity,
        stream,
        isMuted: micPub?.isMuted ?? true,
        isCamOff: !camPub?.isSubscribed,
        isSpeaking: p.isSpeaking,
      });
    });
    setParticipants(map);
  }, []);

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
      toast({ title: `${p.name || p.identity} joined` });
      updateParticipants(room);
    });
    room.on(RoomEvent.ParticipantDisconnected, (p: RemoteParticipant) => {
      toast({ title: `${p.name || p.identity} left` });
      updateParticipants(room);
    });
    room.on(RoomEvent.TrackSubscribed, () => updateParticipants(room));
    room.on(RoomEvent.TrackUnsubscribed, () => updateParticipants(room));
    room.on(RoomEvent.ActiveSpeakersChanged, () => updateParticipants(room));

    room.connect(livekitUrl, livekitToken).then(async () => {
      setConnected(true);
      await room.localParticipant.enableCameraAndMicrophone();
      const camTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (camTrack?.track?.mediaStream) setLocalStream(camTrack.track.mediaStream);
      updateParticipants(room);
    }).catch((e) => toast({ title: "Connection error", description: e.message, variant: "destructive" }));

    return () => { room.disconnect(); };
  }, [livekitUrl, livekitToken, updateParticipants, toast]);

  const toggleMic = useCallback(async () => {
    await roomRef.current?.localParticipant.setMicrophoneEnabled(!micEnabled);
    setMicEnabled((v) => !v);
  }, [micEnabled]);

  const toggleCam = useCallback(async () => {
    await roomRef.current?.localParticipant.setCameraEnabled(!camEnabled);
    setCamEnabled((v) => !v);
  }, [camEnabled]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    await recorder.start(stream);
  }, [recorder]);

  const handleEndSession = useCallback(async () => {
    recorder.stop();
    await endSession.mutateAsync(sessionId);
    roomRef.current?.disconnect();
  }, [recorder, endSession, sessionId]);

  const allParticipants = Array.from(participants.values());

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div>
          <h1 className="text-white font-semibold">{sessionTitle}</h1>
          <p className="text-xs text-white/40">
            {connected ? `${allParticipants.length + 1} participant${allParticipants.length !== 0 ? "s" : ""}` : "Connecting..."}
          </p>
        </div>
        {isHost && <GuestInvite guestToken={guestToken} />}
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className={`grid gap-3 h-full ${allParticipants.length === 0 ? "grid-cols-1" : ""} ${allParticipants.length === 1 ? "grid-cols-2" : ""} ${allParticipants.length >= 2 ? "grid-cols-2 md:grid-cols-3" : ""}`}>
          <ParticipantTile
            displayName={displayName}
            stream={localStream}
            isMuted={!micEnabled}
            isCamOff={!camEnabled}
            isLocal
          />
          {allParticipants.map((p) => (
            <ParticipantTile
              key={p.identity}
              displayName={p.name}
              stream={p.stream}
              isMuted={p.isMuted}
              isCamOff={p.isCamOff}
              isSpeaking={p.isSpeaking}
            />
          ))}
        </div>
      </div>

      <RecordingControls
        isLive={connected}
        recorderState={recorder.state}
        micEnabled={micEnabled}
        camEnabled={camEnabled}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onStartRecording={startRecording}
        onStopRecording={recorder.stop}
        onEndSession={handleEndSession}
        isHost={isHost}
        uploadProgress={recorder.progress}
      />
    </div>
  );
}
