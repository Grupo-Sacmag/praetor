import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/** Escribe el archivo en un temporal y lo renombra al final (el cliente nunca ve un archivo a medias). */
export async function saveFileAtomic(file: File, destDir: string, destName: string) {
  await mkdir(destDir, { recursive: true });
  const finalPath = path.join(destDir, destName);
  const tmpPath = path.join(destDir, `.${destName}.${process.pid}.${Date.now()}.tmp`);
  try {
    await pipeline(
      Readable.fromWeb(file.stream() as import("node:stream/web").ReadableStream),
      createWriteStream(tmpPath),
    );
    await rename(tmpPath, finalPath);
  } catch (e) {
    await rm(tmpPath, { force: true });
    throw e;
  }
  return finalPath;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
