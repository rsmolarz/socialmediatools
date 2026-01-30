import { Pool } from "pg";
import { randomUUID } from "crypto";

let poolInstance: Pool | null = null;

function getDbPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return poolInstance;
}

export interface OptimizationRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  originalDescription: string | null;
  optimizedDescription: string | null;
  originalTags: string[];
  optimizedTags: string[];
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage: string | null;
}

interface Logger {
  info: (message: string, args?: Record<string, any>) => void;
  warn: (message: string, args?: Record<string, any>) => void;
  error: (message: string, args?: Record<string, any>) => void;
}

export async function createOptimizationRecord(
  params: {
    videoId: string;
    videoTitle: string;
    originalDescription: string | null;
    originalTags: string[];
  },
  logger?: Logger
): Promise<string> {
  const pool = getDbPool();
  const id = randomUUID();
  
  logger?.info(`📊 [DB] Creating optimization record`, { videoId: params.videoId, recordId: id });
  
  try {
    await pool.query(
      `INSERT INTO optimization_records 
        (id, video_id, video_title, original_description, original_tags, status) 
       VALUES ($1, $2, $3, $4, $5, 'processing')`,
      [id, params.videoId, params.videoTitle, params.originalDescription, params.originalTags]
    );
    logger?.info(`✅ [DB] Created optimization record: ${id}`);
    return id;
  } catch (error) {
    logger?.error(`❌ [DB] Failed to create optimization record`, { error, videoId: params.videoId });
    throw error;
  }
}

export async function updateOptimizationRecord(
  id: string,
  updates: {
    optimizedDescription?: string;
    optimizedTags?: string[];
    status?: "pending" | "processing" | "completed" | "failed";
    errorMessage?: string;
  },
  logger?: Logger
): Promise<void> {
  const pool = getDbPool();
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.optimizedDescription !== undefined) {
    setClauses.push(`optimized_description = $${paramIndex++}`);
    values.push(updates.optimizedDescription);
  }
  if (updates.optimizedTags !== undefined) {
    setClauses.push(`optimized_tags = $${paramIndex++}`);
    values.push(updates.optimizedTags);
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.errorMessage !== undefined) {
    setClauses.push(`error_message = $${paramIndex++}`);
    values.push(updates.errorMessage);
  }
  
  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  logger?.info(`📊 [DB] Updating optimization record: ${id}`, { status: updates.status });

  try {
    await pool.query(
      `UPDATE optimization_records SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
    logger?.info(`✅ [DB] Updated optimization record: ${id}`);
  } catch (error) {
    logger?.error(`❌ [DB] Failed to update optimization record`, { error, recordId: id });
    throw error;
  }
}

export async function getRecentOptimizations(limit: number = 50, logger?: Logger): Promise<OptimizationRecord[]> {
  const pool = getDbPool();
  logger?.info(`📊 [DB] Fetching recent optimizations`, { limit });
  try {
    const result = await pool.query(
      `SELECT * FROM optimization_records ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    logger?.info(`✅ [DB] Fetched ${result.rows.length} records`);
    return result.rows;
  } catch (error) {
    logger?.error(`❌ [DB] Failed to get recent optimizations`, { error });
    return [];
  }
}
