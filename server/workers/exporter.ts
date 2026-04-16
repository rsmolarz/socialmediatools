import { exportQueue } from "./index";
import { getPresignedDownloadUrl, uploadBuffer, buildStorageKey } from "../services/upload";
import { resizeForAspectRatio, getTempPath } from "../services/ffmpeg";
import { updateClip, updateJobProgress, failJob } from "../storage-studio";
import { readFile, writeFile, unlink } from "fs/promises";

exportQueue.process(async (job) => {
  const { clipId, storageKey, aspectRatio, sessionId, jobId } = job.data;
  try {
    await updateJobProgress(jobId, 10, "active");
    const buf = Buffer.from(await (await fetch(await getPresignedDownloadUrl(storageKey, 3600))).arrayBuffer());
    const srcPath = getTempPath("mp4");
    await writeFile(srcPath, buf);
    await updateJobProgress(jobId, 40, "active");
    const outPath = getTempPath("mp4");
    await resizeForAspectRatio(srcPath, outPath, aspectRatio || "16:9");
    await updateJobProgress(jobId, 80, "active");
    const outBuf = await readFile(outPath);
    const key = buildStorageKey(sessionId, clipId, `export-${aspectRatio}`, "mp4");
    const exportUrl = await uploadBuffer(key, outBuf, "video/mp4");
    await updateClip(clipId, { storageUrl: exportUrl, status: "ready" });
    await Promise.all([srcPath, outPath].map((p: string) => unlink(p).catch(() => {})));
    await updateJobProgress(jobId, 100, "completed");
    return { success: true, exportUrl };
  } catch (e: any) {
    await failJob(jobId, e.message);
    throw e;
  }
});