import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottlePlaceholder } from '@/components/bottle-placeholder';
import { Button } from '@/components/button';
import { ChipList } from '@/components/chip-list';
import { NotesPyramid } from '@/components/notes-pyramid';
import { colors, fonts, spacing } from '@/constants/theme';
import { type FragranceDetail, useFragrance } from '@/lib/queries';

function facts(fragrance: FragranceDetail) {
  const rows: { label: string; value: string }[] = [];
  if (fragrance.concentration) rows.push({ label: 'Concentration', value: fragrance.concentration });
  if (fragrance.release_year) rows.push({ label: 'Released', value: String(fragrance.release_year) });
  if (fragrance.perfumers.length > 0) {
    rows.push({
      label: fragrance.perfumers.length === 1 ? 'Perfumer' : 'Perfumers',
      value: fragrance.perfumers.join('\n'),
    });
  }
  return rows;
}

export default function FragranceScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const fragrance = useFragrance(Number(params.id));

  const screenOptions = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: '',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.mist },
      }}
    />
  );

  if (fragrance.isError) {
    return (
      <SafeAreaView edges={['bottom']} style={[styles.screen, styles.centered]}>
        {screenOptions}
        <Text style={styles.message}>This fragrance didn&apos;t load. Check your connection and try again.</Text>
        <Button label="Try again" variant="destructive" onPress={() => fragrance.refetch()} />
      </SafeAreaView>
    );
  }

  if (!fragrance.data) {
    return (
      <View style={[styles.screen, styles.centered]}>
        {screenOptions}
        <ActivityIndicator color={colors.smoke} />
      </View>
    );
  }

  const data = fragrance.data;
  const loadingDetails = fragrance.isPlaceholderData;
  const factRows = facts(data);

  return (
    <View style={styles.screen}>
      {screenOptions}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <BottlePlaceholder size="hero" />
        </View>

        <View style={styles.titleBlock}>
          <Text accessibilityRole="header" style={styles.name}>
            {data.name}
          </Text>
          <Text style={styles.brand}>{data.brand}</Text>
        </View>

        {loadingDetails ? (
          <ActivityIndicator color={colors.smoke} />
        ) : (
          <>
            {factRows.length > 0 ? (
              <View style={styles.facts}>
                {factRows.map((row) => (
                  <View key={row.label} style={styles.factRow} accessible>
                    <Text style={styles.factLabel}>{row.label}</Text>
                    <Text style={styles.factValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.main_accords.length > 0 ? (
              <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  Main accords
                </Text>
                <ChipList items={data.main_accords} />
              </View>
            ) : null}

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Notes
              </Text>
              <NotesPyramid top={data.top_notes} heart={data.middle_notes} base={data.base_notes} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: spacing.gutter },
  message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink, textAlign: 'center' },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: 48, gap: 28 },
  hero: { height: 200, borderRadius: 24, overflow: 'hidden' },
  titleBlock: { gap: 6, marginTop: -8 },
  name: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, color: colors.ink },
  brand: { fontFamily: fonts.medium, fontSize: 17, lineHeight: 22, color: colors.smoke },
  facts: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.shelf },
  factRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.shelf,
  },
  factLabel: { width: 112, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.smoke },
  factValue: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.ink },
  section: { gap: 14 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.ink },
});
