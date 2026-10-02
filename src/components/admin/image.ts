"use client";

// Browser-side image processing: decode, crop, resize and encode as WebP with a canvas, so
// the server never needs an image library and uploads stay small.

export type Crop = { x: number; y: number; w: number; h: number };

export async function loadImage(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (PNG, JPG or WebP)");
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("That image could not be read");
  }
  return img;
}

/** Largest crop of the given aspect ratio (w/h) centred on a focal point (0–1 each). */
export function cropAround(width: number, height: number, aspect: number, fx = 0.5, fy = 0.5): Crop {
  let w = width;
  let h = w / aspect;
  if (h > height) {
    h = height;
    w = h * aspect;
  }
  const x = Math.min(Math.max(fx * width - w / 2, 0), width - w);
  const y = Math.min(Math.max(fy * height - h / 2, 0), height - h);
  return { x, y, w, h };
}

export async function toWebp(
  img: HTMLImageElement,
  { crop, maxWidth, quality = 0.86 }: { crop?: Crop; maxWidth: number; quality?: number },
) {
  const c = crop ?? { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  const scale = Math.min(1, maxWidth / c.w);
  const width = Math.round(c.w * scale);
  const height = Math.round(c.h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob || blob.type !== "image/webp") throw new Error("This browser can't save WebP images. Try Chrome, Edge or Firefox.");
  return { blob, width, height };
}

export const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function formWith(blob: Blob, name: string, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("file", blob, name);
  for (const [k, v] of Object.entries(extra)) form.set(k, v);
  return form;
}
