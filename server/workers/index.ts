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

let transcriptionQueue: Bull.Queue | null = null;
let compositionQueue: Bull.Queue | null = null;
let clipQueue: Bull.Queue | null = null;
let aiEditQueue: Bull.Queue | null = null;
let exportQueue: Bull.Queue | null = null;

try {
  transcriptionQueue = new Bull("studio:transcription", queueOptions);
  compositionQueue = new Bull("studio:composition", queueOptions);
  clipQueue = new Bull("studio:clips", queueOptions);
  aiEditQueue = new Bull("studio:ai-edit", queueOptions);
  exportQueue = new Bull("studio:export", queueOptions);

  import("./transcription").catch(() => {});
  import("./compositor").catch(() => {});
  import("./clipGenerator").catch(() => {});
  import("./aiEditor").catch(() => {});
  import("./exporter").catch(() => {});

  console.log("[workers] Queue workers initialized");
} catch (e: any) {
  console.warn("[workers] Skipped queue init (Redis unavailable):", e.message);
}

export { transcriptionQueue, compositionQueue, clipQueue, aiEditQueue, exportQueue };

export function getQueueForJobType(jobType: string): Bull.Queue {
  const queues: Record<string, Bull.Queue | null> = {
    transcription: transcriptionQueue,
    composition: compositionQueue,
    clip_generation: clipQueue,
    ai_edit: aiEditQueue,
    export: exportQueue,
  };
  const q = queues[jobType];
  if (!q) throw new Error(`Queue not available for job type: ${jobType}`);
  return q;
}