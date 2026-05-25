import { MemberEditor } from "@/components/members/MemberEditor";

export default function EditMemberPage({
  params,
}: {
  params: { id: string };
}) {
  return <MemberEditor memberId={params.id} />;
}
