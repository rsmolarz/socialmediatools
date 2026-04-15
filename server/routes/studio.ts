import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { createHostToken, createGuestToken, endRoom, LIVEKIT_URL } from "../services/livekit";
import { buildStorageKey, getPresignedUploadUrl } from "../services/upload";
import {
  createSession, getSessionById, getSessionByGuestToken,
  getSessionsByUser, updateSessionStatus,
  createRecording, updateRecording, getRecordingsBySession,
  getTranscriptBySession, getClipsBySession,
  createStudioJob,
} from "../storage-studio";

const router = Router();

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.user && !(req as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function getUserId(req: Request): string {
  return (req.user as any)?.id || (req as any).userId;
}

// Sessions
router.post("/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      title:       z.string().min(1).max(200),
      description: z.string().optional(),
      settings:    z.object({
        videoQuality:      z.enum(["720p", "1080p", "4k"]).default("1080p"),
        audioOnly:         z.boolean().default(false),
        backgroundRemoval: z.boolean().default(false),
      }).optional(),
    });
    const data = schema.parse(req.body);
    const session = await createSession({ ...data, hostUserId: getUserId(req) });
    const token = createHostToken(session.livekitRoom, getUserId(req), (req.user as any)?.name || "Host");
    res.json({ session, token, livekitUrl: LIVEKIT_URL });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/sessions", requireAuth, async (req: Request, res: Response) => {
  const sessions = await getSessionsByUser(getUserId(req));
  res.json(sessions);
});

router.get("/sessions/:id", requireAuth, async (req: Request, res: Response) => {
  const session = await getSessionById(req.params.id);
  if (!session) return res.status(404).json({ error: "Not found" });
  res.json(session);
});

router.post("/sessions/:id/start", requireAuth, async (req: Request, res: Response) => {
  const session = await getSessionById(req.params.id);
  if (!session) return res.status(404).json({ error: "Not found" });
  if (session.hostUserId !== getUserId(req)) return res.status(403).json({ error: "Forbidden" });
  await updateSessionStatus(session.id, "live", { startedAt: new Date() });
  res.json({ ok: true });
});

router.post("/sessions/:id/end", requireAuth, async (req: Request, res: Response) => {
  const session = await getSessionById(req.params.id);
  if (!session) return res.status(404).json({ error: "Not found" });
  if (session.hostUserId !== getUserId(req)) return res.status(403).json({ error: "Forbidden" });
  await updateSessionStatus(session.id, "processing", { endedAt: new Date() });
  await endRoom(session.livekitRoom);
  res.json({ ok: true });
});

// Guest join (no auth required)
router.get("/join/:guestToken", async (req: Request, res: Response) => {
  const session = await getSessionByGuestToken(req.params.guestToken);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "ended" || session.status === "processing" || session.status === "ready") {
    return res.status(410).json({ error: "Session has ended" });
  }
  const guestId = `guest-${nanoid(8)}`;
  const displayName = (req.query.name as string) || "Guest";
  const token = createGuestToken(session.livekitRoom, guestId, displayName);
  res.json({ session: { id: session.id, title: session.title, status: session.status }, token, livekitUrl: LIVEKIT_URL });
});

// Recordings
router.post("/sessions/:id/recordings/presign", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: "Not found" });
    const { participantId, trackType, mimeType } = req.body;
    const ext = mimeType?.includes("mp4") ? "mp4" : "webm";
    const key = buildStorageKey(session.id, participantId, trackType, ext);
    const uploadUrl = await getPresignedUploadUrl(key, mimeType || "video/webm");
    const recording = await createRecording({
      sessionId: session.id,
      participantId,
      displayName: req.body.displayName || participantId,
      trackType,
      storageKey: key,
      mimeType: mimeType || "video/webm",
      status: "uploading",
    });
    res.json({ recordingId: recording.id, uploadUrl, storageKey: key });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/recordings/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await updateRecording(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/sessions/:id/recordings", requireAuth, async (req: Request, res: Response) => {
  const recordings = await getRecordingsBySession(req.params.id);
  res.json(recordings);
});

// Transcript + Clips
router.get("/sessions/:id/transcript", requireAuth, async (req: Request, res: Response) => {
  const transcript = await getTranscriptBySession(req.params.id);
  if (!transcript) return res.status(404).json({ error: "No transcript yet" });
  res.json(transcript);
});

router.get("/sessions/:id/clips", requireAuth, async (req: Request, res: Response) => {
  const clips = await getClipsBySession(req.params.id);
  res.json(clips);
});

export default router;
