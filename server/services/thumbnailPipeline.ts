import sharp from "sharp";
import { getPresignedDownloadUrl, uploadBuffer, buildStorageKey } from "./upload";
import { updateClip } from "../storage-studio";

export interface ThumbnailOptions {
  quality?: number;
}

export async function generateThumbnailVariants(
  clipId: string,
  sessionId: string,
  sourceThumbnailKey: string,
  opts: ThumbnailOptions = {}
): Promise<Record<string, string>> {
  const { quality = 85 } = opts;
  const url = await getPresignedDownloadUrl(sourceThumbnailKey, 600);
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const variants: Record<string, string> = {};

  const landscape = await sharp(buf).resize(1280, 720, { fit: "cover" }).jpeg({ quality }).toBuffer();
  variants["16:9"] = await uploadBuffer(buildStorageKey(sessionId, clipId, "thumb-16x9", "jpg"), landscape, "image/jpeg");

  const portrait = await sharp(buf).resize(1080, 1920, { fit: "cover" }).jpeg({ quality }).toBuffer();
  variants["9:16"] = await uploadBuffer(buildStorageKey(sessionId, clipId, "thumb-9x16", "jpg"), portrait, "image/jpeg");

  const square = await sharp(buf).resize(1080, 1080, { fit: "cover" }).jpeg({ quality }).toBuffer();
  variants["1:1"] = await uploadBuffer(buildStorageKey(sessionId, clipId, "thumb-1x1", "jpg"), square, "image/jpeg");

  await updateClip(clipId, { thumbnailUrl: variants["16:9"] });
  return variants;
}

export async function extractThumbnailColors(thumbnailKey: string): Promise<{ dominant: string; palette: string[] }> {
  const url = await getPresignedDownloadUrl(thumbnailKey, 300);
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const { dominant } = await sharp(buf).resize(50, 50, { fit: "cover" }).raw().toBuffer({ resolveWithObject: true })
    .then(({ data }) => {
      let r = 0, g = 0, b = 0;
      const px = data.length / 3;
      for (let i = 0; i < data.length; i += 3) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
      const h = (n: number) => Math.round(n / px).toString(16).padStart(2, "0");
      return { dominant: "#" + h(r) + h(g) + h(b) };
    });
  return { dominant, palette: [dominant] };
}
