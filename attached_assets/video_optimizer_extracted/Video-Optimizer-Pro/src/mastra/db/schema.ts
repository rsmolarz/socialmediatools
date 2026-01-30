import { z } from "zod";

export const OptimizationStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const optimizationRecordSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  videoTitle: z.string(),
  originalDescription: z.string().nullable(),
  optimizedDescription: z.string().nullable(),
  originalTags: z.array(z.string()),
  optimizedTags: z.array(z.string()),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OptimizationRecord = z.infer<typeof optimizationRecordSchema>;
