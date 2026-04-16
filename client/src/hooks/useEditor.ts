import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface EditPoint {
  type: "cut" | "keep";
  startMs: number;
  endMs: number;
}

export function useEditor(sessionId: string) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editPoints, setEditPoints] = useState<EditPoint[]>([]);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const qc = useQueryClient();

  const markSelection = useCallback((startMs: number, endMs: number) => {
    setSelectionStart(startMs);
    setSelectionEnd(endMs);
  }, []);

  const addCut = useCallback(() => {
    if (selectionStart === null || selectionEnd === null) return;
    setEditPoints(prev => [
      ...prev,
      { type: "cut", startMs: selectionStart, endMs: selectionEnd },
    ]);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [selectionStart, selectionEnd]);

  const clearEdits = useCallback(() => setEditPoints([]), []);

  const createClip = useMutation({
    mutationFn: async (data: {
      title: string;
      startMs: number;
      endMs: number;
      aspectRatio: "16:9" | "9:16" | "1:1";
    }) => {
      const res = await fetch(`/api/studio/sessions/${sessionId}/clips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-clips", sessionId] });
    },
  });

  return {
    currentTimeMs, setCurrentTimeMs,
    durationMs, setDurationMs,
    isPlaying, setIsPlaying,
    editPoints, selectionStart, selectionEnd,
    markSelection, addCut, clearEdits,
    createClip,
  };
}