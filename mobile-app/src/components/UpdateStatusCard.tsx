import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { StatusPill } from '@src/components/StatusPill';
import { theme } from '@src/constants/theme';
import { getEasProjectId } from '@src/services/config';
import { useUpdatesStatus } from '@src/hooks/useUpdatesStatus';

export function UpdateStatusCard() {
  const updates = useUpdatesStatus();
  const projectId = getEasProjectId();

  return (
    <Card accentColor={updates.enabled ? theme.colors.success : theme.colors.warning}>
      <StatusPill
        label={updates.enabled ? 'OTA enabled' : 'EAS build needed'}
        color={updates.enabled ? theme.colors.success : theme.colors.warning}
      />
      <View style={styles.grid}>
        <View style={styles.block}>
          <Text style={styles.label}>Channel</Text>
          <Text style={styles.value}>{updates.channel}</Text>
        </View>
        <View style={styles.block}>
          <Text style={styles.label}>Runtime</Text>
          <Text style={styles.value}>{updates.runtimeVersion}</Text>
        </View>
      </View>
      <Text style={styles.message}>{updates.message}</Text>
      {projectId ? <Text style={styles.project}>EAS project {projectId}</Text> : null}
      <Button
        label={updates.checking ? 'Checking' : 'Check update'}
        variant="secondary"
        disabled={updates.checking}
        onPress={() => void updates.checkNow()}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  label: {
    color: theme.colors.subtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  message: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  project: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
});
