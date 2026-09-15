import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/x-ms-bmp": "bmp",
  "image/tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heif",
};

const EXT_FALLBACK: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
  avif: "avif",
  bmp: "bmp",
  tif: "tiff",
  tiff: "tiff",
  heic: "heic",
  heif: "heif",
};

function resolveExt(file: File): string | null {
  const fromMime = MIME_EXT[file.type.toLowerCase()];
  if (fromMime) return fromMime;
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  if (dot >= 0) {
    const ext = name.slice(dot + 1).toLowerCase();
    if (EXT_FALLBACK[ext]) return EXT_FALLBACK[ext];
  }
  // Some browsers leave type empty for camera rolls — accept as jpeg.
  if (!file.type || file.type === "application/octet-stream") return "jpg";
  return null;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ detail: "geçersiz istek" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "dosya gerekli" }, { status: 400 });
  }
  const ext = resolveExt(file);
  if (!ext) {
    return NextResponse.json(
      { detail: "desteklenen formatlar: jpeg, png, webp, gif, avif, bmp, tiff, heic" },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ detail: "dosya en fazla 4 MB" }, { status: 413 });
  }

  const id = randomUUID();
  const dir = path.join(process.cwd(), "public", "uploads", "news", id);
  await mkdir(dir, { recursive: true });
  const filename = `1.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);

  return NextResponse.json({ url: `/uploads/news/${id}/${filename}` });
}
