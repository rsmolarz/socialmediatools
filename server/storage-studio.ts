import { db } from './db';
import { eq, desc, and } from 'drizzle-orm';
import {
  recordingSessions,
  recordings,
  transcripts,
  clips,
  studioJobs,
  type RecordingSession,
  type NewRecordingSession,
  type Recording,
  type NewRecording,
  type Transcript,
  type NewTranscript,
  type Clip,
  type NewClip,
  type StudioJob,
  type NewStudioJob,
} from '../shared/schema';
import { nanoid } from 'nanoid';

//  Sessions 
export async function createSession(data: Omit<NewRecordingSession, 'livekitRoom' | 'guestToken'>): Promise<RecordingSession> {
  const [session] = await db.insert(recordingSessions).values({
    ...data,
    livekitRoom: `studio-${nanoid(10)}`,
    guestToken: nanoid(24),
  }).returning();
  return session;
}

export async function getSessionById(id: string): Promise<RecordingSession | undefined> {
  const [session] = await db.select().from(recordingSessions).where(eq(recordingSessions.id, id));
  return session;
}

export async function getSessionByGuestToken(token: string): Promise<RecordingSession | undefined> {
  const [session] = await db.select().from(recordingSessions).where(eq(recordingSessions.guestToken, token));
  return session;
}

export async function getSessionsByUser(userId: string): Promise<RecordingSession[]> {
  return db.select().from(recordingSessions)
    .where(eq(recordingSessions.hostUserId, userId))
    .orderBy(desc(recordingSessions.createdAt));
}

export async function updateSessionStatus(id: string, status: RecordingSession['status'], extra?: Partial<RecordingSession>): Promise<void> {
  await db.update(recordingSessions).set({ status, ...extra, updatedAt: new Date() }).where(eq(recordingSessions.id, id));
}

//  Recordings 
export async function createRecording(data: NewRecording): Promise<Recording> {
  const [recording] = await db.insert(recordings).values(data).returning();
  return recording;
}

export async function getRecordingsBySession(sessionId: string): Promise<Recording[]> {
  return db.select().from(recordings).where(eq(recordings.sessionId, sessionId));
}

export async function updateRecording(id: string, data: Partial<Recording>): Promise<void> {
  await db.update(recordings).set({ ...data, updatedAt: new Date() }).where(eq(recordings.id, id));
}

//  Transcripts 
export async function createTranscript(data: NewTranscript): Promise<Transcript> {
  const [transcript] = await db.insert(transcripts).values(data).returning();
  return transcript;
}

export async function getTranscriptBySession(sessionId: string): Promise<Transcript | undefined> {
  const [transcript] = await db.select().from(transcripts)
    .where(eq(transcripts.sessionId, sessionId))
    .orderBy(desc(transcripts.createdAt));
  return transcript;
}

export async function updateTranscript(id: string, data: Partial<Transcript>): Promise<void> {
  await db.update(transcripts).set({ ...data, updatedAt: new Date() }).where(eq(transcripts.id, id));
}

//  Clips 
export async function createClip(data: NewClip): Promise<Clip> {
  const [clip] = await db.insert(clips).values(data).returning();
  return clip;
}

export async function getClipsBySession(sessionId: string): Promise<Clip[]> {
  return db.select().from(clips)
    .where(eq(clips.sessionId, sessionId))
    .orderBy(desc(clips.createdAt));
}

export async function updateClip(id: string, data: Partial<Clip>): Promise<void> {
  await db.update(clips).set({ ...data, updatedAt: new Date() }).where(eq(clips.id, id));
}

export async function getUnsentClips(userId: string): Promise<Clip[]> {
  return db.select().from(clips)
    .where(and(eq(clips.createdByUserId, userId), eq(clips.sentToBuilder, false)))
    .orderBy(desc(clips.createdAt));
}

//  Jobs 
export async function createStudioJob(data: NewStudioJob): Promise<StudioJob> {
  const [job] = await db.insert(studioJobs).values(data).returning();
  return job;
}

export async function updateJobProgress(id: string, progress: number, status?: string): Promise<void> {
  await db.update(studioJobs).set({
    progress,
    ...(status ? { status } : {}),
    updatedAt: new Date(),
  }).where(eq(studioJobs.id, id));
}

export async function failJob(id: string, error: string): Promise<void> {
  await db.update(studioJobs).set({ status: 'failed', error, updatedAt: new Date() }).where(eq(studioJobs.id, id));
}
