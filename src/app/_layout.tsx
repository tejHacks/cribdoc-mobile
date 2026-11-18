import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { warmUp } from '@/ml/screening';
import { usePalette } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = usePalette();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Load the model in the background so the first scan doesn't wait for it.
    warmUp();
  }, []);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, primary: c.primary, background: c.bg, card: c.bg, text: c.text, border: c.border } }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerTitleStyle: { fontWeight: '700' },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="scan" options={{ title: 'Eye screening', presentation: 'modal' }} />
        <Stack.Screen name="baby/new" options={{ title: 'Add a baby', presentation: 'modal' }} />
        <Stack.Screen name="baby/[id]" options={{ title: '' }} />
        <Stack.Screen name="referral/new" options={{ title: 'New referral', presentation: 'modal' }} />
        <Stack.Screen name="referral/[id]" options={{ title: 'Referral' }} />
        <Stack.Screen name="reminders" options={{ title: 'Follow-up reminders' }} />
        <Stack.Screen name="learn" options={{ title: 'Jaundice & danger signs' }} />
        <Stack.Screen name="team" options={{ title: 'Team & roles' }} />
        <Stack.Screen name="model" options={{ title: 'Screening model' }} />
      </Stack>
    </ThemeProvider>
  );
}
