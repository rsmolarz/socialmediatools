import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export function getTempPath(ext: string): string {
  const dir = join(tmpdir(), "studio");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${randomUUID()}.${ext}`);
}

export async function extractAudio(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath).noVideo().audioCodec("pcm_s16le")
      .audioFrequency(16000).audioChannels(1).output(outputPath)
      .on("end", () => resolve(outputPath)).on("error", reject).run();
  });
}

export async function trimVideo(inputPath: string, outputPath: string, startSec: number, endSec: number): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath).setStartTime(startSec).setDuration(endSec - startSec)
      .videoCodec("libx264").audioCodec("aac")
      .outputOptions(["-preset fast", "-crf 22", "-movflags +faststart"])
      .output(outputPath).on("end", () => resolve(outputPath)).on("error", reject).run();
  });
}

export async function compositeGrid(inputs: string[], outputPath: string, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const count = inputs.length;
    const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const W = 1920, H = 1080;
    const tileW = Math.floor(W / cols);
    const tileH = Math.floor(H / rows);
    const filterParts: string[] = inputs.map((_, i) =>
      `[${i}:v]scale=${tileW}:${tileH}:force_original_aspect_ratio=decrease,pad=${tileW}:${tileH}:(ow-iw)/2:(oh-ih)/2[v${i}]`
    );
    const positions = Array.from({ length: count }, (_, i) =>
      `${(i % cols) * tileW}_${Math.floor(i / cols) * tileH}`
    ).join("|");
    filterParts.push(`${inputs.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${count}:layout=${positions}[out]`);
    let cmd = ffmpeg();
    inputs.forEach(i => cmd.input(i));
    cmd.complexFilter(filterParts, "out").videoCodec("libx264").audioCodec("aac")
      .outputOptions(["-preset fast", "-crf 22", "-movflags +faststart"])
      .output(outputPath)
      .on("progress", (p) => onProgress?.(p.percent || 0))
      .on("end", () => resolve(outputPath)).on("error", reject).run();
  });
}

export async function resizeForAspectRatio(inputPath: string, outputPath: string, aspectRatio: "16:9" | "9:16" | "1:1"): Promise<string> {
  const dims: Record<string, string> = { "16:9": "1920:1080", "9:16": "1080:1920", "1:1": "1080:1080" };
  const [w, h] = dims[aspectRatio].split(":").map(Number);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilter(`scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`)
      .videoCodec("libx264").audioCodec("aac")
      .outputOptions(["-preset fast", "-crf 22", "-movflags +faststart"])
      .output(outputPath).on("end", () => resolve(outputPath)).on("error", reject).run();
  });
}

export async function extractThumbnail(inputPath: string, outputPath: string, atSecond = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({ timestamps: [atSecond], filename: outputPath, size: "1280x720" })
      .on("end", () => resolve(outputPath)).on("error", reject);
  });
}