import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from '@expo-google-fonts/hanken-grotesk';
import { Italiana_400Regular } from '@expo-google-fonts/italiana';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

// Deep links into modal or pushed screens open on top of the tabs.
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const queryClient = new QueryClient();

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const [fontsLoaded] = useFonts({
    Italiana_400Regular,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
  });
  const ready = fontsLoaded && !isLoading;

  // Drop cached data from the previous account when signing out.
  useEffect(() => {
    if (!session) queryClient.clear();
  }, [session]);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.mist } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="fragrance/[id]"
          options={{
            headerShown: true,
            title: '',
            headerBackButtonDisplayMode: 'minimal',
            headerTintColor: colors.ink,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.mist },
          }}
        />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
