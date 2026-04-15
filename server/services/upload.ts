import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT as string,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY as string,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY as string,
  },
});

const BUCKET  = process.env.CLOUDFLARE_R2_BUCKET as string;
const CDN_URL = process.env.CLOUDFLARE_R2_CDN_URL || "";

export function buildStorageKey(sessionId: string, participantId: string, trackType: string, ext = "webm"): string {
  return `recordings/${sessionId}/${participantId}/${trackType}-${randomUUID()}.${ext}`;
}

export async function uploadBuffer(key: string, buffer: Buffer, mimeType: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  return CDN_URL ? `${CDN_URL}/${key}` : key;
}

export async function getPresignedUploadUrl(key: string, mimeType: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

export function getPublicUrl(key: string): string {
  return CDN_URL ? `${CDN_URL}/${key}` : key;
}
