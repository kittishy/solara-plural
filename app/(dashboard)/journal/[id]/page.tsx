import { JournalEditor } from "@/components/journal/JournalEditor";

export default function JournalEntryPage({
  params,
}: {
  params: { id: string };
}) {
  if (params.id === "new") {
    return <JournalEditor />;
  }
  return <JournalEditor entryId={params.id} />;
}
