/**
 * Client-side photo compression. Phone cameras produce very large files, so
 * every picture is scaled down and re-encoded before it reaches the cloud.
 */

export const MAX_PHOTOS = 4;

/** Scales a picture to fit `maxSide` and returns a compressed JPEG data URL. */
export async function compressImage(file: File, maxSide = 1000, quality = 0.7): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("فقط فایل تصویری قابل انتخاب است.");
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("پردازش تصویر روی این دستگاه ممکن نیست.");
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
  if ("close" in bitmap) (bitmap as ImageBitmap).close();
  return canvas.toDataURL("image/jpeg", quality);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* falls back to the <img> decoder below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
