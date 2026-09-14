import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CollectionGrid } from '@/components/collection-grid';
import { ScreenTitle } from '@/components/screen-title';
import { colors, fonts, spacing } from '@/constants/theme';
import { useCollection } from '@/lib/queries';

export default function CollectionScreen() {
  const router = useRouter();
  const collection = useCollection();

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
        onAddPress={() => {}}
        onFragrancePress={(fragrance) =>
          router.push({ pathname: '/fragrance/[id]', params: { id: String(fragrance.id) } })
        }
        onFragranceLongPress={() => {}}
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {collection.isSuccess ? null : <ScreenTitle>My Collection</ScreenTitle>}
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  status: { marginTop: 48 },
  error: { paddingHorizontal: spacing.gutter, gap: 16 },
  errorText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink },
});
