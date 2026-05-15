import { StyleSheet, Text } from 'react-native';

import { Card } from '@src/components/Card';
import { NoteCard } from '@src/components/NoteCard';
import { Screen } from '@src/components/Screen';
import { theme } from '@src/constants/theme';
import { useSolaraData } from '@src/hooks/useSolaraData';

export function NotesScreen() {
  const { snapshot, loading, refresh } = useSolaraData();

  return (
    <Screen title="Notes" eyebrow="Private context" refreshing={loading} onRefresh={() => void refresh()}>
      {snapshot.notes.length > 0 ? (
        snapshot.notes.map((note) => <NoteCard key={note.id} note={note} />)
      ) : (
        <Card>
          <Text style={styles.empty}>No notes found.</Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
