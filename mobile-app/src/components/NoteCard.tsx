import { StyleSheet, Text } from 'react-native';

import { Card } from '@src/components/Card';
import { theme } from '@src/constants/theme';
import { formatRelativeTime } from '@src/lib/date';
import type { SolaraNote } from '@src/types/solara';

type NoteCardProps = {
  note: SolaraNote;
};

export function NoteCard({ note }: NoteCardProps) {
  return (
    <Card accentColor={theme.colors.primary}>
      <Text style={styles.title}>{note.title ?? 'Untitled note'}</Text>
      <Text style={styles.content} numberOfLines={4}>{note.content}</Text>
      <Text style={styles.meta}>{formatRelativeTime(note.updatedAt)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
});
