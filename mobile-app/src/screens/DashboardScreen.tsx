import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@src/components/Card';
import { FrontCard } from '@src/components/FrontCard';
import { NoteCard } from '@src/components/NoteCard';
import { Screen } from '@src/components/Screen';
import { StatusPill } from '@src/components/StatusPill';
import { theme } from '@src/constants/theme';
import { useSolaraData } from '@src/hooks/useSolaraData';

export function DashboardScreen() {
  const { snapshot, loading, refresh, source } = useSolaraData();
  const activeCount = snapshot.currentFront?.memberIds.length ?? 0;
  const recentNotes = snapshot.notes.slice(0, 2);

  return (
    <Screen
      title={`Good to see you, ${snapshot.system.name}`}
      eyebrow="Solara Plural"
      refreshing={loading}
      onRefresh={() => void refresh()}
    >
      <View style={styles.statusRow}>
        <StatusPill label={`${snapshot.members.length} members`} />
        <StatusPill label={source === 'remote' ? 'Synced' : 'Preview'} color={source === 'remote' ? theme.colors.success : theme.colors.primary} />
      </View>

      <FrontCard currentFront={snapshot.currentFront} members={snapshot.members} />

      <Card accentColor={theme.colors.primaryGlow}>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.cardBody}>
          {activeCount > 0
            ? `${activeCount} member${activeCount === 1 ? '' : 's'} currently marked in front.`
            : 'No one is marked in front right now.'}
        </Text>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent notes</Text>
      </View>
      {recentNotes.length > 0 ? (
        recentNotes.map((note) => <NoteCard key={note.id} note={note} />)
      ) : (
        <Card>
          <Text style={styles.cardBody}>No notes yet.</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardBody: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionHeader: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
});
