import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@src/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This path is quiet.</Text>
        <Link href="/" style={styles.link}>
          Return home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  link: {
    color: theme.colors.primaryGlow,
    fontSize: 16,
    fontWeight: '800',
    marginTop: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
});
