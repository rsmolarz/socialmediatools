import { compositionQueue, transcriptionQueue } from "./index";
import { getPresignedDownloadUrl, uploadBuffer, buildStorageKey } from "../services/upload";
import { compositeGrid, getTempPath } from "../services/ffmpeg";
import { getRecordingsBySession, updateJobProgress, failJob, createStudioJob } from "../storage-studio";
import { readFile, writeFile, unlink } from "fs/promises";

compositionQueue.process(async (job) => {
  const { sessionId, jobId } = job.data;
  try {
    await updateJobProgress(jobId, 5, "active");
    const recordings = await getRecordingsBySession(sessionId);
    const videoRecs = recordings.filter((r: any) => r.trackType === "video" && r.storageKey && r.status === "uploaded");
    if (videoRecs.length === 0) {
      await updateJobProgress(jobId, 100, "completed");
      return { skipped: true };
    }
    const tempPaths: string[] = [];
    for (let i = 0; i < videoRecs.length; i++) {
      const url = await getPresignedDownloadUrl(videoRecs[i].storageKey!, 3600);
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const tmp = getTempPath("webm");
      await writeFile(tmp, buf);
      tempPaths.push(tmp);
      await updateJobProgress(jobId, 10 + Math.round((i / videoRecs.length) * 30), "active");
    }
    const outputPath = getTempPath("mp4");
    await compositeGrid(tempPaths, outputPath, (pct) => job.progress(40 + Math.round(pct * 0.4)));
    await updateJobProgress(jobId, 80, "active");
    const buffer = await readFile(outputPath);
    const key = buildStorageKey(sessionId, "composite", "video", "mp4");
    await uploadBuffer(key, buffer, "video/mp4");
    await Promise.all([...tempPaths, outputPath].map((p: string) => unlink(p).catch(() => {})));
    const tjob = await createStudioJob({ sessionId, jobType: "transcription", status: "queued", progress: 0 });
    await transcriptionQueue.add({ sessionId, storageKey: key, jobId: tjob.id });
    await updateJobProgress(jobId, 100, "completed");
    return { success: true, compositeKey: key };
  } catch (e: any) {
    await failJob(jobId, e.message);
    throw e;
  }
});