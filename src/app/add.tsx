import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { colors, fonts, spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  MIN_SEARCH_LENGTH,
  type SearchResult,
  useAddToCollection,
  useCollection,
  useSearchFragrances,
} from '@/lib/queries';
import { normalizeSearch } from '@/lib/search';

export default function AddFragranceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const [term, setTerm] = useState(params.q ?? '');
  const [linkedQuery, setLinkedQuery] = useState(params.q);
  // A deep link with a new ?q= replaces the current search.
  if (params.q !== linkedQuery) {
    setLinkedQuery(params.q);
    setTerm(params.q ?? '');
  }
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const debouncedTerm = useDebouncedValue(term, 300);
  const search = useSearchFragrances(debouncedTerm);
  const collection = useCollection();
  const addToCollection = useAddToCollection();

  const ownedIds = useMemo(() => new Set(collection.data?.map((item) => item.id)), [collection.data]);
  const hasQuery = normalizeSearch(term).length >= MIN_SEARCH_LENGTH;
  const results = hasQuery ? (search.data ?? []) : [];

  const confirmAdd = () => {
    if (!selected) return;
    addToCollection.mutate(selected.id, {
      onSuccess: () => {
        setSelected(null);
        router.back();
      },
    });
  };

  let emptyState: React.ReactNode = null;
  if (!hasQuery) {
    emptyState = <Text style={styles.hint}>Search by fragrance or brand name.</Text>;
  } else if (search.isError) {
    emptyState = <Text style={styles.hint}>Search didn&apos;t load. Check your connection and try again.</Text>;
  } else if (search.isFetching && results.length === 0) {
    emptyState = <ActivityIndicator style={styles.loading} color={colors.smoke} />;
  } else if (search.isSuccess && results.length === 0) {
    emptyState = <Text style={styles.hint}>No fragrances match &ldquo;{term.trim()}&rdquo;.</Text>;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Add a fragrance
        </Text>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.searchField}>
        <SymbolView name="magnifyingglass" tintColor={colors.smoke} size={18} />
        <TextInput
          accessibilityLabel="Search fragrances"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          clearButtonMode="while-editing"
          onChangeText={setTerm}
          placeholder="Fragrance or brand"
          placeholderTextColor={colors.smoke}
          returnKeyType="search"
          style={styles.input}
          value={term}
        />
        {search.isFetching && results.length > 0 ? <ActivityIndicator size="small" color={colors.smoke} /> : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={emptyState ? <View style={styles.empty}>{emptyState}</View> : null}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const owned = ownedIds.has(item.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name} by ${item.brand}`}
              accessibilityHint={owned ? 'Already in your collection' : 'Adds to your collection after you confirm'}
              accessibilityState={{ disabled: owned }}
              disabled={owned}
              onPress={() => {
                addToCollection.reset();
                setSelected(item);
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.rowText}>
                <Text style={[styles.name, owned && styles.ownedText]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.release_year ? `${item.brand}, ${item.release_year}` : item.brand}
                </Text>
              </View>
              {owned ? (
                <View style={styles.owned}>
                  <SymbolView name="checkmark" tintColor={colors.resin} size={16} weight="semibold" />
                  <Text style={styles.ownedLabel}>Owned</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      <ActionSheet
        visible={!!selected}
        title={selected?.name ?? ''}
        subtitle={selected?.brand}
        actionLabel="Add to collection"
        actionVariant="accent"
        loading={addToCollection.isPending}
        error={addToCollection.isError ? 'This fragrance wasn’t added. Try again.' : null}
        onAction={confirmAdd}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: 20,
    paddingBottom: 14,
  },
  title: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: colors.ink },
  close: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: spacing.gutter,
    paddingHorizontal: 14,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.vitrine,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.shelf,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 17, color: colors.ink, paddingVertical: 12 },
  list: { paddingTop: 8, paddingBottom: 48 },
  empty: { paddingHorizontal: spacing.gutter, paddingTop: 24 },
  hint: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.smoke },
  loading: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.gutter,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.shelf,
  },
  rowPressed: { backgroundColor: colors.vitrine },
  rowText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 21, color: colors.ink },
  ownedText: { color: colors.smoke },
  meta: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.smoke },
  owned: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ownedLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.resin },
});
