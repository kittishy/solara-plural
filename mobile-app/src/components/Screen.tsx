import { type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@src/constants/theme';

type ScreenProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({ title, eyebrow, children, refreshing = false, onRefresh }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined}
      >
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    paddingBottom: 96,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  header: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  safeArea: {
    backgroundColor: theme.colors.bg,
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 36,
  },
});
