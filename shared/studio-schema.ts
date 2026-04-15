import { pgTable, text, uuid, timestamp, integer, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './schema';

export const sessionStatusEnum = pgEnum('session_status', ['waiting','live','ended','processing','ready','failed']);
export const recordingStatusEnum = pgEnum('recording_status', ['uploading','uploaded','processing','ready','failed']);
export const clipStatusEnum = pgEnum('clip_status', ['pending','processing','ready','failed']);
export const jobTypeEnum = pgEnum('studio_job_type', ['transcription','composition','clip_generation','ai_edit','export']);

export const recordingSessions = pgTable('recording_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  hostUserId: text('host_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  livekitRoom: text('livekit_room').notNull().unique(),
  status: sessionStatusEnum('status').notNull().default('waiting'),
  maxGuests: integer('max_guests').notNull().default(5),
  guestToken: text('guest_token').notNull().unique(),
  recordLocally: boolean('record_locally').notNull().default(true),
  settings: jsonb('settings').default({ videoQuality: '1080p', audioOnly: false, backgroundRemoval: false }),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => recordingSessions.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull(),
  displayName: text('display_name').notNull(),
  trackType: text('track_type').notNull(),
  storageKey: text('storage_key'),
  storageUrl: text('storage_url'),
  durationMs: integer('duration_ms'),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type'),
  status: recordingStatusEnum('status').notNull().default('uploading'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transcripts = pgTable('transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => recordingSessions.id, { onDelete: 'cascade' }),
  recordingId: uuid('recording_id').references(() => recordings.id, { onDelete: 'set null' }),
  provider: text('provider').notNull().default('deepgram'),
  language: text('language').notNull().default('en'),
  fullText: text('full_text'),
  words: jsonb('words').default([]),
  paragraphs: jsonb('paragraphs').default([]),
  summary: text('summary'),
  chapters: jsonb('chapters').default([]),
  showNotes: text('show_notes'),
  keywords: jsonb('keywords').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => recordingSessions.id, { onDelete: 'cascade' }),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  storageKey: text('storage_key'),
  storageUrl: text('storage_url'),
  thumbnailUrl: text('thumbnail_url'),
  aspectRatio: text('aspect_ratio').notNull().default('16:9'),
  format: text('format').notNull().default('mp4'),
  fileSizeBytes: integer('file_size_bytes'),
  durationMs: integer('duration_ms'),
  status: clipStatusEnum('status').notNull().default('pending'),
  sentToBuilder: boolean('sent_to_builder').notNull().default(false),
  builderAssetId: text('builder_asset_id'),
  captions: jsonb('captions').default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const studioJobs = pgTable('studio_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => recordingSessions.id, { onDelete: 'cascade' }),
  recordingId: uuid('recording_id').references(() => recordings.id, { onDelete: 'cascade' }),
  clipId: uuid('clip_id').references(() => clips.id, { onDelete: 'cascade' }),
  jobType: jobTypeEnum('job_type').notNull(),
  bullJobId: text('bull_job_id'),
  status: text('status').notNull().default('queued'),
  progress: integer('progress').notNull().default(0),
  error: text('error'),
  result: jsonb('result').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const recordingSessionsRelations = relations(recordingSessions, ({ one, many }) => ({
  host: one(users, { fields: [recordingSessions.hostUserId], references: [users.id] }),
  recordings: many(recordings),
  transcripts: many(transcripts),
  clips: many(clips),
  jobs: many(studioJobs),
}));

export const recordingsRelations = relations(recordings, ({ one }) => ({
  session: one(recordingSessions, { fields: [recordings.sessionId], references: [recordingSessions.id] }),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  session: one(recordingSessions, { fields: [transcripts.sessionId], references: [recordingSessions.id] }),
  recording: one(recordings, { fields: [transcripts.recordingId], references: [recordings.id] }),
}));

export const clipsRelations = relations(clips, ({ one }) => ({
  session: one(recordingSessions, { fields: [clips.sessionId], references: [recordingSessions.id] }),
  createdBy: one(users, { fields: [clips.createdByUserId], references: [users.id] }),
}));

export const studioJobsRelations = relations(studioJobs, ({ one }) => ({
  session: one(recordingSessions, { fields: [studioJobs.sessionId], references: [recordingSessions.id] }),
  recording: one(recordings, { fields: [studioJobs.recordingId], references: [recordings.id] }),
  clip: one(clips, { fields: [studioJobs.clipId], references: [clips.id] }),
}));

export type RecordingSession = typeof recordingSessions.$inferSelect;
export type NewRecordingSession = typeof recordingSessions.$inferInsert;
export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;
export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
export type Clip = typeof clips.$inferSelect;
export type NewClip = typeof clips.$inferInsert;
export type StudioJob = typeof studioJobs.$inferSelect;
export type NewStudioJob = typeof studioJobs.$inferInsert;
