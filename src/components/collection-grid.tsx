import { SymbolView } from 'expo-symbols';
import type { ReactElement } from 'react';
import {
  FlatList,
  type ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BottlePlaceholder } from '@/components/bottle-placeholder';
import { colors, fonts, spacing } from '@/constants/theme';
import type { CollectionItem } from '@/lib/queries';

type Cell = { type: 'fragrance'; fragrance: CollectionItem } | { type: 'add' };
type Row = { key: string; cells: Cell[] };

type CollectionGridProps = {
  fragrances: CollectionItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onAddPress: () => void;
  onFragrancePress: (fragrance: CollectionItem) => void;
  onFragranceLongPress: (fragrance: CollectionItem) => void;
  header?: ReactElement;
};

const COLUMNS = 2;

function toRows(fragrances: CollectionItem[]): Row[] {
  const cells: Cell[] = [
    ...fragrances.map((fragrance) => ({ type: 'fragrance' as const, fragrance })),
    { type: 'add' as const },
  ];
  const rows: Row[] = [];
  for (let index = 0; index < cells.length; index += COLUMNS) {
    const rowCells = cells.slice(index, index + COLUMNS);
    rows.push({
      key: rowCells.map((cell) => (cell.type === 'add' ? 'add' : cell.fragrance.id)).join('-'),
      cells: rowCells,
    });
  }
  return rows;
}

export function CollectionGrid({
  fragrances,
  refreshing,
  onRefresh,
  onAddPress,
  onFragrancePress,
  onFragranceLongPress,
  header,
}: CollectionGridProps) {
  const isEmpty = fragrances.length === 0;

  const renderRow: ListRenderItem<Row> = ({ item }) => {
    // A row holding only the "+" slot has nothing to display, so it gets no shelf.
    const addOnly = item.cells.every((cell) => cell.type === 'add');

    return (
      <View style={styles.row}>
        <View style={styles.displays}>
          {item.cells.map((cell) =>
            cell.type === 'add' ? (
              <Pressable
                key="add"
                accessibilityRole="button"
                accessibilityLabel="Add a fragrance"
                onPress={onAddPress}
                style={({ pressed }) => [
                  styles.display,
                  styles.addSlot,
                  addOnly && styles.addSlotClosed,
                  pressed && styles.pressed,
                ]}>
                <SymbolView name="plus" tintColor={colors.resin} size={30} weight="light" />
              </Pressable>
            ) : (
              <Pressable
                key={cell.fragrance.id}
                accessibilityRole="button"
                accessibilityLabel={`${cell.fragrance.name} by ${cell.fragrance.brand}`}
                accessibilityHint="Opens details. Long press for more options."
                delayLongPress={350}
                onLongPress={() => onFragranceLongPress(cell.fragrance)}
                onPress={() => onFragrancePress(cell.fragrance)}
                style={({ pressed }) => [styles.display, pressed && styles.pressed]}>
                <BottlePlaceholder />
              </Pressable>
            ),
          )}
          {item.cells.length < COLUMNS ? <View style={styles.spacer} /> : null}
        </View>

        {addOnly ? null : <View style={styles.shelf} />}

        <View style={styles.labels} importantForAccessibility="no-hide-descendants">
          {item.cells.map((cell) =>
            cell.type === 'add' ? (
              <View key="add" style={styles.label}>
                {isEmpty ? <Text style={styles.addLabel}>Add your first fragrance</Text> : null}
              </View>
            ) : (
              <View key={cell.fragrance.id} style={styles.label}>
                <Text style={styles.name} numberOfLines={2}>
                  {cell.fragrance.name}
                </Text>
                <Text style={styles.brand} numberOfLines={1}>
                  {cell.fragrance.brand}
                </Text>
              </View>
            ),
          )}
          {item.cells.length < COLUMNS ? <View style={styles.spacer} /> : null}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={toRows(fragrances)}
      keyExtractor={(row) => row.key}
      renderItem={renderRow}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.smoke} />
      }
    />
  );
}

const GAP = 14;

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  row: { paddingHorizontal: spacing.gutter, marginBottom: 28 },
  displays: { flexDirection: 'row', gap: GAP },
  display: {
    flex: 1,
    aspectRatio: 0.95,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.vitrine,
  },
  addSlot: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderBottomWidth: 0,
    borderColor: colors.shelf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotClosed: { borderBottomWidth: 1.5, borderRadius: 18, marginBottom: 3 },
  pressed: { opacity: 0.75 },
  spacer: { flex: 1 },
  shelf: {
    height: 3,
    marginHorizontal: -6,
    borderRadius: 2,
    backgroundColor: colors.shelf,
  },
  labels: { flexDirection: 'row', gap: GAP, paddingTop: 10 },
  label: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.ink },
  brand: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.smoke },
  addLabel: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.smoke },
});
