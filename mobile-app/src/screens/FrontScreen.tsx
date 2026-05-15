import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@src/components/Avatar';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { FrontCard } from '@src/components/FrontCard';
import { Screen } from '@src/components/Screen';
import { StatusPill } from '@src/components/StatusPill';
import { theme } from '@src/constants/theme';
import { formatRelativeTime } from '@src/lib/date';
import { useSolaraData } from '@src/hooks/useSolaraData';

export function FrontScreen() {
  const { snapshot, loading, refresh, clearFront, toggleFrontMember } = useSolaraData();
  const activeIds = snapshot.currentFront?.memberIds ?? [];
  const recentHistory = snapshot.frontHistory.slice(0, 4);

  return (
    <Screen title="Front" eyebrow="Current state" refreshing={loading} onRefresh={() => void refresh()}>
      <FrontCard currentFront={snapshot.currentFront} members={snapshot.members} />
      <Button label="Clear front" variant="secondary" disabled={activeIds.length === 0} onPress={clearFront} />

      <Text style={styles.sectionTitle}>Quick switch</Text>
      <View style={styles.memberList}>
        {snapshot.members.map((member) => {
          const active = activeIds.includes(member.id);

          return (
            <Pressable
              key={member.id}
              onPress={() => toggleFrontMember(member.id)}
              style={({ pressed }) => [
                styles.memberButton,
                active ? styles.memberButtonActive : null,
                pressed ? styles.memberButtonPressed : null,
              ]}
            >
              <Avatar name={member.name} uri={member.avatarUrl} color={member.color} size={38} />
              <View style={styles.memberText}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.pronouns ? <Text style={styles.memberPronouns}>{member.pronouns}</Text> : null}
              </View>
              {active ? <StatusPill label="Front" color={theme.colors.front} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>History</Text>
      {recentHistory.map((entry) => {
        const names = entry.memberIds
          .map((memberId) => snapshot.members.find((member) => member.id === memberId)?.name)
          .filter((name): name is string => Boolean(name));

        return (
          <Card key={entry.id} accentColor={entry.endedAt ? theme.colors.border : theme.colors.front}>
            <Text style={styles.historyTitle}>{names.join(', ') || 'Unknown front'}</Text>
            <Text style={styles.historyMeta}>
              {entry.endedAt ? formatRelativeTime(entry.endedAt) : `Active since ${formatRelativeTime(entry.startedAt)}`}
            </Text>
            {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  historyMeta: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  historyNote: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  historyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  memberButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
    minHeight: 62,
    padding: theme.spacing.md,
  },
  memberButtonActive: {
    borderColor: theme.colors.front,
    backgroundColor: '#2a1b35',
  },
  memberButtonPressed: {
    opacity: 0.8,
    transform: [{ translateY: 1 }],
  },
  memberList: {
    gap: theme.spacing.sm,
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  memberPronouns: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  memberText: {
    flex: 1,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: theme.spacing.sm,
  },
});
