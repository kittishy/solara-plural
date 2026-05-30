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
