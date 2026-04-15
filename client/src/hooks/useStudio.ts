import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api/studio${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useStudioSessions() {
  return useQuery({
    queryKey: ["studio-sessions"],
    queryFn: () => apiFetch("/sessions"),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      apiFetch("/sessions", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["studio-sessions"] }),
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ["studio-session", id],
    queryFn: () => apiFetch(`/sessions/${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useSessionRecordings(sessionId: string) {
  return useQuery({
    queryKey: ["studio-recordings", sessionId],
    queryFn: () => apiFetch(`/sessions/${sessionId}/recordings`),
    enabled: !!sessionId,
  });
}

export function useSessionTranscript(sessionId: string) {
  return useQuery({
    queryKey: ["studio-transcript", sessionId],
    queryFn: () => apiFetch(`/sessions/${sessionId}/transcript`),
    enabled: !!sessionId,
    retry: false,
  });
}

export function useSessionClips(sessionId: string) {
  return useQuery({
    queryKey: ["studio-clips", sessionId],
    queryFn: () => apiFetch(`/sessions/${sessionId}/clips`),
    enabled: !!sessionId,
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/sessions/${id}/end`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["studio-session", id] });
      qc.invalidateQueries({ queryKey: ["studio-sessions"] });
    },
  });
}
