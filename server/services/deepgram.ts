import { createClient } from "@deepgram/sdk";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

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

export interface DeepgramResult {
  fullText: string;
  words: TranscriptWord[];
  paragraphs: TranscriptParagraph[];
}

export async function transcribeUrl(audioUrl: string, language = "en"): Promise<DeepgramResult> {
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    {
      model: "nova-2",
      language,
      smart_format: true,
      diarize: true,
      utterances: true,
      paragraphs: true,
      punctuate: true,
      filler_words: true,
    }
  );

  if (error) throw new Error(`Deepgram error: ${error.message}`);

  const channel = result?.results?.channels?.[0]?.alternatives?.[0];
  if (!channel) throw new Error("No transcript returned from Deepgram");

  const words: TranscriptWord[] = (channel.words || []).map((w: any) => ({
    word: w.word, start: w.start, end: w.end, confidence: w.confidence,
    speaker: w.speaker !== undefined ? `Speaker ${w.speaker}` : undefined,
  }));

  const paragraphs: TranscriptParagraph[] = (channel.paragraphs?.paragraphs || []).map((p: any) => ({
    speaker: p.speaker !== undefined ? `Speaker ${p.speaker}` : undefined,
    start: p.start, end: p.end,
    text: p.sentences?.map((s: any) => s.text).join(" ") || "",
  }));

  return { fullText: channel.transcript || "", words, paragraphs };
}