import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

// Stand-in for a fragrance photo until images are added.
export function BottlePlaceholder({ size = 'grid' }: { size?: 'grid' | 'hero' }) {
  return (
    <View style={styles.frame} importantForAccessibility="no-hide-descendants">
      <Text style={[styles.mark, size === 'hero' && styles.markHero]}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.vitrine,
  },
  mark: { fontFamily: fonts.display, fontSize: 64, lineHeight: 76, color: colors.shelf },
  markHero: { fontSize: 120, lineHeight: 140 },
});
