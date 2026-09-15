import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { Button } from '@/components/button';
import { CollectionGrid } from '@/components/collection-grid';
import { ScreenTitle } from '@/components/screen-title';
import { colors, fonts, spacing } from '@/constants/theme';
import { type CollectionItem, useCollection, useRemoveFromCollection } from '@/lib/queries';

export default function CollectionScreen() {
  const router = useRouter();
  const collection = useCollection();
  const removeFromCollection = useRemoveFromCollection();
  const [removing, setRemoving] = useState<CollectionItem | null>(null);

  const confirmRemove = () => {
    if (!removing) return;
    removeFromCollection.mutate(removing.id);
    setRemoving(null);
  };

  let body: React.ReactNode;
  if (collection.isPending) {
    body = <ActivityIndicator style={styles.status} color={colors.smoke} />;
  } else if (collection.isError) {
    body = (
      <View style={styles.error}>
        <Text style={styles.errorText}>Your collection didn&apos;t load. Check your connection and try again.</Text>
        <Button label="Try again" variant="destructive" onPress={() => collection.refetch()} />
      </View>
    );
  } else {
    body = (
      <CollectionGrid
        fragrances={collection.data}
        header={<ScreenTitle>My Collection</ScreenTitle>}
        refreshing={collection.isRefetching}
        onRefresh={() => collection.refetch()}
        onAddPress={() => router.push('/add')}
        onFragrancePress={(fragrance) =>
          router.push({ pathname: '/fragrance/[id]', params: { id: String(fragrance.id) } })
        }
        onFragranceLongPress={(fragrance) => {
          removeFromCollection.reset();
          setRemoving(fragrance);
        }}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {collection.isSuccess ? null : <ScreenTitle>My Collection</ScreenTitle>}
      {body}
      {removeFromCollection.isError ? (
        <Text style={styles.toast} accessibilityLiveRegion="polite">
          That fragrance wasn&apos;t removed. Check your connection and try again.
        </Text>
      ) : null}
      <ActionSheet
        visible={!!removing}
        title={removing?.name ?? ''}
        subtitle={removing?.brand}
        actionLabel="Remove from collection"
        actionVariant="destructive"
        onAction={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  status: { marginTop: 48 },
  error: { paddingHorizontal: spacing.gutter, gap: 16 },
  toast: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    bottom: 16,
    padding: 14,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    color: colors.vitrine,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink },
});
