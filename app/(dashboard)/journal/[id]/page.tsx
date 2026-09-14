import { JournalEditor } from "@/components/journal/JournalEditor";

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "new") {
    return <JournalEditor />;
  }
  return <JournalEditor entryId={id} />;
}
