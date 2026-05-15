import { Image, StyleSheet, Text, View } from 'react-native';

import { theme } from '@src/constants/theme';
import { initialsFor } from '@src/lib/initials';

type AvatarProps = {
  name: string;
  color?: string | null;
  uri?: string | null;
  size?: number;
};

export function Avatar({ name, color = theme.colors.primary, uri, size = 48 }: AvatarProps) {
  const resolvedColor = color ?? theme.colors.primary;
  const frameStyle = {
    borderColor: resolvedColor,
    borderRadius: size / 2,
    height: size,
    width: size,
  };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, frameStyle]} accessibilityLabel={name} />;
  }

  return (
    <View style={[styles.fallback, frameStyle, { backgroundColor: resolvedColor }]}>
      <Text style={[styles.initials, { fontSize: Math.max(13, size * 0.34) }]}>{initialsFor(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    borderWidth: 2,
    justifyContent: 'center',
  },
  image: {
    borderWidth: 2,
  },
  initials: {
    color: theme.colors.bg,
    fontWeight: '900',
  },
});
