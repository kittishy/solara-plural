import { type NextRequest } from 'next/server';
import { requireAuth, ok, err } from '@/lib/api/helpers';

const CATBOX_API_URL = 'https://catbox.moe/user/api.php';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export async function POST(request: NextRequest) {
  // --- Auth ---
  const { systemId, error } = await requireAuth();
  if (error) return error;

  // --- Parse incoming multipart form data ---
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return err('Invalid or missing multipart/form-data body', 400);
  }

  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return err('Missing "file" field in request body', 400);
  }

  // --- Validate MIME type ---
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return err(
      'Unsupported file type. Allowed types: jpg, jpeg, png, gif, webp',
      415,
    );
  }

  // --- Validate file size ---
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return err('File exceeds the 20 MB size limit', 413);
  }

  // --- Forward to catbox.moe ---
  const catboxForm = new FormData();
  catboxForm.append('reqtype', 'fileupload');
  catboxForm.append('fileToUpload', file);

  let catboxResponse: Response;
  try {
    catboxResponse = await fetch(CATBOX_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'SolaraPlural/0.1 avatar-upload',
      },
      body: catboxForm,
    });
  } catch {
    return err('Failed to reach catbox.moe — network error', 502);
  }

  if (!catboxResponse.ok) {
    const responseText = (await catboxResponse.text().catch(() => '')).trim();
    const detail = responseText ? `: ${responseText.slice(0, 180)}` : '';
    return err(
      `catbox.moe returned an error (HTTP ${catboxResponse.status})${detail}`,
      502,
    );
  }

  // catbox.moe responds with plain-text URL, e.g. https://files.catbox.moe/abc123.jpg
  const responseText = (await catboxResponse.text()).trim();

  if (!responseText.startsWith('https://')) {
    // catbox returns a plain-text error message on failure (e.g. "File too large.")
    return err(`catbox.moe rejected the upload: ${responseText}`, 502);
  }

  return ok({ url: responseText }, 201);
}
