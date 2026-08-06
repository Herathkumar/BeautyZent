"use client";

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read photo"));
    };
    img.src = url;
  });
}

/**
 * Downscale a picked/captured photo to a JPEG data URL small enough to POST as
 * base64. Look-book shots keep more detail than avatars, so the default is
 * larger than the 480px used for selfies.
 */
export async function fileToJpegDataUrl(
  file: File,
  maxSize = 1024,
  quality = 0.82
): Promise<string> {
  let width = 0;
  let height = 0;
  let source: CanvasImageSource;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } catch {
      const img = await loadImageElement(file);
      width = img.naturalWidth;
      height = img.naturalHeight;
      source = img;
    }
  } else {
    const img = await loadImageElement(file);
    width = img.naturalWidth;
    height = img.naturalHeight;
    source = img;
  }

  if (!width || !height) throw new Error("Could not process photo");
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process photo");
  ctx.drawImage(source, 0, 0, w, h);
  if ("close" in source && typeof source.close === "function") source.close();
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Shrink until the encoded payload fits the server limit — phones produce very
 * different file sizes for the same pixel dimensions.
 */
export async function fileToBoundedJpegDataUrl(
  file: File,
  maxBytes: number
): Promise<string> {
  const attempts: Array<[number, number]> = [
    [1024, 0.82],
    [820, 0.75],
    [640, 0.7],
    [480, 0.6],
  ];
  let last = "";
  for (const [maxSize, quality] of attempts) {
    last = await fileToJpegDataUrl(file, maxSize, quality);
    const payloadBytes = Math.floor(
      (last.length - (last.indexOf(",") + 1)) * 0.75
    );
    if (payloadBytes <= maxBytes) return last;
  }
  return last;
}
