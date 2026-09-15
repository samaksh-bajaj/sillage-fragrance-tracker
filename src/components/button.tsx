import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'quiet' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'accent' && styles.accent,
        variant === 'destructive' && styles.destructive,
        variant === 'quiet' && styles.quiet,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'quiet' ? colors.ink : colors.vitrine} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'quiet' && styles.quietLabel,
            variant === 'destructive' && styles.destructiveLabel,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.ink },
  accent: { backgroundColor: colors.resin },
  destructive: { backgroundColor: colors.vitrine, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.shelf },
  quiet: { backgroundColor: 'transparent' },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  label: { fontFamily: fonts.semibold, fontSize: 16, color: colors.vitrine },
  quietLabel: { color: colors.ink, fontFamily: fonts.medium },
  destructiveLabel: { color: colors.danger },
});
