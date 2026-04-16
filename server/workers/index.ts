import Bull from 'bull';
import { URL } from 'url';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse the Redis URL to build Bull-compatible connection options
// Upstash uses rediss:// (TLS) which needs special handling
function buildRedisConfig(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const isTLS = parsed.protocol === 'rediss:';
  return {
    host:     parsed.hostname,
    port:     parseInt(parsed.port || '6379'),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls:      isTLS ? { rejectUnauthorized: false } : undefined,
  };
}

const redis = buildRedisConfig(REDIS_URL);

const queueOptions: Bull.QueueOptions = {
  redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
};

export let transcriptionQueue: Bull.Queue | null = null;
export let compositionQueue:   Bull.Queue | null = null;
export let clipQueue:          Bull.Queue | null = null;
export let aiEditQueue:        Bull.Queue | null = null;
export let exportQueue:        Bull.Queue | null = null;

try {
  transcriptionQueue = new Bull('studio:transcription', queueOptions);
  compositionQueue   = new Bull('studio:composition',   queueOptions);
  clipQueue          = new Bull('studio:clips',         queueOptions);
  aiEditQueue        = new Bull('studio:ai-edit',       queueOptions);
  exportQueue        = new Bull('studio:export',        queueOptions);

  import('./transcription').catch(() => {});
  import('./compositor').catch(() => {});
  import('./clipGenerator').catch(() => {});
  import('./aiEditor').catch(() => {});
  import('./exporter').catch(() => {});

  console.log('[workers] Queue workers initialized');
} catch (e: any) {
  console.warn('[workers] Skipped queue init (Redis unavailable):', e.message);
}


export function getQueueForJobType(jobType: string): Bull.Queue {
  const queues: Record<string, Bull.Queue | null> = {
    transcription:   transcriptionQueue,
    composition:     compositionQueue,
    clip_generation: clipQueue,
    ai_edit:         aiEditQueue,
    export:          exportQueue,
  };
  const q = queues[jobType];
  return q;
}
