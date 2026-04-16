import { useState, useCallback } from "react";

export interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface Paragraph {
  speaker?: string;
  start: number;
  end: number;
  text: string;
}

export function useTranscript(paragraphs: Paragraph[], words: Word[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  const speakers = Array.from(new Set(paragraphs.map(p => p.speaker).filter(Boolean))) as string[];

  const filteredParagraphs = paragraphs.filter(p => {
    const matchesSearch = !searchQuery || p.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpeaker = !activeSpeaker || p.speaker === activeSpeaker;
    return matchesSearch && matchesSpeaker;
  });

  const getWordAtTime = useCallback((timeSeconds: number): Word | undefined => {
    return words.find(w => w.start <= timeSeconds && w.end >= timeSeconds);
  }, [words]);

  const getActiveParagraph = useCallback((timeSeconds: number): Paragraph | undefined => {
    return paragraphs.find(p => p.start <= timeSeconds && p.end >= timeSeconds);
  }, [paragraphs]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return {
    searchQuery, setSearchQuery,
    activeSpeaker, setActiveSpeaker,
    speakers, filteredParagraphs,
    getWordAtTime, getActiveParagraph, formatTime,
  };
}