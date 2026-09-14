import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { colors, fonts, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const { sendSignInLink, linkError, clearLinkError } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const shownError = error ?? linkError;

  const send = async () => {
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address, like name@example.com.');
      return;
    }
    setSending(true);
    setError(null);
    clearLinkError();
    try {
      await sendSignInLink(trimmedEmail);
      setSentTo(trimmedEmail);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The link could not be sent. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.wordmark} accessible accessibilityRole="header" accessibilityLabel="Sillage">
          <Text style={styles.wordmarkText}>Sillage</Text>
          <Text style={[styles.wordmarkText, styles.trailNear]} importantForAccessibility="no">
            Sillage
          </Text>
          <Text style={[styles.wordmarkText, styles.trailFar]} importantForAccessibility="no">
            Sillage
          </Text>
        </View>

        {sentTo ? (
          <View style={styles.form}>
            <Text style={styles.heading}>Check your inbox</Text>
            <Text style={styles.body}>
              We sent a sign-in link to {sentTo}. Open it on this device to continue.
            </Text>
            <Button label="Resend link" onPress={send} loading={sending} />
            <Button
              label="Use a different email"
              variant="quiet"
              onPress={() => {
                setSentTo(null);
                setError(null);
              }}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.heading}>Sign in with a link sent to your email</Text>
            <Text style={styles.label} nativeID="email-label">
              Email
            </Text>
            <TextInput
              accessibilityLabelledBy="email-label"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              inputMode="email"
              keyboardType="email-address"
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError(null);
              }}
              onSubmitEditing={send}
              placeholder="name@example.com"
              placeholderTextColor={colors.smoke}
              returnKeyType="send"
              style={styles.input}
              textContentType="emailAddress"
              value={email}
            />
            <Button label="Send sign-in link" onPress={send} loading={sending} disabled={!trimmedEmail} />
          </View>
        )}

        {shownError ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {shownError}
          </Text>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  content: {
    flex: 1,
    paddingHorizontal: spacing.gutter,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  wordmark: { marginTop: 72 },
  wordmarkText: {
    fontFamily: fonts.display,
    fontSize: 76,
    lineHeight: 84,
    color: colors.ink,
    letterSpacing: 1,
  },
  trailNear: { opacity: 0.14, marginTop: -30, marginLeft: 18 },
  trailFar: { opacity: 0.05, marginTop: -30, marginLeft: 36 },
  form: { gap: 12 },
  heading: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, color: colors.ink, marginBottom: 8 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.smoke, marginBottom: 8 },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.smoke },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.shelf,
    backgroundColor: colors.vitrine,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
  },
  error: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.danger, marginTop: 12 },
});
