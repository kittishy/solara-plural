import { NoteEditor } from "@/components/notes/NoteEditor";

export default function NotePage({ params }: { params: { id: string } }) {
  if (params.id === "new") {
    return <NoteEditor />;
  }
  return <NoteEditor noteId={params.id} />;
}
