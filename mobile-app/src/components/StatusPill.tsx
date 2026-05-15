import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@src/constants/theme';

type StatusPillProps = {
  label: string;
  color?: string;
};

export function StatusPill({ label, color = theme.colors.primary }: StatusPillProps) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: theme.radius.pill,
    height: 7,
    width: 7,
  },
  label: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    minHeight: 32,
    paddingHorizontal: theme.spacing.md,
  },
});
