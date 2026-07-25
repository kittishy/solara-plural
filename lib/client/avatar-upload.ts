// Client-side avatar encoding (docs/SYSTEM_DESIGN.md §5).
//
// Avatars are stored IN the database as data URLs. At current real-world
// usage (2 active systems, ~weekly), the 500MB Supabase free-tier ceiling is
// nowhere near a constraint even at higher quality — a few hundred avatars at
// this size is still a rounding error. 512px/~350KB is chosen deliberately
// for photo quality over storage thrift; revisit only if usage grows enough
// to make the budget math in SYSTEM_DESIGN.md §5 actually bite.
const AVATAR_DATA_URL_DIMENSION = 512;
const AVATAR_DATA_URL_TARGET_BYTES = 350 * 1024;
const AVATAR_MIME_TYPE = 'image/webp';

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

function fitWithinSize(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToAvatarDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL(AVATAR_MIME_TYPE, quality);
  if (webp.startsWith(`data:${AVATAR_MIME_TYPE}`)) return webp;
  return canvas.toDataURL('image/jpeg', quality);
}

export async function prepareAvatarDataUrl(file: File): Promise<string> {
  const img = await loadImage(file);
  const size = fitWithinSize(img.naturalWidth || img.width, img.naturalHeight || img.height, AVATAR_DATA_URL_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]) {
    const dataUrl = canvasToAvatarDataUrl(canvas, quality);
    if (dataUrl.length <= AVATAR_DATA_URL_TARGET_BYTES * 1.4) {
      return dataUrl;
    }
  }

  return canvasToAvatarDataUrl(canvas, 0.45);
}
