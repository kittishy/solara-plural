import 'server-only';
import { count, gte, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { db } from '@/lib/db';
import {
  systems,
  members,
  systemNotes,
  systemJournal,
  frontEntries,
  systemFriendRequests,
  systemBlocks,
  systemFriendships,
} from '@/lib/db/schema';

export interface AdminMetrics {
  totalAccounts: number;
  systemAccounts: number;
  singletAccounts: number;
  suspendedAccounts: number;
  adminAccounts: number;
  newAccounts7d: number;
  newAccounts30d: number;
  totalMembers: number;
  totalNotes: number;
  totalJournalEntries: number;
  activeFronts: number;
  pendingFriendRequests: number;
  totalFriendships: number;
  totalBlocks: number;
  signupsByDay: { date: string; count: number }[];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function countWhere(table: PgTable, where?: SQL): Promise<number> {
  const query = db.select({ value: count() }).from(table);
  const rows = where ? await query.where(where) : await query;
  return rows[0]?.value ?? 0;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    totalAccounts,
    systemAccounts,
    singletAccounts,
    suspendedAccounts,
    adminAccounts,
    newAccounts7d,
    newAccounts30d,
    totalMembers,
    totalNotes,
    totalJournalEntries,
    activeFronts,
    pendingFriendRequests,
    totalFriendships,
    totalBlocks,
    signupRows,
  ] = await Promise.all([
    countWhere(systems),
    countWhere(systems, sql`${systems.accountType} <> 'singlet'`),
    countWhere(systems, sql`${systems.accountType} = 'singlet'`),
    countWhere(systems, isNotNull(systems.suspendedAt)),
    countWhere(systems, sql`${systems.isAdmin} = 1`),
    countWhere(systems, gte(systems.createdAt, since7)),
    countWhere(systems, gte(systems.createdAt, since30)),
    countWhere(members),
    countWhere(systemNotes),
    countWhere(systemJournal),
    countWhere(frontEntries, isNull(frontEntries.endedAt)),
    countWhere(systemFriendRequests, sql`${systemFriendRequests.status} = 'pending'`),
    countWhere(systemFriendships),
    countWhere(systemBlocks),
    db
      .select({
        date: sql<string>`to_char(${systems.createdAt}, 'YYYY-MM-DD')`,
        value: count(),
      })
      .from(systems)
      .where(gte(systems.createdAt, since30))
      .groupBy(sql`to_char(${systems.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${systems.createdAt}, 'YYYY-MM-DD')`),
  ]);

  return {
    totalAccounts,
    systemAccounts,
    singletAccounts,
    suspendedAccounts,
    adminAccounts,
    newAccounts7d,
    newAccounts30d,
    totalMembers,
    totalNotes,
    totalJournalEntries,
    activeFronts,
    pendingFriendRequests,
    totalFriendships,
    totalBlocks,
    signupsByDay: signupRows.map((r) => ({ date: r.date, count: r.value })),
  };
}
