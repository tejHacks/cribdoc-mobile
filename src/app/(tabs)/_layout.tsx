import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';

import { isOpen } from '@/data/model';
import { useMe, useReferrals } from '@/data/store';
import { usePalette } from '@/theme';

export default function TabsLayout() {
  const c = usePalette();
  const { settings, ready } = useMe();
  const [referrals] = useReferrals();
  if (!ready) return null;
  if (!settings.onboarded) return <Redirect href="/onboarding" />;

  const open = referrals.filter(isOpen).length;
  const icon = (name: keyof typeof Ionicons.glyphMap) =>
    function TabIcon({ color, focused }: { color: import("react-native").ColorValue; focused: boolean }) {
      return <Ionicons name={(focused ? name : `${name}-outline`) as keyof typeof Ionicons.glyphMap} size={24} color={color as string} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.bg },
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
        headerTintColor: c.text,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.subtle,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="babies" options={{ title: 'Babies', tabBarIcon: icon('people') }} />
      <Tabs.Screen
        name="referrals"
        options={{ title: 'Referrals', tabBarIcon: icon('paper-plane'), tabBarBadge: open || undefined, tabBarBadgeStyle: { backgroundColor: c.danger } }}
      />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('grid') }} />
    </Tabs>
  );
}
