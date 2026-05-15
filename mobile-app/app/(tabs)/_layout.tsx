import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { theme } from '@src/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  return function Icon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          minHeight: 68,
          paddingBottom: 8,
          paddingTop: 7,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home-outline') }} />
      <Tabs.Screen name="members" options={{ title: 'Members', tabBarIcon: tabIcon('people-outline') }} />
      <Tabs.Screen name="front" options={{ title: 'Front', tabBarIcon: tabIcon('sparkles-outline') }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes', tabBarIcon: tabIcon('document-text-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon('settings-outline') }} />
    </Tabs>
  );
}
