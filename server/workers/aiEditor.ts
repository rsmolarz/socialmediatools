import { aiEditQueue } from "./index";
import { updateTranscript, updateJobProgress, failJob, getTranscriptBySession } from "../storage-studio";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

aiEditQueue.process(async (job) => {
  const { sessionId, jobId } = job.data;
  try {
    await updateJobProgress(jobId, 10, "active");
    const transcript = await getTranscriptBySession(sessionId);
    if (!transcript?.fullText) {
      await updateJobProgress(jobId, 100, "completed");
      return { skipped: true };
    }
    await updateJobProgress(jobId, 20, "active");
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are a podcast/video editor assistant. Analyze this transcript and return ONLY valid JSON with no markdown.\n\nTranscript: ${transcript.fullText.slice(0, 8000)}\n\nReturn this exact JSON structure:\n{\n  "summary": "2-3 sentence summary",\n  "showNotes": "formatted show notes as markdown",\n  "chapters": [{ "title": "chapter title", "start": 0, "end": 120 }],\n  "keywords": ["keyword1", "keyword2"]\n}`,
      }],
    });
    await updateJobProgress(jobId, 80, "active");
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    await updateTranscript(transcript.id, {
      summary: parsed.summary || null,
      showNotes: parsed.showNotes || null,
      chapters: parsed.chapters || [],
      keywords: parsed.keywords || [],
    });
    await updateJobProgress(jobId, 100, "completed");
    return { success: true };
  } catch (e: any) {
    await failJob(jobId, e.message);
    throw e;
  }
});