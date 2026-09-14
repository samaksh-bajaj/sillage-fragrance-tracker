import { StyleSheet, Text } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';

export function ScreenTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.semibold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.ink,
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
    paddingBottom: 16,
  },
});
