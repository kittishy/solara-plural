import { MemberEditor } from "@/components/members/MemberEditor";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberEditor memberId={id} />;
}
