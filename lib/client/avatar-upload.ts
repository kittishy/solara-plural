const RUNTIME_UPLOAD_TARGET_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const AVATAR_DATA_URL_DIMENSION = 512;
const AVATAR_DATA_URL_TARGET_BYTES = 350 * 1024;
const AVATAR_MIME_TYPE = 'image/webp';

function isGif(file: File): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}

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

function downscaleSize(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }
  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
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

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode image.'));
          return;
        }
        resolve(blob);
      },
      AVATAR_MIME_TYPE,
      quality
    );
  });
}

function canvasToAvatarDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL(AVATAR_MIME_TYPE, quality);
  if (webp.startsWith(`data:${AVATAR_MIME_TYPE}`)) return webp;
  return canvas.toDataURL('image/jpeg', quality);
}

export async function prepareAvatarFileForUpload(file: File): Promise<File> {
  if (file.size <= RUNTIME_UPLOAD_TARGET_BYTES) return file;
  if (isGif(file)) return file;

  const img = await loadImage(file);
  const size = downscaleSize(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const qualitySteps = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= RUNTIME_UPLOAD_TARGET_BYTES) {
      return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: AVATAR_MIME_TYPE });
    }
  }

  const fallback = await canvasToBlob(canvas, 0.35);
  return new File([fallback], file.name.replace(/\.[^.]+$/, '.webp'), { type: AVATAR_MIME_TYPE });
}

export function getRuntimeUploadTargetMb(): number {
  return Math.round(RUNTIME_UPLOAD_TARGET_BYTES / (1024 * 1024));
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
