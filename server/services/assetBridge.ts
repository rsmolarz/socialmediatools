import { updateClip, getClipsBySession } from "../storage-studio";
import type { Clip } from "../../shared/schema";

export interface BridgedAsset {
  clipId: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationMs: number;
  aspectRatio: string;
  captions: Array<{ text: string; start: number; end: number }>;
  metadata: Record<string, unknown>;
}

export async function pushClipToBuilder(clip: Clip): Promise<string> {
  if (clip.status !== "ready") throw new Error(`Clip ${clip.id} is not ready (status: ${clip.status})`);
  if (!clip.storageUrl) throw new Error(`Clip ${clip.id} has no storage URL`);
  await updateClip(clip.id, { sentToBuilder: true, builderAssetId: clip.id } as any);
  return clip.id;
}

export async function getReadyClipsForSession(sessionId: string): Promise<Clip[]> {
  const clips = await getClipsBySession(sessionId);
  return clips.filter((c: any) => c.status === "ready" && !c.sentToBuilder);
}
