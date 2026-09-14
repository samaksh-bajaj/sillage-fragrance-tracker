import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type ChipListProps = {
  items: string[];
  background?: string;
  textColor?: string;
};

export function ChipList({ items, background = colors.vitrine, textColor = colors.ink }: ChipListProps) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Text key={item} style={[styles.chip, { backgroundColor: background, color: textColor }]}>
          {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
