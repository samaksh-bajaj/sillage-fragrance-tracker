import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/screen-title';
import { colors } from '@/constants/theme';

export default function CollectionScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenTitle>My Collection</ScreenTitle>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
});
