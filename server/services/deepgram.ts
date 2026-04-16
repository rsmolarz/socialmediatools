import OpenAI, { toFile } from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface TranscriptParagraph {
  speaker?: string;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  fullText: string;
  words: TranscriptWord[];
  paragraphs: TranscriptParagraph[];
}

export async function transcribeUrl(audioUrl: string, language = "en"): Promise<TranscriptionResult> {
  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  const file = await toFile(buffer, "audio.wav", { type: "audio/wav" });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language,
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
  });

  const words: TranscriptWord[] = ((result as any).words || []).map((w: any) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: 1,
    speaker: undefined,
  }));

  const paragraphs: TranscriptParagraph[] = ((result as any).segments || []).map((s: any) => ({
    speaker: undefined,
    start: s.start,
    end: s.end,
    text: s.text?.trim() || "",
  }));

  return { fullText: (result as any).text || "", words, paragraphs };
}

export async function transcribeFile(filePath: string, language = "en"): Promise<TranscriptionResult> {
  const fs = await import("fs");
  const file = fs.createReadStream(filePath);

  const result = await openai.audio.transcriptions.create({
    file: file as any,
    model: "whisper-1",
    language,
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
  });

  const words: TranscriptWord[] = ((result as any).words || []).map((w: any) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: 1,
    speaker: undefined,
  }));

  const paragraphs: TranscriptParagraph[] = ((result as any).segments || []).map((s: any) => ({
    speaker: undefined,
    start: s.start,
    end: s.end,
    text: s.text?.trim() || "",
  }));

  return { fullText: (result as any).text || "", words, paragraphs };
}
