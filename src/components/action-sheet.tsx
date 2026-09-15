import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { colors, fonts, spacing } from '@/constants/theme';

type ActionSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  actionLabel: string;
  actionVariant?: 'primary' | 'accent' | 'destructive';
  loading?: boolean;
  error?: string | null;
  onAction: () => void;
  onClose: () => void;
};

export function ActionSheet({
  visible,
  title,
  subtitle,
  actionLabel,
  actionVariant = 'primary',
  loading,
  error,
  onAction,
  onClose,
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(240)}
        accessibilityViewIsModal
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        <Text accessibilityRole="header" style={styles.title} numberOfLines={3}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button label={actionLabel} variant={actionVariant} onPress={onAction} loading={loading} />
          <Button label="Cancel" variant="quiet" onPress={onClose} disabled={loading} />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(35, 26, 46, 0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.vitrine,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.gutter,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.shelf,
    marginBottom: 20,
  },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.ink },
  subtitle: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.smoke, marginTop: 4 },
  error: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.danger, marginTop: 12 },
  actions: { gap: 4, marginTop: 24 },
});
