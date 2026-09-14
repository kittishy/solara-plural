import { NoteEditor } from "@/components/notes/NoteEditor";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "new") {
    return <NoteEditor />;
  }
  return <NoteEditor noteId={id} />;
}
