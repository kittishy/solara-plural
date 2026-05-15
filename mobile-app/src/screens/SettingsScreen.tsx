import { StyleSheet, Text, View } from 'react-native';

import { ApiStatusCard } from '@src/components/ApiStatusCard';
import { Card } from '@src/components/Card';
import { Screen } from '@src/components/Screen';
import { UpdateStatusCard } from '@src/components/UpdateStatusCard';
import { theme } from '@src/constants/theme';
import { useSolaraData } from '@src/hooks/useSolaraData';

export function SettingsScreen() {
  const { source, message, loading, refresh } = useSolaraData();

  return (
    <Screen title="Settings" eyebrow="Android app" refreshing={loading} onRefresh={() => void refresh()}>
      <ApiStatusCard source={source} message={message} loading={loading} onRefresh={() => void refresh()} />
      <UpdateStatusCard />

      <Card accentColor={theme.colors.primaryGlow}>
        <Text style={styles.title}>Build boundaries</Text>
        <View style={styles.list}>
          <Text style={styles.item}>Text, layout, service code, and bundled assets can ship by OTA when runtime stays compatible.</Text>
          <Text style={styles.item}>Native modules, Android permissions, package name, icons, splash, and runtime policy require a new APK or AAB.</Text>
          <Text style={styles.item}>Solara web remains the backend and data owner; secrets stay outside this mobile bundle.</Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  list: {
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
});
