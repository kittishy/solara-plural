import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { StatusPill } from '@src/components/StatusPill';
import { theme } from '@src/constants/theme';
import { getSolaraApiBaseUrl } from '@src/services/config';
import type { DataSource } from '@src/types/solara';

type ApiStatusCardProps = {
  source: DataSource;
  message: string;
  loading: boolean;
  onRefresh: () => void;
};

export function ApiStatusCard({ source, message, loading, onRefresh }: ApiStatusCardProps) {
  const color = source === 'remote' ? theme.colors.success : source === 'error' ? theme.colors.warning : theme.colors.primary;
  const label = source === 'remote' ? 'Remote API' : source === 'error' ? 'API fallback' : 'Local preview';
  const baseUrl = getSolaraApiBaseUrl() ?? 'Not configured';

  return (
    <Card accentColor={color}>
      <StatusPill label={label} color={color} />
      <View style={styles.block}>
        <Text style={styles.label}>Endpoint</Text>
        <Text style={styles.value}>{baseUrl}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      <Button label={loading ? 'Refreshing' : 'Refresh'} variant="secondary" disabled={loading} onPress={onRefresh} />
    </Card>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: theme.spacing.xs,
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
  value: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
});
