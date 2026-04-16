import { transcriptionQueue } from "./index";
import { transcribeUrl } from "../services/deepgram";
import { getPresignedDownloadUrl } from "../services/upload";
import { createTranscript, updateJobProgress, failJob, updateSessionStatus } from "../storage-studio";

transcriptionQueue.process(async (job) => {
  const { sessionId, recordingId, storageKey, jobId, language = "en" } = job.data;
  try {
    await updateJobProgress(jobId, 10, "active");
    const audioUrl = await getPresignedDownloadUrl(storageKey, 600);
    await updateJobProgress(jobId, 20, "active");
    const result = await transcribeUrl(audioUrl, language);
    await updateJobProgress(jobId, 80, "active");
    await createTranscript({
      sessionId, recordingId, provider: "deepgram", language,
      fullText: result.fullText, words: result.words, paragraphs: result.paragraphs,
    });
    await updateJobProgress(jobId, 100, "completed");
    await updateSessionStatus(sessionId, "ready");
    return { success: true, wordCount: result.words.length };
  } catch (e: any) {
    await failJob(jobId, e.message);
    throw e;
  }
});

transcriptionQueue.on("failed", (job, err) => {
  console.error(`[transcription] Job ${job.id} failed:`, err.message);
});