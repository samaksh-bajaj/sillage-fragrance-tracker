import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

export default function TabLayout() {
  return (
    <Tabs>
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
