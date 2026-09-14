import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenTitle } from '@/components/screen-title';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Sign out failed. Try again.');
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenTitle>Settings</ScreenTitle>
      <View style={styles.section}>
        {session?.user.email ? (
          <Text style={styles.caption}>Signed in as {session.user.email}</Text>
        ) : null}
        <Button label="Sign out" variant="destructive" onPress={handleSignOut} loading={signingOut} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  section: { paddingHorizontal: spacing.gutter, gap: 12 },
  caption: { fontFamily: fonts.regular, fontSize: 14, color: colors.smoke },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
});
