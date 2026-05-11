import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  alterPartnerPairings,
  members,
  partnershipBucketItems,
  partnershipMilestones,
  partnershipNotes,
  systems,
} from '@/lib/db/schema';
import { requireSystemId } from '@/lib/auth/session';
import { getPartnershipForSystem } from '@/lib/partnerships';
import PartnershipDetailClient from './PartnershipDetailClient';

type PageParams = { params: Promise<{ partnershipId: string }> };

export default async function PartnershipDetailPage({ params }: PageParams) {
  const systemId = await requireSystemId();
  const { partnershipId } = await params;
  const access = await getPartnershipForSystem(partnershipId, systemId);
  if (!access) notFound();

  const [partner, ownMembers, partnerMembers, notes, pairings, milestones, bucket] =
    await Promise.all([
      db.query.systems.findFirst({
        columns: { id: true, name: true, accountType: true, avatarMode: true, avatarEmoji: true, avatarUrl: true },
        where: eq(systems.id, access.partnerSystemId),
      }),
      db.query.members.findMany({
        columns: { id: true, name: true, color: true, avatarUrl: true },
        where: and(eq(members.systemId, systemId), eq(members.isArchived, 0)),
        orderBy: (m, { asc }) => [asc(m.name)],
      }),
      db.query.members.findMany({
        columns: { id: true, name: true, color: true, avatarUrl: true },
        where: and(eq(members.systemId, access.partnerSystemId), eq(members.isArchived, 0)),
        orderBy: (m, { asc }) => [asc(m.name)],
      }),
      db.query.partnershipNotes.findMany({
        where: eq(partnershipNotes.partnershipId, partnershipId),
        orderBy: (n, { desc }) => [desc(n.createdAt)],
      }),
      db.query.alterPartnerPairings.findMany({
        where: eq(alterPartnerPairings.partnershipId, partnershipId),
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      }),
      db.query.partnershipMilestones.findMany({
        where: eq(partnershipMilestones.partnershipId, partnershipId),
        orderBy: (m, { desc }) => [desc(m.occurredOn)],
      }),
      db.query.partnershipBucketItems.findMany({
        where: eq(partnershipBucketItems.partnershipId, partnershipId),
        orderBy: (b, { asc, desc }) => [asc(b.completedAt), desc(b.createdAt)],
      }),
    ]);

  if (!partner) notFound();

  const isSystemA = access.partnership.systemAId === systemId;
  const myNickname = isSystemA ? access.partnership.nicknameForA : access.partnership.nicknameForB;
  const nicknameForPartner = isSystemA ? access.partnership.nicknameForB : access.partnership.nicknameForA;

  return (
    <PartnershipDetailClient
      partnershipId={partnershipId}
      partner={partner}
      details={{
        relationshipLabel: access.partnership.relationshipLabel,
        partneredSince: access.partnership.partneredSince,
        anniversaryDate: access.partnership.anniversaryDate,
        howWeMet: access.partnership.howWeMet,
        nicknameForPartner,
        myNickname,
        checkinIntervalDays: access.partnership.checkinIntervalDays,
        lastCheckinAt: access.partnership.lastCheckinAt,
      }}
      ownMembers={ownMembers}
      partnerMembers={partnerMembers}
      initialNotes={notes}
      initialPairings={pairings}
      initialMilestones={milestones}
      initialBucket={bucket}
    />
  );
}
