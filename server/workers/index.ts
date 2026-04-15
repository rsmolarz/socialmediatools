import Bull from "bull";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const queueOptions = {
  redis: REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
};

export const transcriptionQueue  = new Bull("studio:transcription",  queueOptions);
export const compositionQueue    = new Bull("studio:composition",    queueOptions);
export const clipQueue           = new Bull("studio:clips",          queueOptions);
export const aiEditQueue         = new Bull("studio:ai-edit",        queueOptions);
export const exportQueue         = new Bull("studio:export",         queueOptions);

import "./transcription";
import "./compositor";
import "./clipGenerator";
import "./aiEditor";
import "./exporter";

export function getQueueForJobType(jobType: string): Bull.Queue {
  switch (jobType) {
    case "transcription":   return transcriptionQueue;
    case "composition":     return compositionQueue;
    case "clip_generation": return clipQueue;
    case "ai_edit":         return aiEditQueue;
    case "export":          return exportQueue;
    default: throw new Error(`Unknown job type: ${jobType}`);
  }
}