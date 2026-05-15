import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@src/components/Avatar';
import { Card } from '@src/components/Card';
import { StatusPill } from '@src/components/StatusPill';
import { theme } from '@src/constants/theme';
import { formatRelativeTime } from '@src/lib/date';
import type { SolaraFrontEntry, SolaraMember } from '@src/types/solara';

type FrontCardProps = {
  currentFront: SolaraFrontEntry | null;
  members: SolaraMember[];
};

export function FrontCard({ currentFront, members }: FrontCardProps) {
  const frontMembers = currentFront
    ? currentFront.memberIds
        .map((memberId) => members.find((member) => member.id === memberId))
        .filter((member): member is SolaraMember => member !== undefined)
    : [];

  return (
    <Card accentColor={theme.colors.front} style={styles.card}>
      <StatusPill label={frontMembers.length > 0 ? 'Current front' : 'No active front'} color={theme.colors.front} />
      {frontMembers.length > 0 && currentFront ? (
        <>
          <View style={styles.memberRow}>
            {frontMembers.map((member) => (
              <View key={member.id} style={styles.frontMember}>
                <Avatar name={member.name} uri={member.avatarUrl} color={member.color} size={44} />
                <View style={styles.frontText}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {member.pronouns ? <Text style={styles.memberPronouns}>{member.pronouns}</Text> : null}
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.since}>Since {formatRelativeTime(currentFront.startedAt)}</Text>
        </>
      ) : (
        <Text style={styles.emptyText}>The front is quiet right now.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#24172f',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  frontMember: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  frontText: {
    flex: 1,
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  memberPronouns: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  memberRow: {
    gap: theme.spacing.sm,
  },
  since: {
    color: theme.colors.front,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
