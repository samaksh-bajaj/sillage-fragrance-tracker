import { StyleSheet, Text, View } from 'react-native';

import { ChipList } from '@/components/chip-list';
import { colors, fonts, noteBands } from '@/constants/theme';

type NotesPyramidProps = {
  top: string[];
  heart: string[];
  base: string[];
};

export function NotesPyramid({ top, heart, base }: NotesPyramidProps) {
  const bands = [
    { key: 'top', label: 'Top', notes: top, tone: noteBands.top },
    { key: 'heart', label: 'Heart', notes: heart, tone: noteBands.heart },
    { key: 'base', label: 'Base', notes: base, tone: noteBands.base },
  ].filter((band) => band.notes.length > 0);

  if (bands.length === 0) {
    return <Text style={styles.empty}>No notes are listed for this fragrance.</Text>;
  }

  return (
    <View style={styles.vessel}>
      {bands.map((band) => (
        <View
          key={band.key}
          accessible
          accessibilityLabel={`${band.label} notes: ${band.notes.join(', ')}`}
          style={[styles.band, { backgroundColor: band.tone.background }]}>
          <Text style={[styles.label, { color: band.tone.text }]}>{band.label}</Text>
          <ChipList items={band.notes} background={band.tone.chip} textColor={band.tone.text} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  vessel: { borderRadius: 24, overflow: 'hidden' },
  band: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, gap: 12 },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  empty: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.smoke },
});
