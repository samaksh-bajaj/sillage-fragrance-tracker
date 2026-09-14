import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { colors, fonts } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.mist },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.smoke,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.vitrine, borderTopColor: colors.shelf },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Collection',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="square.grid.2x2" tintColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="gearshape" tintColor={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
