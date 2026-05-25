export const runtime = "nodejs";

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

    const catbox = new FormData();
    catbox.append("reqtype", "fileupload");
    catbox.append("fileToUpload", file);

    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: catbox,
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text || "Upload to catbox.moe failed" }, { status: 502 });
    }

    const url = (await res.text()).trim();
    return Response.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
