import { Buffer as NodeBuffer } from "node:buffer";

export const runtime = "nodejs";

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
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: "File must be under 20 MB" }, { status: 400 });
    }

    const buf = NodeBuffer.from(await file.arrayBuffer());
    const { body, contentType } = encodeMultipart(
      {},
      "files[]",
      file.name,
      buf,
      file.type || "application/octet-stream",
    );

    const res = await fetch("https://uguu.se/upload", {
      method: "POST",
      body: body as unknown as BodyInit,
      headers: {
        "Content-Type": contentType,
        "User-Agent": "Solara/1.0",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text || "Upload failed" }, { status: 502 });
    }

    const json = await res.json() as { success: boolean; files?: { url: string }[] };
    if (!json.success || !json.files?.[0]?.url) {
      return Response.json({ error: "Upload failed: unexpected response" }, { status: 502 });
    }

    const url = json.files[0].url;
    return Response.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
