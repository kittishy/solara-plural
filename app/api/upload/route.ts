import { Buffer as NodeBuffer } from "node:buffer";
import { requireAuth } from "@/lib/api/helpers";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Only the media types the app actually uploads (avatars + chat images).
// Anything else is rejected so the endpoint can't be used as a generic
// file-laundering proxy through our catbox account.
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function encodeMultipart(fields: Record<string, string>, fileField: string, fileName: string, fileBuf: NodeBuffer, fileType: string): { body: NodeBuffer; contentType: string } {
  const boundary = "----Solara" + Math.random().toString(36).slice(2, 10);
  const parts: (string | NodeBuffer)[] = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`);
  }

  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${fileType}\r\n\r\n`);
  parts.push(fileBuf);
  parts.push(`\r\n--${boundary}--\r\n`);

  const chunks: NodeBuffer[] = [];
  for (const p of parts) {
    chunks.push(typeof p === "string" ? NodeBuffer.from(p, "utf-8") : p);
  }

  return { body: NodeBuffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

export async function POST(request: Request) {
  // Uploads cost our bandwidth and write to a shared catbox account, so the
  // endpoint must be authenticated and not an open relay.
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rate = consumeRateLimit(
    `upload:${auth.systemId}:${getClientIp(request)}`,
    { limit: 30, windowMs: 10 * 60 * 1000 },
  );
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many uploads. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      return Response.json(
        { error: "Only PNG, JPEG, WebP, GIF, or AVIF images can be uploaded" },
        { status: 415 },
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: "File must be under 20 MB" }, { status: 400 });
    }

    const buf = NodeBuffer.from(await file.arrayBuffer());
    // catbox.moe: free AND permanent (files never expire), unlike uguu.se
    // which deletes uploads after a few hours. Same simple multipart POST.
    // An optional CATBOX_USERHASH ties uploads to an account so they can be
    // managed/deleted later, but anonymous uploads are permanent too.
    const fields: Record<string, string> = { reqtype: "fileupload" };
    const userHash = process.env.CATBOX_USERHASH?.trim();
    if (userHash) fields.userhash = userHash;

    const { body, contentType } = encodeMultipart(
      fields,
      "fileToUpload",
      file.name,
      buf,
      file.type || "application/octet-stream",
    );

    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: body as unknown as BodyInit,
      headers: {
        "Content-Type": contentType,
        "User-Agent": "Solara/1.0",
      },
    });

    const text = (await res.text()).trim();

    if (!res.ok || !text.startsWith("http")) {
      return Response.json(
        { error: text || "Upload failed" },
        { status: 502 },
      );
    }

    return Response.json({ url: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
