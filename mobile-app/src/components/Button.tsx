import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { theme } from '@src/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
};

export function Button({ label, variant = 'primary', disabled, style, ...props }: ButtonProps) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      <Text style={[styles.label, variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  danger: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ translateY: 1 }],
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  primaryLabel: {
    color: theme.colors.bg,
  },
  secondary: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  secondaryLabel: {
    color: theme.colors.text,
  },
});
