import { clipQueue } from "./index";
import { getPresignedDownloadUrl, uploadBuffer, buildStorageKey } from "../services/upload";
import { trimVideo, resizeForAspectRatio, extractThumbnail, getTempPath } from "../services/ffmpeg";
import { updateClip, updateJobProgress, failJob } from "../storage-studio";
import { readFile, writeFile, unlink } from "fs/promises";

clipQueue.process(async (job) => {
  const { clipId, storageKey, startMs, endMs, aspectRatio = "16:9", sessionId, jobId } = job.data;
  try {
    await updateJobProgress(jobId, 5, "active");
    const buf = Buffer.from(await (await fetch(await getPresignedDownloadUrl(storageKey, 3600))).arrayBuffer());
    const srcPath = getTempPath("mp4");
    await writeFile(srcPath, buf);
    await updateJobProgress(jobId, 20, "active");
    const trimmedPath = getTempPath("mp4");
    await trimVideo(srcPath, trimmedPath, startMs / 1000, endMs / 1000);
    await updateJobProgress(jobId, 50, "active");
    const resizedPath = getTempPath("mp4");
    await resizeForAspectRatio(trimmedPath, resizedPath, aspectRatio);
    await updateJobProgress(jobId, 70, "active");
    const thumbPath = getTempPath("jpg");
    await extractThumbnail(resizedPath, thumbPath, 1);
    const clipKey = buildStorageKey(sessionId, clipId, "clip", "mp4");
    const thumbKey = buildStorageKey(sessionId, clipId, "thumb", "jpg");
    const [clipBuf, thumbBuf] = await Promise.all([readFile(resizedPath), readFile(thumbPath)]);
    const [clipUrl, thumbUrl] = await Promise.all([
      uploadBuffer(clipKey, clipBuf, "video/mp4"),
      uploadBuffer(thumbKey, thumbBuf, "image/jpeg"),
    ]);
    await updateClip(clipId, {
      storageKey: clipKey, storageUrl: clipUrl, thumbnailUrl: thumbUrl,
      fileSizeBytes: clipBuf.length, durationMs: endMs - startMs, status: "ready",
    });
    await Promise.all([srcPath, trimmedPath, resizedPath, thumbPath].map((p: string) => unlink(p).catch(() => {})));
    await updateJobProgress(jobId, 100, "completed");
    return { success: true, clipUrl, thumbnailUrl: thumbUrl };
  } catch (e: any) {
    await failJob(jobId, e.message);
    await updateClip(clipId, { status: "failed" });
    throw e;
  }
});